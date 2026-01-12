import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight, Zap, FileText, Users, X, Loader } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

const   SearchBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState({ tasks: [], users: [] });
    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const searchTimeoutRef = useRef(null);

    // Fetch search results from API
    const performSearch = useCallback(async (term) => {
        if (!term.trim()) {
            setSearchResults({ tasks: [], users: [] });
            return;
        }

        setIsLoading(true);
        try {
            // Fetch tasks and users in parallel
            const [tasksResponse, usersResponse] = await Promise.all([
                axiosInstance.get('/api/tasks').catch(err => {
                    console.error('Tasks fetch error:', err);
                    return { data: { tasks: [] } };
                }),
                axiosInstance.get('/api/users').catch(err => {
                    console.error('Users fetch error:', err);
                    return { data: [] };
                })
            ]);

            const tasks = tasksResponse.data.tasks || tasksResponse.data || [];
            // Handle both array response and object with users property
            const users = Array.isArray(usersResponse.data) ? usersResponse.data : (usersResponse.data.users || []);

            // Filter results based on search term
            const filteredTasks = tasks.filter(task =>
                task.title.toLowerCase().includes(term.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(term.toLowerCase()))
            );

            const filteredUsers = users.filter(user =>
                user.name.toLowerCase().includes(term.toLowerCase()) ||
                (user.email && user.email.toLowerCase().includes(term.toLowerCase()))
            );

            setSearchResults({
                tasks: filteredTasks.slice(0, 5), // Limit to 5 results
                users: filteredUsers.slice(0, 5)  // Limit to 5 results
            });
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults({ tasks: [], users: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search
    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for debounced search
        setIsLoading(term.length > 0);
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(term);
        }, 300);
    };

    const hasResults = searchResults.tasks.length > 0 || searchResults.users.length > 0;

    // Handle result selection
    const handleTaskClick = (taskId) => {
        navigate(`/admin/tasks?highlight=${taskId}`, { state: { highlightTaskId: taskId } });
        setIsOpen(false);
        setSearchTerm('');
        setSearchResults({ tasks: [], users: [] });
    };

    const handleUserClick = (userId) => {
        // Navigate to user details page
        navigate(`/admin/users?highlight=${userId}`, { state: { highlightUserId: userId } });
        setIsOpen(false);
        setSearchTerm('');
        setSearchResults({ tasks: [], users: [] });
    };

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
                setSearchResults({ tasks: [], users: [] });
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
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
            {/* Search Trigger Button - Desktop */}
            <button
                onClick={() => setIsOpen(true)}
                className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/8 to-white/5 border border-white/15 hover:from-white/12 hover:to-white/10 hover:border-orange-500/50 shadow-lg shadow-black/20 hover:shadow-orange-500/10 transition-all duration-300 group min-w-[300px] active:scale-95"
            >
                <Search className="w-5 h-5 text-orange-400 group-hover:text-orange-300 transition-colors flex-shrink-0" />
                <span className="text-sm text-gray-300 group-hover:text-gray-100 flex-1 text-left font-medium">Search tasks & team...</span>
                <kbd className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/15 text-xs text-gray-400 group-hover:bg-orange-500/10 group-hover:border-orange-500/30 transition-all duration-200">
                    <span className="font-semibold">⌘</span><span>K</span>
                </kbd>
            </button>

            {/* Mobile Search Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-white/5 transition-all duration-200 active:scale-95"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Search Modal/Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] border border-white/15 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl">
                        {/* Search Input */}
                        <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                            <div className="relative flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10 focus-within:border-orange-500/50 focus-within:bg-white/8 transition-all duration-200">
                                <Search className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search tasks, team members..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm font-medium"
                                    autoComplete="off"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 active:scale-90"
                                    >
                                        <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            {isLoading && (
                                <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                                    <Loader className="w-5 h-5 text-orange-400 animate-spin" />
                                    <p className="text-sm text-gray-400 font-medium">Searching...</p>
                                </div>
                            )}
                            {!isLoading && searchTerm === '' ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-3">
                                        <Zap className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">Start typing to search tasks & team members</p>
                                    <p className="text-xs text-gray-600 mt-2">Try searching by task name or team member name</p>
                                </div>
                            ) : !isLoading && hasResults ? (
                                <>
                                    {/* Tasks Results */}
                                    {searchResults.tasks.length > 0 && (
                                        <div className="p-3 border-b border-white/5">
                                            <p className="text-xs text-gray-500 px-3 py-2 font-bold uppercase tracking-wider">📋 Tasks</p>
                                            {searchResults.tasks.map((task, index) => (
                                                <button
                                                    key={task._id}
                                                    onClick={() => handleTaskClick(task._id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/8 transition-all duration-200 text-left group ${index !== searchResults.tasks.length - 1 ? 'border-b border-white/5' : ''}`}
                                                >
                                                    <div className="p-1.5 bg-orange-500/15 rounded-lg group-hover:bg-orange-500/25 transition-colors flex-shrink-0">
                                                        <FileText className="w-4 h-4 text-orange-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-100 group-hover:text-white truncate font-semibold">{task.title}</p>
                                                        {task.description && (
                                                            <p className="text-xs text-gray-500 truncate mt-1">{task.description}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-all duration-200 flex-shrink-0 transform group-hover:translate-x-1" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Users Results */}
                                    {searchResults.users.length > 0 && (
                                        <div className="p-3">
                                            <p className="text-xs text-gray-500 px-3 py-2 font-bold uppercase tracking-wider">👥 Team</p>
                                            {searchResults.users.map((user, index) => (
                                                <button
                                                    key={user._id}
                                                    onClick={() => handleUserClick(user._id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/8 transition-all duration-200 text-left group ${index !== searchResults.users.length - 1 ? 'border-b border-white/5' : ''}`}
                                                >
                                                    <div className="p-1.5 bg-cyan-500/15 rounded-lg group-hover:bg-cyan-500/25 transition-colors flex-shrink-0">
                                                        <Users className="w-4 h-4 text-cyan-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-100 group-hover:text-white truncate font-semibold">{user.name}</p>
                                                        <p className="text-xs text-gray-500 truncate mt-1">{user.role || user.email}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-all duration-200 flex-shrink-0 transform group-hover:translate-x-1" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : !isLoading && searchTerm !== '' ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-gray-800/30 flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">No results found</p>
                                    <p className="text-xs text-gray-600 mt-2">Try a different search term</p>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/10 bg-white/[0.03] flex items-center justify-between text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">ESC</kbd>
                                <span>to close</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <span>Select</span>
                                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">Enter</kbd>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
