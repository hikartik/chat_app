import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import messageRouter from "./routes/messageRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Only allow your front-end origin
const CLIENT_URL =
  process.env.CLIENT_URL || "https://chat-app-6fiu.vercel.app";

// Initialize socket.io with CORS restricted to your client
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});


// Store online users as { userId: socketId }
export const userSocketMap = {};

/**
 * CORRECTED: Listen for the "connection" event (not "conenction").
 * Also include the `socket` parameter so we can read `socket.handshake.query.userId`.
 */
io.on("connection", (socket) => {
  // 1) When a client connects, read the userId they provided in the query
  const userId = socket.handshake.query.userId;
  console.log("User connected:", userId);

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // 2) Broadcast the updated list of online users to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // 3) When this socket disconnects, remove it from our map and re-broadcast
  socket.on("disconnect", () => {
    console.log("User disconnected:", userId);
    if (userId) {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
// handle preflight requests
app.options("*", cors());

// Routes
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MongoDB and start listening
await connectDB();

if(process.env.NODE_ENV!=="production"){
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server is running on port:", PORT));
}
//export server for vercel
export default server;