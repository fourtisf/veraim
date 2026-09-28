// Nginx passes the visitor's IP in X-Real-IP / X-Forwarded-For (see deploy/nginx.conf).
export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
