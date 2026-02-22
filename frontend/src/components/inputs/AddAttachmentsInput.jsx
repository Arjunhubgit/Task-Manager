import React, { useState } from 'react';
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip, LuLink } from "react-icons/lu";

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
    <div className="space-y-4">
      {/* List of Added Attachments */}
      {attachments.map((item, index) => (
        <div 
            key={item} 
            className="group flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/5 hover:border-cyan-500/30 transition-all duration-200"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            {/* Icon Badge - Cyan for Files */}
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
              <LuPaperclip className="text-lg" />
            </div>
            
            {/* Link Text */}
            <p className="text-gray-300 text-base truncate font-medium max-w-xs md:max-w-md group-hover:text-white transition-colors">
                {item}
            </p>
          </div>

          {/* Delete Button */}
          <button
            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
            onClick={() => handleDeleteOption(index)}
            title="Delete"
          >
            <HiOutlineTrash className="text-xl" />
          </button>
        </div>
      ))}

      {/* Input Area */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 flex items-center gap-3 bg-[#050505] border border-white/10 rounded-2xl px-5 py-3.5 focus-within:border-[#EA8D23]/50 focus-within:ring-1 focus-within:ring-[#EA8D23]/50 transition-all">
          <LuLink className="text-gray-500 text-xl flex-shrink-0" />
          <input
            type="text"
            placeholder="Paste file URL here..."
            value={option}
            onChange={({ target }) => setOption(target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
            className="flex-1 bg-transparent focus:outline-none text-gray-200 placeholder-gray-600 text-base w-full"
          />
        </div>
        
        <button
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#EA8D23] hover:bg-[#d67e1b] text-white text-base font-bold shadow-[0_0_15px_rgba(234,141,35,0.3)] hover:shadow-[0_0_20px_rgba(234,141,35,0.5)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAddOption}
          disabled={!option.trim()}
        >
          <HiMiniPlus className="text-xl" /> 
          <span>Add</span>
        </button>
      </div>
    </div>
  );
};

export default AddAttachmentsInput;