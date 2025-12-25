import React, { useState, useRef, useEffect } from 'react';
import { Plus, FileText, CheckSquare, Users } from 'lucide-react';

const QuickCreateButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const quickActions = [
        {
            id: 1,
            label: 'Create Task',
            description: 'Create a new task',
            icon: CheckSquare,
            href: '/admin/create-task',
            color: 'bg-orange-500/10 text-orange-500',
        },
        {
            id: 2,
            label: 'Add Team Member',
            description: 'Invite someone to team',
            icon: Users,
            href: '/admin/users',
            color: 'bg-cyan-500/10 text-cyan-500',
        },
        {
            id: 3,
            label: 'New Report',
            description: 'Generate a report',
            icon: FileText,
            href: '#',
            color: 'bg-purple-500/10 text-purple-500',
        },
    ];

    return (
        <div className="relative" ref={menuRef}>
            {/* Quick Create Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 group"
            >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                <span>Create</span>
            </button>

            {/* Mobile Quick Create Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
                <Plus className="w-5 h-5" />
            </button>

            {/* Quick Create Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                        <p className="font-semibold text-white text-sm">Quick Create</p>
                        <p className="text-xs text-gray-500 mt-0.5">Create something new</p>
                    </div>

                    {/* Quick Actions List */}
                    <div className="p-2">
                        {quickActions.map(action => {
                            const Icon = action.icon;
                            return (
                                <a
                                    key={action.id}
                                    href={action.href}
                                    className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                            {action.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {action.description}
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>

                    {/* Keyboard Shortcut Footer */}
                    <div className="p-3 border-t border-white/5 bg-white/[0.02] text-xs text-gray-600">
                        <p>💡 Tip: Use keyboard shortcuts to create faster</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickCreateButton;
