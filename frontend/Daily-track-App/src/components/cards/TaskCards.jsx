import React from 'react';
import moment from "moment";
import { LuPaperclip } from "react-icons/lu";
import AvatarGroup from '../AvatarGroup'; // Assuming this component exists
import Progress from '../Progress'; // Assuming this component exists

const TaskCard = ({
  title,
  description,
  priority,
  status,
  progress,
  createdAt,
  dueDate,
  assignedTo,
  attachmentCount,
  completedTodoCount,
  todoChecklist,
  onClick,
  onAvatarClick, // <--- NEW PROP
}) => {
  const getStatusTagColor = () => {
    switch (status) {
      case "In Progress":
        return "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20";
      case "Completed":
        return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
      default:
        return "text-orange-400 bg-orange-500/10 border border-orange-500/20";
    }
  };

  const getPriorityTagColor = () => {
    switch (priority) {
      case "Low":
        return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
      case "Medium":
        return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
      default:
        return "text-rose-400 bg-rose-500/10 border border-rose-500/20";
    }
  };

  const getStatusBorderColor = () => {
    switch (status) {
      case "In Progress":
        return "border-cyan-500/30";
      case "Completed":
        return "border-emerald-500/30";
      default:
        return "border-orange-500/30";
    }
  };

  

  return (
    <div
      className={`bg-[#1a1a1a]/60 backdrop-blur-sm rounded-xl p-6 border border-white/10 
      hover:border-[#EA8D23]/50 hover:bg-[#1a1a1a]/80 transition-all duration-300 cursor-pointer group shadow-lg`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border ${getStatusTagColor()}`}
        >
          {status}
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border ${getPriorityTagColor()}`}
        >
          {priority} Priority
        </span>
      </div>

      <div className={`border-l-4 rounded-sm pl-4 ${getStatusBorderColor()}`}>
        <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 group-hover:text-[#EA8D23] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 text-sm text-gray-400 flex items-center justify-between">
        <p>
          Tasks Done:{" "}
          <span className="font-semibold text-[#EA8D23]">
            {completedTodoCount} / {todoChecklist.length || 0}
          </span>
        </p>
      </div>
      <div className="mt-2">
        <Progress progress={progress} status={status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/10 pt-4">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Start Date</p>
          <p className="text-sm text-gray-300 font-semibold mt-1">
            {moment(createdAt).format("MMM Do, YYYY")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Due Date</p>
          <p className="text-sm text-gray-300 font-semibold mt-1">
            {moment(dueDate).format("MMM Do, YYYY")}
          </p>
        </div>
      </div>

      {/* <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
        <AvatarGroup avatars={assignedTo || []} maxVisible={3} />
        {attachmentCount > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-300 bg-white/5 hover:bg-[#EA8D23]/10 border border-white/10 rounded-lg px-3 py-1 transition-colors">
            <LuPaperclip className="text-[#EA8D23]" />
            <span>{attachmentCount} Attachments</span>
          </div>
        )}
      </div> */}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <AvatarGroup
          avatars={assignedTo || []}
          maxVisible={10}
          onAvatarClick={onAvatarClick} // <--- PASS IT DOWN
        />
        {attachmentCount > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-300 bg-white/5 hover:bg-[#EA8D23]/10 border border-white/10 rounded-lg px-3 py-1 transition-colors">
            <LuPaperclip className="text-[#EA8D23]" />
            <span>{attachmentCount} Attachments</span>
          </div>
        )}
      </div>
    </div>

  );
};

export default TaskCard;

