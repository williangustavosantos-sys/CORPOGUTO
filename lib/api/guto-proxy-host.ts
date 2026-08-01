const VERCEL_HOST_SUFFIX = ".vercel.app"

const LOCAL_PROXY_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

export function isGutoProxyHostAllowed(hostHeader: string | null) {
  const host = (hostHeader || "").split(":")[0]?.toLowerCase() || ""
  if (LOCAL_PROXY_HOSTS.has(host)) return true
  return host.endsWith(VERCEL_HOST_SUFFIX)
}
