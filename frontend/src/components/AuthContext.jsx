import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/auth/refresh", { method: "POST" })
      .then((data) => {
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(username, password) {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password })
        });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        setAccessToken(null);
        setUser(null);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
