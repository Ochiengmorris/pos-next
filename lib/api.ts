export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export async function request<T>(
  base: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const text = await res.text();
  const body = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!res.ok) {
    // Nest validation errors arrive as an array of messages
    const m = (body as { message?: string | string[] } | null)?.message;
    throw new ApiError(
      res.status,
      Array.isArray(m) ? m.join(", ") : (m ?? res.statusText),
      body,
    );
  }
  return body as T;
}
