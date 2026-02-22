

const Modal = ({ children, isOpen, onClose, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-gray-950 rounded-2xl shadow-2xl border border-blue-200 w-full max-w-lg mx-4 animate-fade-in">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-black-50 to-gray-900 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-orange-500 tracking-wide">{title}</h3>
                    <button
                        type="button"
                        className="text-blue-400 hover:text-blue-700 transition-colors p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <svg
                            className="w-5 h-5"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 14 14"
                        >
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                            />
                        </svg>
                    </button>
                </div>
                {/* Modal body */}
                <div className="px-6 py-6 text-blue-900 bg-gradient-to-r from-black-50 to-gray-900 rounded-b-2xl">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal