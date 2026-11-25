export function logServerError(event: string, error: unknown) {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", event, errorType: error instanceof Error ? error.name : "UnknownError" }));
}

export function logAuthRequest(event: string, status: number) {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: "info", event, status }));
}
