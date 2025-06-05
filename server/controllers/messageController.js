import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// Get all users except the logged‐in user, and count their unseen messages
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1) Fetch everyone except ourselves
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select(
      "-password"
    );

    // 2) For each other user, count how many messages THEY sent to ME that are still unseen
    const unseenMessages = {};
    await Promise.all(
      filteredUsers.map(async (user) => {
        const msgs = await Message.find({
          senderId: user._id,
          recieverId: userId, // ← CORRECT FIELD NAME (the schema uses `recieverId`)
          seen: false,
        });

        if (msgs.length > 0) {
          unseenMessages[user._id] = msgs.length;
        }
      })
    );

    return res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.error("getUsersForSidebar error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Get the entire conversation between the logged‐in user and :id
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;   // this is the other party’s ID
    const myId = req.user._id;

    // Fetch all messages where I sent to them OR they sent to me
    const messages = await Message.find({
      $or: [
        { senderId: myId, recieverId: selectedUserId },    // <-- recieverId
        { senderId: selectedUserId, recieverId: myId },    // <-- recieverId
      ],
    });

    // Mark all messages that they sent me as “seen”
    await Message.updateMany(
      { senderId: selectedUserId, recieverId: myId },      // <-- recieverId
      { seen: true }
    );

    return res.json({ success: true, messages });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Mark a single message as seen by its message‐document ID
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    await Message.findByIdAndUpdate(messageId, { seen: true });
    return res.json({ success: true });
  } catch (error) {
    console.error("markMessageAsSeen error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Send a new message to the user whose ID is in req.params.id
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const recieverId = req.params.id;           // <-- renamed to match schema
    const senderId = req.user._id;

    // If you also upload an image, send it to Cloudinary first
    let imageUrl = "";
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Now create the message document (must include recieverId)
    const newMessage = await Message.create({
      senderId,
      recieverId,      // <-- correct field name
      text: text || "",
      image: imageUrl || "",
    });

    // Emit to the recipient’s socket (if they’re online)
    const receiverSocketId = userSocketMap[recieverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res.json({ success: true, newMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.json({ success: false, message: error.message });
  }
};
