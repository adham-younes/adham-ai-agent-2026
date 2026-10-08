export async function engineeringRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const value = await response.json();
  if (!response.ok) {
    const messages: Record<string, string> = {
      DATABASE_UNAVAILABLE:
        "Project storage is unavailable. Retry when the service is restored.",
      PROJECT_BUSY:
        "Another task is executing in this project. Wait for it to finish.",
      PLAN_FROZEN:
        "This plan is frozen because execution has started. Create a new task to change its checks.",
      REQUIRED_CHECKS_EMPTY:
        "Add at least one meaningful acceptance command before planning an implementation task.",
      FORBIDDEN: "This browser cannot access that project or session.",
      UNAUTHORIZED: "Your browser identity is unavailable. Reload this page.",
    };
    const detail = value.issues
      ?.map((issue: { message: string }) => issue.message)
      .join("; ");
    throw new Error(
      messages[value.error] ??
        detail ??
        String(value.error ?? "Request failed"),
    );
  }
  return value as T;
}

export const displayStatus = (value: string) => value.replaceAll("_", " ");
