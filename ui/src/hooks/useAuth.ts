import { useEffect, useState } from "react";
import { login as apiLogin } from "../api";
import type { AuthUser } from "../types";

/**
 * Manages authentication state with automatic localStorage persistence.
 * Call login() to authenticate; call logout() to clear the session.
 * The session survives page refresh because it is read from localStorage on init.
 */
export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("authUser");
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  // Keep localStorage in sync whenever authUser changes
  useEffect(() => {
    if (authUser) localStorage.setItem("authUser", JSON.stringify(authUser));
    else localStorage.removeItem("authUser");
  }, [authUser]);

  async function login(email: string, password: string): Promise<AuthUser> {
    const user = await apiLogin(email, password);
    setAuthUser(user);
    return user;
  }

  function logout(): void {
    setAuthUser(null);
  }

  return { authUser, login, logout };
}
