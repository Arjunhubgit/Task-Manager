import React from "react";
import { useState } from "react";
import { useEffect } from "react";
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

    const selectedUserAvatars = allUsers
        .filter((user) => selectedUsers.includes(user._id))
        .map((user) => user.profileImageUrl);

    useEffect(() => {
        getAllUsers();
    }, []);

    useEffect(() => {
        if (selectedUsers.length === 0) {
            setTempSelectedUsers([]);
        }

        return () => { };
    }, [selectedUsers]);
    return (
        <div className="space-y-4 mt-2">
            {selectedUserAvatars.length === 0 && (
                <button className="card-btn" onClick={() => setIsModalOpen(true)}>
                    <LuUsers className="text-sm" /> Add Members
                </button>
            )}

            {selectedUserAvatars.length > 0 && (
                <div className="cursor-pointer" onClick={() => setIsModalOpen(true)}>
                    <AvatarGroup avatars={selectedUserAvatars} maxVisible={3} />
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Select Users"
            >
                <div className="space-y-4 h-[60vh] overflow-y-auto">
                    {allUsers.map((user) => (
                        <div
                            key={user._id}
                            className="flex items-center gap-4 p-3 rounded-xl border border-blue-100 bg-white/80 shadow-sm hover:shadow-lg hover:bg-blue-50 transition-all duration-200 cursor-pointer group relative"
                            onClick={() => toggleUserSelection(user._id)}
                        >
                            <img
                                src={user.profileImageUrl}
                                alt={user.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow group-hover:border-blue-400 group-hover:scale-105 transition-all duration-200"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-blue-900 truncate">{user.name}</p>
                                <p className="text-sm text-blue-500 truncate">{user.email}</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={tempSelectedUsers.includes(user._id)}
                                onChange={e => { e.stopPropagation(); toggleUserSelection(user._id); }}
                                className="form-checkbox h-5 w-5 text-blue-600 border-blue-300 focus:ring-blue-400 transition-all duration-200 cursor-pointer"
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-blue-100 mt-4 bg-gradient-to-r from-white via-blue-50 to-white rounded-b-2xl">
                    <button
                        className="px-5 py-2 rounded-lg font-semibold text-blue-500 bg-white border border-blue-200 shadow hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        onClick={() => setIsModalOpen(false)}
                    >
                        CANCEL
                    </button>
                    <button
                        className="px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow hover:from-blue-600 hover:to-blue-800 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
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