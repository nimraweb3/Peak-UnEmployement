export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public suggestions?: string[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function authorizationLost(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

// Gateways can return HTML. Never expose raw upstream bodies to the user.
export async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (response.status === 204 && response.ok) return undefined as T;
    const data = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : response.status === 429
            ? "Too many requests. Try again shortly."
            : response.status === 401
              ? "Your session expired. Please sign in again."
              : response.status === 403
                ? "This conversation or action is no longer available."
                : "The service is temporarily unavailable. Please try again.";
      throw new ApiError(
        message,
        response.status,
        Array.isArray(data?.suggestions) ? data.suggestions : undefined,
      );
    }
    if (data === undefined)
      throw new ApiError(
        "The service returned an invalid response. Please try again.",
        502,
      );
    return data as T;
  } catch (error) {
    if (timedOut)
      throw new ApiError(
        "The request took too long. Check your connection and try again.",
        408,
      );
    if (controller.signal.aborted || error instanceof ApiError) throw error;
    throw new ApiError(
      "Couldn’t connect. Check your internet connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
