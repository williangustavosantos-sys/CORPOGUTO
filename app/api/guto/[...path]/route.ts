import { NextRequest } from "next/server"
import { isGutoProxyHostAllowed } from "@/lib/api/guto-proxy-host"

const BACKEND_URL = (
  process.env.GUTO_BACKEND_PROXY_URL ||
  process.env.NEXT_PUBLIC_GUTO_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/+$/, "")
type RouteContext = {
  params: Promise<{ path?: string[] }>
}

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  if (!BACKEND_URL) {
    return Response.json({ message: "Backend proxy sem URL configurada." }, { status: 500 })
  }

  if (!isGutoProxyHostAllowed(request.headers.get("host"))) {
    return Response.json({ message: "Proxy GUTO indisponível neste host." }, { status: 404 })
  }

  const params = await context.params
  const path = params.path?.map(encodeURIComponent).join("/") || ""
  const target = new URL(`${BACKEND_URL}/${path}`)
  target.search = request.nextUrl.search

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  const authorization = request.headers.get("authorization")
  const requestId = request.headers.get("x-request-id")
  if (contentType) headers.set("content-type", contentType)
  if (authorization) headers.set("authorization", authorization)
  if (requestId) headers.set("x-request-id", requestId)

  const hasBody = !["GET", "HEAD"].includes(request.method)
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  })

  const responseHeaders = new Headers()
  const upstreamContentType = upstream.headers.get("content-type")
  const traceId = upstream.headers.get("x-guto-trace-id")
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType)
  if (traceId) responseHeaders.set("x-guto-trace-id", traceId)

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
