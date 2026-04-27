import client from "./client";
import { clearToken, setToken } from "./authStorage";

export async function login(email, password) {
  const { data } = await client.post("/auth/login", { email, password });
  if (data?.token) {
    setToken(data.token);
  }
  return data;
}

export function logout() {
  clearToken();
}
