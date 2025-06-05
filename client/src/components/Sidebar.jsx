import React, { useState, useEffect, useContext } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, unseenMessages } =
    useContext(ChatContext);
  const { logout, onlineUsers } = useContext(AuthContext);

  // 1) Initialize input as an empty string (not boolean)
  const [input, setInput] = useState("");

  const navigate = useNavigate();

  // 2) Fetch all users once when Sidebar mounts
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // 3) Filter users by the search string (lowercased)
  const filteredUsers = input
    ? users.filter((user) =>
        user.fullName.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  return (
    <div
      className={`bg-[#818582]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${
        selectedUser ? "max-md:hidden" : ""
      }`}
    >
      {/* Top section: logo + menu */}
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img
            src={assets.logo}
            alt="logo"
            className="max-w-40"
          />

          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer"
            />
            <div className="absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p
                onClick={() => logout()}
                className="cursor-pointer text-sm"
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search input */}
        <div className="bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5">
          <img
            src={assets.search_icon}
            alt="search"
            className="w-3"
          />
          <input
            type="text"
            placeholder="Search User..."
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
      </div>

      {/* List of users */}
      <div className="flex flex-col">
        {filteredUsers.map((user) => {
          // 4) Check if this user._id is in the onlineUsers array
          const isOnline = onlineUsers.includes(user._id);

          return (
            <div
              key={user._id} // use _id as the key
              onClick={() => setSelectedUser(user)}
              className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm 
                ${
                  // Highlight background if this user is currently selected
                  selectedUser?._id === user._id
                    ? "bg-[#282142]/50"
                    : ""
                }`}
            >
              <img
                src={user?.profilePic || assets.avatar_icon}
                alt={user.fullName}
                className="w-[35px] aspect-[1/1] rounded-full object-cover"
              />
              <div className="flex flex-col leading-5">
                <p>{user.fullName}</p>
                {isOnline ? (
                  <span className="text-green-400 text-xs">Online</span>
                ) : (
                  <span className="text-neutral-400 text-xs">Offline</span>
                )}
              </div>

              {/* Unseen Messages Badge */}
              {unseenMessages[user._id] > 0 && (
                <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50">
                  {unseenMessages[user._id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
