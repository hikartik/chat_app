import { createContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Helper: attach token header if available
  const attachTokenHeader = (newToken) => {
    if (newToken) {
      axios.defaults.headers.common["token"] = newToken;
    } else {
      delete axios.defaults.headers.common["token"];
    }
  };

  // 1) On mount: if there is a token in localStorage, attach header and check auth
  useEffect(() => {
    if (token) {
      attachTokenHeader(token);
    }
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Verify current token & load authenticated user
  const checkAuth = async () => {
    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      } else {
        // If check fails, clear any stale token
        handleLogoutCleanup();
      }
    } catch (error) {
      // If the request errors (expired/invalid token), clear everything
      handleLogoutCleanup();
    }
  };

  // 3) Login: call /api/auth/:state, store token, set user, and connect socket
  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        const newToken = data.token;
        // 3a) Save token in state, localStorage, and axios header
        setToken(newToken);
        localStorage.setItem("token", newToken);
        attachTokenHeader(newToken);

        // 3b) Set authenticated user & connect socket
        setAuthUser(data.userData);
        connectSocket(data.userData);

        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // 4) Logout: clean up token, authUser, onlineUsers, and socket
  const logout = async () => {
    try {
      // Optional: inform server about logout, if needed
      // await axios.post("/api/auth/logout");

      handleLogoutCleanup();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error during logout");
      handleLogoutCleanup();
    }
  };

  // Helper to clear all auth-related state
  const handleLogoutCleanup = () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    attachTokenHeader(null);

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // 5) Update profile: send PUT request and update authUser in state
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // 6) Connect to Socket.io: only if userData exists & no existing connected socket
  const connectSocket = (userData) => {
    if (!userData) return;
    // If there’s already a connected socket, do nothing
    if (socket && socket.connected) return;

    const newSocket = io(backendUrl, {
      query: { userId: userData._id },
    });

    newSocket.connect();
    setSocket(newSocket);

    newSocket.on("getOnlineUsers", (userIds) => {
      // Expecting userIds to be an array of strings, e.g. ["643abc…", "643def…"]
      setOnlineUsers(userIds);
    });

    // Optional: handle socket disconnection / errors
    newSocket.on("disconnect", () => {
      setOnlineUsers([]);
    });
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  };

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
