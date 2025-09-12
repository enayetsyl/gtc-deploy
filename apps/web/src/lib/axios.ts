// apps/web/src/lib/axios.ts
import axios, {
  type AxiosError,
  type AxiosHeaders,
  type AxiosRequestHeaders,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // for refresh cookie
});

const AUTH_KEY = "gtc_auth";
type AuthLS = { token?: string; user?: unknown } | null;

function readAuth(): AuthLS {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw) as AuthLS;
    const legacy = localStorage.getItem("accessToken");
    return legacy ? ({ token: legacy } as AuthLS) : null;
  } catch {
    return null;
  }
}

function writeAuthToken(token?: string): void {
  if (typeof window === "undefined") return;
  // keep legacy in sync (optional)
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");

  try {
    const current = readAuth() ?? {};
    const next = token ? { ...current, token } : null;
    if (next) localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    /* no-op */
  }
}

function getAccessToken(): string | undefined {
  return readAuth()?.token ?? undefined;
}

// ---------- headers helpers (type-safe) ----------
function isAxiosHeaders(h: unknown): h is AxiosHeaders {
  return !!h && typeof (h as AxiosHeaders).set === "function";
}

function attachAuthHeader(cfg: InternalAxiosRequestConfig, token: string): void {
  const h = cfg.headers;
  if (isAxiosHeaders(h)) {
    h.set("Authorization", `Bearer ${token}`);
  } else {
    const base: AxiosRequestHeaders = (h ?? {}) as AxiosRequestHeaders;
    base.Authorization = `Bearer ${token}`;
    cfg.headers = base;
  }
}

// ---------- onUnauthorized hook ----------
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

// ---------- request interceptor ----------
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) attachAuthHeader(config as InternalAxiosRequestConfig, token);
  return config;
});

// ---------- refresh logic (one-shot gate) ----------
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const r = await axios.post(`${API_BASE}/api/auth/refresh`, {}, { withCredentials: true });
    const newToken = (r.data as { accessToken?: string }).accessToken ?? null;
    if (newToken) writeAuthToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

// ---------- response interceptor ----------
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
        });
      }

      const newToken = await (refreshPromise as Promise<string | null>);
      if (newToken) {
        attachAuthHeader(original, newToken);
        return api.request(original as AxiosRequestConfig);
      } else {
        writeAuthToken(undefined);
        onUnauthorized?.();
      }
    }

    return Promise.reject(err);
  }
);

// ---------- util ----------
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
