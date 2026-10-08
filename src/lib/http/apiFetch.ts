import { pendingRequests } from "./pendingRequests";

/**
 * `fetch` wrapper for every client-side API call. It registers the request
 * in the global pending store so the top loading indicator is always in
 * sync, whichever page or flow triggered it.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const end = pendingRequests.begin(method === "GET" || method === "HEAD" ? "read" : "write");
  try {
    return await fetch(input, init);
  } finally {
    end();
  }
}
