// Klien HTTP untuk backend TryLens (cookie sesi HttpOnly + header anti-CSRF).
// Default same-origin: Vite meneruskan /api dan /media ke backend (vite.config.js). Lintas-origin: VITE_API_ORIGIN + CORS_ORIGINS di server.
const ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// up = server hidup; partner = area Mitra memakai server (diatur usePartner.init). Katalog publik cukup `up`.
export const backend = { up: false, partner: false };
export const apiUrl = (p) => ORIGIN + p;

export async function api(method, path, body, { raw = false, signal } = {}) {
  const headers = { "X-TryLens": "1" };
  let payload;
  if (raw) {
    headers["Content-Type"] = "application/octet-stream";
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(ORIGIN + path, { method, headers, body: payload, credentials: "include", signal });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server.");
  }
  const data = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => null) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error || `Permintaan gagal (${res.status})`);
  return data;
}

/** Backend hidup? Harus membalas JSON {ok:true} (fallback SPA Vite membalas HTML, jadi tidak salah terdeteksi). */
export async function probe(timeoutMs = 1500) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const d = await api("GET", "/api/health", undefined, { signal: ctl.signal });
    backend.up = d?.ok === true;
  } catch {
    backend.up = false;
  } finally {
    clearTimeout(t);
  }
  return backend.up;
}
