import React, { useState } from "react";
import { LuChevronDown } from "react-icons/lu";

const SelectDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
  <div className="relative w-full max-w-xs">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-white border border-blue-200 rounded-lg shadow-sm text-blue-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 ${isOpen ? 'ring-2 ring-blue-400' : ''}`}
        type="button"
      >
        <span>{value ? options.find((opt) => opt.value === value)?.label : placeholder}</span>
        <span className="ml-2 text-blue-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <LuChevronDown className="text-xl" />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-blue-200 rounded-lg shadow-lg z-10 max-h-60 overflow-auto animate-fade-in">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`px-4 py-2 cursor-pointer text-blue-900 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 ${value === option.value ? 'bg-blue-100 font-semibold' : ''}`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;