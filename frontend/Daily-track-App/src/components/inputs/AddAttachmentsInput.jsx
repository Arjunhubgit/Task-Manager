import React, { useState } from 'react';
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip } from "react-icons/lu";

const AddAttachmentsInput = ({ attachments, setAttachments }) => {
  const [option, setOption] = useState("");

  // Function to handle adding an option
  const handleAddOption = () => {
    if (option.trim()) {
      setAttachments([...attachments, option.trim()]);
      setOption("");
    }
  };

  // Function to handle deleting an option
  const handleDeleteOption = (index) => {
    const updatedArr = attachments.filter((_, idx) => idx !== index);
    setAttachments(updatedArr);
  };

  return (
    <div className="space-y-3 bg-white/80 rounded-2xl p-5 shadow border border-blue-100">
      {attachments.map((item, index) => (
        <div key={item} className="flex items-center justify-between bg-blue-50/60 rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all group border border-blue-100/70">
          <div className="flex items-center gap-3">
            <LuPaperclip className="text-blue-400 text-lg group-hover:text-blue-600 transition-colors" />
            <p className="text-blue-900 font-medium truncate max-w-xs">{item}</p>
          </div>
          <button
            className="p-2 rounded-full text-red-400 bg-white border border-red-100 hover:text-white hover:bg-red-500 hover:border-red-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-300 shadow group-hover:scale-110"
            onClick={() => {
              handleDeleteOption(index);
            }}
            title="Delete"
          >
            <HiOutlineTrash className="text-lg" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-2 flex-1 bg-blue-50/60 rounded-lg px-3 py-2 border border-blue-100">
          <LuPaperclip className="text-blue-400 text-lg" />
          <input
            type="text"
            placeholder="Add File Link"
            value={option}
            onChange={({ target }) => setOption(target.value)}
            className="flex-1 px-2 py-1 bg-transparent focus:outline-none text-blue-900 placeholder-blue-400"
          />
        </div>
        <button
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold shadow hover:from-blue-600 hover:to-blue-800 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={handleAddOption}
        >
          <HiMiniPlus className="text-lg" /> Add
        </button>
      </div>
    </div>
  );
};

export default AddAttachmentsInput;