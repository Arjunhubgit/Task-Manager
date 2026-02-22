import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { LuUsers } from "react-icons/lu";
import Modal from "../Modal";
import AvatarGroup from "../AvatarGroup";

const SelectUsers = ({ selectedUsers, setSelectedUsers }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempSelectedUsers, setTempSelectedUsers] = useState([]);

    const getAllUsers = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
            if (response.data.length > 0) {
                setAllUsers(response.data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const toggleUserSelection = (userId) => {
        setTempSelectedUsers((prev) =>
            prev.includes(userId) ?
                prev.filter((id) => id !== userId) :
                [...prev, userId]
        );
    };

    const handleAssign = () => {
        setSelectedUsers(tempSelectedUsers);
        setIsModalOpen(false);
    };

    // 🛠️ FIX 1: Filter full User Objects instead of just strings
    // This allows AvatarGroup to show the user's Name on hover
    const selectedUserData = allUsers.filter((user) => selectedUsers.includes(user._id));

    useEffect(() => {
        getAllUsers();
    }, []);

    // 🛠️ FIX 2: Correctly sync temp state whenever props change
    // This ensures checkboxes are checked when you open the "Update Task" page
    useEffect(() => {
        setTempSelectedUsers(selectedUsers || []);
    }, [selectedUsers]);

    return (
        <div className="space-y-4 mt-2">
            {selectedUserData.length === 0 && (
                <button 
                    type="button" // Best practice to prevent form submit
                    className="card-btn" 
                    onClick={() => setIsModalOpen(true)}
                >
                    <LuUsers className="text-sm text-white" /> <p className="text-white ml-2">Add Members</p>
                </button>
            )}

            {selectedUserData.length > 0 && (
                <div className="cursor-pointer" onClick={() => setIsModalOpen(true)}>
                    {/* 🛠️ FIX 3: Pass objects & set maxVisible high to show ALL profiles */}
                    <AvatarGroup 
                        avatars={selectedUserData} 
                        maxVisible={50} // Show all assigned members (up to 50)
                    />
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Select Users"
            >
                <div className="space-y-3 h-[60vh] overflow-y-auto pr-2 bg-gray-900 pb-4 custom-scrollbar">
                    {allUsers.map((user) => (
                        <div
                            key={user._id}
                            className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 cursor-pointer group ${
                                tempSelectedUsers.includes(user._id) 
                                ? "bg-purple-500/10 border-purple-500/50" 
                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#EA8D23]/30"
                            }`}
                            onClick={() => toggleUserSelection(user._id)}
                        >
                            <img
                                src={user.profileImageUrl || "https://ui-avatars.com/api/?name=" + user.name}
                                alt={user.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow group-hover:border-[#EA8D23]/50 group-hover:scale-105 transition-all duration-200"
                            />
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${tempSelectedUsers.includes(user._id) ? "text-purple-400" : "text-white"}`}>
                                    {user.name}
                                </p>
                                <p className="text-sm text-gray-400 truncate">{user.email}</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={tempSelectedUsers.includes(user._id)}
                                onChange={e => { e.stopPropagation(); toggleUserSelection(user._id); }}
                                className="w-5 h-5 bg-[#1a1a1a] border-2 border-white/20 rounded cursor-pointer accent-[#EA8D23] transition-all duration-200"
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-4">
                    <button
                        className="px-5 py-2 rounded-lg font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#EA8D23]/50"
                        onClick={() => setIsModalOpen(false)}
                    >
                        CANCEL
                    </button>
                    <button
                        className="px-5 py-2 rounded-lg font-bold text-white bg-[#EA8D23] hover:bg-[#d67e1b] hover:scale-105 transition-all duration-150 shadow-[0_0_15px_rgba(234,141,35,0.3)] focus:outline-none focus:ring-2 focus:ring-[#EA8D23]/50"
                        onClick={handleAssign}
                    >
                        DONE
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default SelectUsers;