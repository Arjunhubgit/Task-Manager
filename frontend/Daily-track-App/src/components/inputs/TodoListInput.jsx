import React, { useState } from 'react';
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";

const TodoListInput = ({ todoList, setTodoList }) => {
  const [option, setOption] = useState("");

  // Function to handle adding an option
  const handleAddOption = () => {
    if (option.trim()) {
      setTodoList([...todoList, option.trim()]);
      setOption("");
    }
  };

  // Function to handle deleting an option
  const handleDeleteOption = (index) => {
    const updatedArr = todoList.filter((_, idx) => idx !== index);
    setTodoList(updatedArr);
  };

  return (
    <div className="space-y-4">
      {/* List of Added Todos */}
      {todoList.map((item, index) => (
        <div 
            key={index} 
            className="group flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/5 hover:border-[#EA8D23]/30 transition-all duration-200"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            {/* Index Badge - Larger */}
            <span className="w-8 h-8 rounded-full bg-orange-500/10 text-[#EA8D23] text-sm font-bold flex items-center justify-center flex-shrink-0 border border-orange-500/20 group-hover:bg-[#EA8D23] group-hover:text-white transition-colors duration-300">
              {index + 1}
            </span>
            
            {/* Task Text - Larger Font */}
            <p className="text-gray-300 text-base truncate group-hover:text-white transition-colors">
              {item}
            </p>
          </div>

          {/* Delete Button - Larger Hit Area */}
          <button
            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
            onClick={() => handleDeleteOption(index)}
            title="Delete"
          >
            <HiOutlineTrash className="text-xl" />
          </button>
        </div>
      ))}

      {/* Input Area - Larger Box */}
      <div className="flex items-center gap-3 pt-2">
        <input
          type="text"
          placeholder="Add a new sub-task..."
          value={option}
          onChange={({ target }) => setOption(target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
          className="flex-1 bg-[#050505] border border-white/10 text-gray-200 text-base rounded-2xl px-5 py-3.5 focus:outline-none focus:border-[#EA8D23]/50 focus:ring-1 focus:ring-[#EA8D23]/50 placeholder-gray-600 transition-all"
        />
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

export default TodoListInput;