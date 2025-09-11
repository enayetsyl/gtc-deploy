// apps/web/src/lib/axios.ts
import axios from "axios";
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });


let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);