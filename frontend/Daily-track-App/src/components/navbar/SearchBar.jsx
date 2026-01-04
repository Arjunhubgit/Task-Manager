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
                                    onChange={handleSearchChange}
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
                            {isLoading && (
                                <div className="p-6 text-center flex items-center justify-center gap-2">
                                    <Loader className="w-4 h-4 text-orange-500 animate-spin" />
                                    <p className="text-sm text-gray-400">Searching...</p>
                                </div>
                            )}
                            {!isLoading && searchTerm === '' ? (
                                <div className="p-6 text-center">
                                    <Zap className="w-8 h-8 text-orange-500/30 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Start typing to search...</p>
                                </div>
                            ) : !isLoading && hasResults ? (
                                <>
                                    {/* Tasks Results */}
                                    {searchResults.tasks.length > 0 && (
                                        <div className="p-2">
                                            <p className="text-xs text-gray-500 px-3 py-2 font-semibold uppercase tracking-wide">Tasks</p>
                                            {searchResults.tasks.map(task => (
                                                <button
                                                    key={task._id}
                                                    onClick={() => handleTaskClick(task._id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                                >
                                                    <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-200 group-hover:text-white truncate">{task.title}</p>
                                                        {task.description && (
                                                            <p className="text-xs text-gray-500 truncate">{task.description}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Users Results */}
                                    {searchResults.users.length > 0 && (
                                        <div className="p-2 border-t border-white/5">
                                            <p className="text-xs text-gray-500 px-3 py-2 font-semibold uppercase tracking-wide">Team</p>
                                            {searchResults.users.map(user => (
                                                <button
                                                    key={user._id}
                                                    onClick={() => handleUserClick(user._id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                                >
                                                    <Users className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-200 group-hover:text-white truncate">{user.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{user.role || user.email}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-500 transition-colors flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : !isLoading && searchTerm !== '' ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-gray-500">No results found for "{searchTerm}"</p>
                                </div>
                            ) : null}
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
