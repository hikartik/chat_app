// ChatContext.jsx
import { createContext, useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  // Grab the shared axios instance (with token) and socket from AuthContext
  const { socket, axios } = useContext(AuthContext);

  const getUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [axios]);

  const getMessages = useCallback(
    async (userId) => {
      try {
        const { data } = await axios.get(`/api/messages/${userId}`);
        if (data.success) {
          setMessages(data.messages);

          // Clear this user’s unseen count
          setUnseenMessages((prev) => {
            const copy = { ...prev };
            delete copy[userId];
            return copy;
          });

          // Mark all those as seen on the server
          await axios.get(`/api/messages/mark/${userId}`);
        }
      } catch (error) {
        toast.error(error.message);
      }
    },
    [axios]
  );

  const sendMessage = useCallback(
    async ({ text = "", image = "" }) => {
      if (!selectedUser) return;

      try {
        // Notice: we do NOT pass recieverId here— it's already in `:id`
        const { data } = await axios.post(
          `/api/messages/send/${selectedUser._id}`,
          { text, image }
        );
        if (data.success) {
          // Append the newly created message
          setMessages((prev) => [...prev, data.newMessage]);

          // If you also want to fire a socket event so the recipient hears it in real time:
          socket?.emit("sendMessage", data.newMessage);
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      }
    },
    [axios, selectedUser, socket]
  );

  const subscribeToMessages = useCallback(() => {
    if (!socket) return () => {};

    const handler = (newMessage) => {
      // If we’re currently chatting with the sender, mark it seen:
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prev) => [...prev, newMessage]);
        // Notify server that this message was seen:
        axios.get(`/api/messages/mark/${newMessage._id}`).catch(() => {});
      } else {
        // Otherwise, bump their unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handler);
    return () => {
      socket.off("newMessage", handler);
    };
  }, [socket, selectedUser, axios]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages();
    return () => unsubscribe();
  }, [subscribeToMessages]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const value = {
    messages,
    users,
    selectedUser,
    setSelectedUser,
    getUsers,
    getMessages,
    sendMessage,
    unseenMessages,
    setUnseenMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
