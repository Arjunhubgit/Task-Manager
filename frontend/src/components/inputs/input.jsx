// 

import React, { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa6';

// Accept a 'className' prop, with a default empty string
const Input = ({ value, onChange, label, placeholder, type = 'text', className = '' }) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <div>
            <label className="text-[15px] text-white/90">{label}</label>
            <div className="input-box relative flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2">
                <input
                    type={type === 'password' ? (showPassword ? 'text' : "password") : type}
                    placeholder={placeholder}
                    // Combine the component's default classes with the new className prop
                    className={`w-full bg-transparent outline-none text-[15px] text-white placeholder-white/60 ${type === 'password' ? 'pr-10' : ''} ${className}`}
                    value={value}
                    onChange={(e) => onChange(e)} 
                />
                {type === 'password' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onMouseDown={e => e.preventDefault()} onClick={toggleShowPassword}>
                        {showPassword ? (
                            <FaRegEye
                                size={22}
                                className="text-blue-300 cursor-pointer"
                            />
                        ) : (
                            <FaRegEyeSlash
                                size={22}
                                className="text-white/60 cursor-pointer"
                            />
                        )}
                    </span>
                )}
            </div>
        </div>
    );
}

export default Input;
