const VERCEL_HOST_SUFFIX = ".vercel.app"

const LOCAL_PROXY_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

export function isGutoProxyHostAllowed(hostHeader: string | null) {
  const host = (hostHeader || "").split(":")[0]?.toLowerCase() || ""
  if (LOCAL_PROXY_HOSTS.has(host)) return true
  return host.endsWith(VERCEL_HOST_SUFFIX)
}

export function isGutoV3ProxyPathAllowed(pathSegments?: string[]) {
  if (!pathSegments) return false
  if (pathSegments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return false
  }
  if (pathSegments.length === 2 && pathSegments[0] === "health" && pathSegments[1] === "v3") return true
  return pathSegments.length >= 2 && pathSegments[0] === "guto" && pathSegments[1] === "v3"
}

/** The administrative panel is a bounded management surface during cutover.
 * It never becomes a Companion fallback. */
export function isGutoV3PanelProxyPathAllowed(pathSegments?: string[]) {
  if (!pathSegments || pathSegments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) return false
  return (pathSegments.length === 3 && pathSegments[0] === "auth" && (pathSegments[1] === "admin" || pathSegments[1] === "coach") && pathSegments[2] === "login") ||
    (pathSegments.length >= 1 && pathSegments[0] === "admin")
}
