import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  username: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
    setIsLoading(false);
  }, []);

  const checkAuth = (): boolean => {
    try {
      const authStatus = localStorage.getItem("isAuthenticated");
      const storedRole = localStorage.getItem("userRole");
      const storedUsername = localStorage.getItem("username");

      if (authStatus === "true" && storedRole && storedUsername) {
        setIsAuthenticated(true);
        setUserRole(storedRole);
        setUsername(storedUsername);
        return true;
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setUsername(null);
        return false;
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
      setUserRole(null);
      setUsername(null);
      return false;
    }
  };

  const login = async (
    inputUsername: string,
    inputPassword: string
  ): Promise<boolean> => {
    try {
      // Static credentials
      const ADMIN_USERNAME = "admin";
      const ADMIN_PASSWORD = "password";

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (
        inputUsername === ADMIN_USERNAME &&
        inputPassword === ADMIN_PASSWORD
      ) {
        // Store authentication state
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userRole", "admin");
        localStorage.setItem("username", inputUsername);

        setIsAuthenticated(true);
        setUserRole("admin");
        setUsername(inputUsername);

        return true;
      }

      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");

      setIsAuthenticated(false);
      setUserRole(null);
      setUsername(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    userRole,
    username,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
