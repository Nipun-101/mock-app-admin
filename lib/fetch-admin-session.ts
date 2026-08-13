let inFlightMe: Promise<Response> | null = null;

export function fetchAdminSession(): Promise<Response> {
  if (!inFlightMe) {
    inFlightMe = fetch("/api/auth/me").finally(() => {
      inFlightMe = null;
    });
  }
  return inFlightMe;
}
