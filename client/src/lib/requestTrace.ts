let latestProtectedMutationRequestId: string | undefined;

export function recordProtectedMutationRequestId(response: Response) {
  latestProtectedMutationRequestId = response.headers.get("X-Request-Id") ?? undefined;
}

export function getLatestProtectedMutationRequestId() {
  return latestProtectedMutationRequestId;
}
