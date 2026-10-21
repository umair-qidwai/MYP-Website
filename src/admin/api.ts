/** Admin API client: sends the CSRF token on every change and surfaces friendly errors. */
let csrfToken = "";
let onUnauthorized: (() => void) | null = null;

export function setCsrf(token: string) {
  csrfToken = token;
}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (method !== "GET") headers["x-csrf-token"] = csrfToken;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload, credentials: "same-origin", ...init });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; details?: unknown };
  if (res.status === 401 && !url.startsWith("/api/auth/login")) onUnauthorized?.();
  if (!res.ok) throw new ApiError(data.error ?? `Something went wrong (${res.status}).`, res.status, data.details);
  return data;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body ?? {}),
  del: <T>(url: string) => request<T>("DELETE", url),
};

/** Upload with progress (fetch has no upload progress, so this uses XMLHttpRequest). */
export function uploadWithProgress<T>(url: string, form: FormData | Blob, onProgress: (fraction: number) => void, method: "POST" | "PUT" = "POST"): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader("x-csrf-token", csrfToken);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else {
        if (xhr.status === 401) onUnauthorized?.();
        reject(new ApiError(data.error ?? `Upload failed (${xhr.status}).`, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("The upload was interrupted. Please try again.", 0));
    xhr.send(form);
  });
}
