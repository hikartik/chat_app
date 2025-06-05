import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// Signup a new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    // 1) Check for missing fields
    if (!fullName || !email || !password || !bio) {
      return res.json({
        success: false,
        message: "Missing details (fullName, email, password or bio).",
      });
    }

    // 2) Ensure no existing account with this email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({
        success: false,
        message: "An account with that email already exists.",
      });
    }

    // 3) Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4) Create user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    // 5) Generate JWT token
    const token = generateToken(newUser._id);

    return res.json({
      success: true,
      userData: newUser,
      token,
      message: "Account created successfully.",
    });
  } catch (error) {
    console.log("Signup error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Controller to log in a user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check for missing fields
    if (!email || !password) {
      return res.json({
        success: false,
        message: "Missing email or password.",
      });
    }

    // 2) Find user by email
    const userData = await User.findOne({ email });
    if (!userData) {
      return res.json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // 3) Compare hashed password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      userData.password
    );
    if (!isPasswordCorrect) {
      return res.json({
        success: false, // ← Fixed typo: was “sucess” previously
        message: "Invalid credentials.",
      });
    }

    // 4) Generate JWT token
    const token = generateToken(userData._id);

    return res.json({
      success: true,
      userData,
      token,
      message: "Login successful.",
    });
  } catch (error) {
    console.log("Login error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Controller to check if user is authenticated
export const checkAuth = (req, res) => {
  // 1) If no user object was attached by middleware, return failure
  if (!req.user) {
    return res.json({
      success: false,
      message: "Not authenticated.",
    });
  }

  // 2) Otherwise, return the user
  return res.json({
    success: true,
    user: req.user,
  });
};

// Controller to update user profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;

    // 1) If neither fullName nor bio nor profilePic is provided, reject
    if (!fullName && !bio && !profilePic) {
      return res.json({
        success: false,
        message: "Nothing to update.",
      });
    }

    let updatedUser;

    // 2) If profilePic was provided (base64 string), upload and update all fields
    if (profilePic) {
      const uploadResult = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          profilePic: uploadResult.secure_url,
          bio,
          fullName,
        },
        { new: true }
      );
    } else {
      // 3) Only bio/fullName are changing
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    }

    return res.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.log("UpdateProfile error:", error);
    return res.json({ success: false, message: error.message });
  }
};
