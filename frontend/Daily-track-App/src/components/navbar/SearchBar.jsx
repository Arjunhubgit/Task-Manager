import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Zap, FileText, Users, X } from 'lucide-react';

const SearchBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const searchRef = useRef(null);
    const inputRef = useRef(null);

    // Mock search results data
    const mockResults = {
        tasks: [
            { id: 1, title: 'Complete project proposal', icon: FileText },
            { id: 2, title: 'Review design mockups', icon: FileText },
            { id: 3, title: 'Update documentation', icon: FileText },
        ],
        team: [
            { id: 1, name: 'Arjun Sharma', role: 'Admin' },
            { id: 2, name: 'Sarah Johnson', role: 'Developer' },
            { id: 3, name: 'Mike Chen', role: 'Designer' },
        ],
    };

    // Filter results based on search term
    const filteredResults = {
        tasks: mockResults.tasks.filter(task =>
            task.title.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        team: mockResults.team.filter(member =>
            member.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    };

    const hasResults = filteredResults.tasks.length > 0 || filteredResults.team.length > 0;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // CMD/CTRL + K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
            // ESC to close
            if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={searchRef}>
            {/* Search Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="hidden md:flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-200 group min-w-[280px]"
            >
                <Search className="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-colors" />
                <span className="text-sm text-gray-400 group-hover:text-gray-300 flex-1 text-left">Search tasks, people...</span>
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-gray-500">
                    <span>⌘</span><span>K</span>
                </kbd>
            </button>

            {/* Mobile Search Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Search Modal/Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {/* Search Input */}
                        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="relative flex items-center gap-3">
                                <Search className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search tasks, team members..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {searchTerm === '' ? (
                                <div className="p-6 text-center">
                                    <Zap className="w-8 h-8 text-orange-500/30 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Start typing to search...</p>
                                </div>
                            ) : hasResults ? (
                                <>
                                    {/* Tasks Results */}
                                    {filteredResults.tasks.length > 0 && (
                                        <div className="p-2">
                                            <p className="text-xs text-gray-500 px-3 py-2 font-semibold uppercase tracking-wide">Tasks</p>
                                            {filteredResults.tasks.map(task => (
                                                <button
                                                    key={task.id}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                                >
                                                    <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-200 group-hover:text-white">{task.title}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Team Results */}
                                    {filteredResults.team.length > 0 && (
                                        <div className="p-2 border-t border-white/5">
                                            <p className="text-xs text-gray-500 px-3 py-2 font-semibold uppercase tracking-wide">Team</p>
                                            {filteredResults.team.map(member => (
                                                <button
                                                    key={member.id}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                                >
                                                    <Users className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-200 group-hover:text-white">{member.name}</p>
                                                        <p className="text-xs text-gray-500">{member.role}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-500 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-gray-500">No results found for "{searchTerm}"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-gray-500">
                            <span>Press ESC to close</span>
                            <div className="flex gap-2">
                                <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10">Enter</kbd>
                                <span>to select</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
