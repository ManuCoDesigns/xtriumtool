export function isMissingTableError(error: unknown): boolean {
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message) : "";
  return /relation .* does not exist|couldn't find table .* in the schema cache|no such table/i.test(message);
}

export function isMissingColumnError(error: unknown): boolean {
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message) : "";
  return /column .* does not exist/i.test(message);
}
