import React, { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const accessToken = localStorage.getItem("access");

    if (accessToken) {
      setUser({
        user_id: localStorage.getItem("user_id"),
        username: localStorage.getItem("username"),
        email: localStorage.getItem("email"),
      });
    } else {
      setUser(null);
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem("access", userData.access);
    localStorage.setItem("refresh", userData.refresh);
    localStorage.setItem("user_id", userData.user_id);
    localStorage.setItem("username", userData.username);
    localStorage.setItem("email", userData.email);

    setUser({
      user_id: userData.user_id,
      username: userData.username,
      email: userData.email,
    });
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("email");

    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!localStorage.getItem("access"),
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export default UserContext;