export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return (
    req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || null
  );
}

export function getUserAgent(req: Request) {
  return req.headers.get("user-agent") || null;
}

export function getBearerToken(req: Request) {
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
}
