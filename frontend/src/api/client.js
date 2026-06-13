const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let accessToken = localStorage.getItem("accessToken");

export function setAccessToken(token) {
  accessToken = token;
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");
}

export function getAccessToken() {
  return accessToken;
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function videoUrl(stepId) {
  const token = encodeURIComponent(accessToken || "");
  return `${API_URL}/api/videos/steps/${stepId}/video?token=${token}`;
}
