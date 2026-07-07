import { NextRequest } from "next/server"

const BACKEND_URL = (
  process.env.GUTO_BACKEND_PROXY_URL ||
  process.env.NEXT_PUBLIC_GUTO_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/+$/, "")
const PREVIEW_HOST_SUFFIX = ".vercel.app"
const PRODUCTION_HOSTS = new Set(["corpoguto.vercel.app"])

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

function isProxyHostAllowed(hostHeader: string | null) {
  const host = (hostHeader || "").split(":")[0]?.toLowerCase() || ""
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true
  return host.endsWith(PREVIEW_HOST_SUFFIX) && !PRODUCTION_HOSTS.has(host)
}

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  if (!BACKEND_URL) {
    return Response.json({ message: "Backend proxy sem URL configurada." }, { status: 500 })
  }

  if (!isProxyHostAllowed(request.headers.get("host"))) {
    return Response.json({ message: "Proxy GUTO indisponível neste host." }, { status: 404 })
  }

  const params = await context.params
  const path = params.path?.map(encodeURIComponent).join("/") || ""
  const target = new URL(`${BACKEND_URL}/${path}`)
  target.search = request.nextUrl.search

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  const authorization = request.headers.get("authorization")
  if (contentType) headers.set("content-type", contentType)
  if (authorization) headers.set("authorization", authorization)

  const hasBody = !["GET", "HEAD"].includes(request.method)
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  })

  const responseHeaders = new Headers()
  const upstreamContentType = upstream.headers.get("content-type")
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType)

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxyToBackend
export const POST = proxyToBackend
export const PATCH = proxyToBackend
export const PUT = proxyToBackend
export const DELETE = proxyToBackend
