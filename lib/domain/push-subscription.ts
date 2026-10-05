export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return false;
    return (
      ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(
        url.hostname,
      ) || /^[a-z\d-]+\.notify\.windows\.com$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function validPushKey(value: string, bytes: number): boolean {
  if (!/^[A-Za-z\d_-]+={0,2}$/.test(value)) return false;
  const unpadded = value.replace(/=+$/, "");
  return Math.floor((unpadded.length * 3) / 4) === bytes;
}

export function pushRequestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
