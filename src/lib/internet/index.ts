const YOUEYE_APP_ID = process.env.YOUEYE_APP_ID;
const YOUEYE_APP_TOKEN = process.env.YOUEYE_APP_TOKEN;

function gatewayUrl(): string {
  if (process.env.YOUEYE_GATEWAY) return process.env.YOUEYE_GATEWAY.replace(/\/$/, "");
  if (process.env.YOUEYE_API_URL) {
    return `${process.env.YOUEYE_API_URL.replace(/\/api\/v\d+$/, "")}/api/apps/v1`;
  }
  throw new Error("YOUEYE_GATEWAY is required for internet proxying.");
}

export function internetProxyUrl(url: string | URL): string {
  const target = typeof url === "string" ? url : url.toString();
  return `${gatewayUrl()}/internet?url=${encodeURIComponent(target)}`;
}

export function internetHeaders(extra?: HeadersInit, userId?: string): HeadersInit {
  const headers = new Headers(extra);
  if (YOUEYE_APP_ID) headers.set("X-YouEye-App", YOUEYE_APP_ID);
  if (userId) headers.set("X-YouEye-User", userId);
  if (YOUEYE_APP_TOKEN) headers.set("Authorization", `Bearer ${YOUEYE_APP_TOKEN}`);
  return headers;
}

export async function internetFetch(url: string | URL, init: RequestInit = {}, userId?: string): Promise<Response> {
  return fetch(internetProxyUrl(url), {
    ...init,
    headers: internetHeaders(init.headers, userId),
  });
}
