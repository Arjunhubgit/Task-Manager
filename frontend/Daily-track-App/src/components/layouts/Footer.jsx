import React from "react";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#0a0a0a] border-t border-gray-800/50 py-4 px-4 md:px-6 lg:px-8">
            <div className="max-w-1x1 mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Copyright Text */}
                <div className="text-center md:text-left text-sm text-gray-400">
                    <p>
                        &copy; {currentYear} <span className="text-orange-500 font-semibold">ChronoFlow</span>. All rights reserved.
                    </p>
                </div>

                {/* Links */}
                <div className="flex gap-6 text-sm text-gray-400">
                    <a href="#" className="hover:text-orange-500 transition-colors duration-200">
                        Privacy Policy
                    </a>
                    <a href="#" className="hover:text-orange-500 transition-colors duration-200">
                        Terms of Service
                    </a>
                    <a href="#" className="hover:text-orange-500 transition-colors duration-200">
                        Contact Us
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
