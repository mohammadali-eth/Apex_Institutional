const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  code?: string;
  status: number;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("qpms_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function safeFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  const urlStr = url.toString();
  try {
    return await fetch(urlStr, init);
  } catch (err: any) {
    const isNetworkError =
      err instanceof TypeError ||
      (err?.message && (
        err.message.toLowerCase().includes("fetch") ||
        err.message.toLowerCase().includes("network") ||
        err.message.toLowerCase().includes("connection")
      ));

    if (isNetworkError) {
      let rootHost = "http://localhost:8000";
      try {
        const parsed = new URL(urlStr);
        rootHost = `${parsed.protocol}//${parsed.host}`;
      } catch {}
      throw new ApiError(
        `Unable to connect to the QPMS backend API server at ${rootHost}. Please verify that the backend is started and reachable.`,
        0,
        "NETWORK_ERROR"
      );
    }
    throw err;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    let errorCode = `HTTP_${res.status}`;
    let details: any = null;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.detail) errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      if (errJson.code) errorCode = errJson.code;
      if (errJson.details) details = errJson.details;
    } catch {
      // Non-JSON response
    }
    throw new ApiError(errorMsg, res.status, errorCode, details);
  }

  const json = await res.json();
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

export const api = {
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.append(k, String(v));
        }
      });
    }
    const res = await safeFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: any): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await safeFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, body?: any): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await safeFetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body?: any): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await safeFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await safeFetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    return handleResponse<T>(res);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await safeFetch(url, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });
    return handleResponse<T>(res);
  },

  async downloadBlob(path: string): Promise<Blob> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await safeFetch(url, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new ApiError(`Download failed with status ${res.status}`, res.status);
    }
    return res.blob();
  },
};
