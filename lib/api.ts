export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include', // Mandate cross-origin cookies natively!
    headers: {
      ...options.headers,
    },
  });
}
