import React, { useState } from 'react'
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
  <div className="space-y-3 bg-white/80 rounded-2xl p-5 shadow border border-blue-100">
      {todoList.map((item, index) => (
        <div key={item} className="flex items-center justify-between bg-gradient-to-r from-blue-50 via-white to-blue-100 rounded-xl px-5 py-3 shadow hover:shadow-lg transition-all duration-200 group border border-blue-100/70">
          <p className="flex items-center gap-3 text-blue-900 font-semibold truncate">
            <span className="w-8 h-8 bg-blue-100 text-blue-700 font-extrabold rounded-full flex items-center justify-center shadow group-hover:bg-blue-500 group-hover:text-white transition-all duration-200 text-base scale-105">
              {index < 9 ? `0${index + 1}` : index + 1}
            </span>
            <span className="truncate text-blue-800 group-hover:text-blue-900 transition-colors duration-200">{item}</span>
          </p>
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
        <input
          type="text"
          placeholder="Enter Task"
          value={option}
          onChange={({ target }) => setOption(target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-900 shadow-sm"
        />
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

export default TodoListInput;