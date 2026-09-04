import { NextRequest } from "next/server"
import { getVercelOidcToken } from "@vercel/oidc"
import {
  isGutoProxyHostAllowed,
  isGutoV3PanelProxyPathAllowed,
  isGutoV3ProxyPathAllowed,
} from "@/lib/api/guto-proxy-host"

function getBackendUrl() {
  return (
    process.env.GUTO_BACKEND_PROXY_URL ||
    process.env.NEXT_PUBLIC_GUTO_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "")
}
type RouteContext = {
  params: Promise<{ path?: string[] }>
}

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  if (!isGutoProxyHostAllowed(request.headers.get("host"))) {
    return Response.json({ message: "Proxy GUTO indisponível neste host." }, { status: 404 })
  }

  const params = await context.params
  if (
    (process.env.GUTO_V3_ONLY === "true" || process.env.NEXT_PUBLIC_GUTO_V3_ENABLED === "true") &&
    !isGutoV3ProxyPathAllowed(params.path) &&
    !(process.env.NEXT_PUBLIC_GUTO_V3_PANEL_ENABLED === "true" && isGutoV3PanelProxyPathAllowed(params.path))
  ) {
    return Response.json({
      error: "V3_LEGACY_AUTHORITY_DISABLED",
      message: "O Preview do Cérebro V3 não encaminha rotas legadas.",
      brainVersion: "guto-cerebro-v3",
    }, { status: 409 })
  }

  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return Response.json({ message: "Backend proxy sem URL configurada." }, { status: 500 })
  }

  const path = params.path?.map(encodeURIComponent).join("/") || ""
  const target = new URL(`${backendUrl}/${path}`)
  target.search = request.nextUrl.search

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  const authorization = request.headers.get("authorization")
  const requestId = request.headers.get("x-request-id")
  if (contentType) headers.set("content-type", contentType)
  if (authorization) headers.set("authorization", authorization)
  if (requestId) headers.set("x-request-id", requestId)
  const oidcToken = await getVercelOidcToken()
  if (oidcToken) headers.set("x-vercel-trusted-oidc-idp-token", oidcToken)

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
