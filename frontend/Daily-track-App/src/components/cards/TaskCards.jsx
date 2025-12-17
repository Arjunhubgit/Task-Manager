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
  onClick
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

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
        <AvatarGroup avatars={assignedTo || []} maxVisible={3} />
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



// import Progress from '../Progress';
// import moment from 'moment';
// import AvatarGroup from '../AvatarGroup';
// import { LuPaperclip } from 'react-icons/lu';


// const TaskCard = ({
//     title,
//     description,
//     priority,
//     status,
//     progress,
//     createdAt,
//     dueDate,
//     assignedTo,
//     attachmentCount,
//     completedTodoCount,
//     todoChecklist,
//     onClick
// }) => {
//     const getStatusTagColor = () => {
//         switch (status) {
//             case "In Progress":
//                 return "text-cyan-500 bg-cyan-50 border border-cyan-500/10";
//             case "Completed":
//                 return "text-lime-500 bg-lime-50 border border-lime-500/20";
//             default:
//                 return "text-violet-500 bg-violet-50 border border-violet-500/10";
//         }
//     };

//     const getPriorityTagColor = () => {
//         switch (priority) {
//             case "Low":
//                 return "text-emerald-500 bg-emerald-50 border border-emerald-500/10";
//             case "Medium":
//                 return "text-amber-500 bg-amber-50 border border-amber-500/10";
//             default:
//                 return "text-rose-500 bg-rose-50 border border-rose-500/10";
//         }
//     };
//     return (
//      <div
//       className="bg-white rounded-xl py-4 shadow-md shadow-gray-100 border border-gray-200/50 cursor-pointer"
//       onClick={onClick}
//     >
//       <div className="flex items-center gap-3 px-4">
//         <div
//           className={`text-[11px] font-medium ${getStatusTagColor()} px-4 py-0.5 rounded-full`}
//         >
//           {status}
//         </div>
//         <div
//           className={`text-[11px] font-medium ${getPriorityTagColor()} px-4 py-0.5 rounded-full`}
//         >
//           {priority} Priority
//         </div>
//       </div>
//       <div
//         className={`px-4 mt-4 border-l-[3px] ${
//           status === "In Progress"
//             ? "border-cyan-500"
//             : status === "Completed"
//             ? "border-indigo-500"
//             : "border-violet-500"
//         }`}
//       >
//         <p className="text-sm font-medium text-gray-800 line-clamp-2">
//           {title}
//         </p>
//         <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-[18px]">
//           {description}
//         </p>

//         <p className="text-[13px] text-gray-700/80 font-medium mt-2 mb-2 leading-[18px]">
//           Task Done:{" "}
//           <span className="font-semibold text-gray-700">
//             {completedTodoCount} / {todoChecklist.length || 0}
//           </span>
//         </p>
//         <Progress progress={progress} status={status} />
//       </div>
//       <div className="flex items-center justify-between my-1 px-4">
//         <div className="flex flex-col">
//           <label className="text-xs text-gray-500">Start Date</label>
//           <p className="text-[13px] font-medium text-gray-900">
//             {moment(createdAt).format("Do MMM YYYY")}
//           </p>
//         </div>
//         <div className="flex flex-col">
//           <label className="text-xs text-gray-500">Due Date</label>
//           <p className="text-[13px] font-medium text-gray-900">
//             {moment(dueDate).format("Do MMM YYYY")}
//           </p>
//         </div>
//       </div>
//       <div className="flex items-center justify-between mt-3 px-4">
//         {attachmentCount > 0 && (
//             <div className="flex items-center gap-2 bg-blue-50 px-2.5 py-1.5 rounded-lg">
//             <LuPaperclip className="text-primary" />
//             <span className="text-xs text-gray-900">{attachmentCount}</span>
//           </div>
//         )}
//         <AvatarGroup avatars={assignedTo || []} maxVisible={3} />
//       </div>
//     </div>
//   );
// };

// export default TaskCard;



    //<div
    //     className="bg-white rounded-2xl border border-blue-100 shadow-md hover:shadow-xl transition-shadow duration-200 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 cursor-pointer"
    //     onClick={onClick}
    // >
    //     <div className="flex flex-col gap-3 md:col-span-2">
    //         <div
    //             className={`text-[11px] font-medium ${getStatusTagColor()} px-4 py-0.5 rounded-full`}
    //         >
    //             {status}
    //         </div>
    //         <div
    //             className={`text-[11px] font-medium ${getPriorityTagColor()} px-4 py-0.5 rounded-full`}
    //         >
    //             {priority} Priority
    //         </div>
    //     </div>

    //     <div className={`md:col-span-8 px-4 border-l-4 ${status === 'In Progress' ? 'border-cyan-500' : status === 'Completed' ? 'border-lime-500' : 'border-violet-500'} bg-gradient-to-b from-white to-blue-50/20 rounded-md`}>
    //         <p className="text-xl font-semibold text-blue-900 leading-tight">{title}</p>
    //         <p className="text-sm text-gray-600 mt-2 line-clamp-3">{description}</p>

    //         <div className="mt-4">
    //             <div className="flex items-center justify-between mb-2">
    //                 <p className="text-sm text-gray-700">Task Done: <span className="font-semibold text-blue-800">{completedTodoCount} / { (Array.isArray(todoChecklist) ? todoChecklist.length : 0) }</span></p>
    //                 <div className="text-sm text-gray-500">&nbsp;</div>
    //             </div>
    //             <div className="w-full">
    //                 <Progress progress={progress} status={status} />
    //             </div>
    //         </div>
    //     </div>

    //     <div className="md:col-span-2 flex flex-col justify-between items-end gap-4">
    //         <div className="w-full flex justify-between gap-1.5">
    //             <div>
    //                 <label className="text-xs text-gray-500 font-bold uppercase">Start Date</label>
    //                 <p className="text-sm text-gray-700">{createdAt ? moment(createdAt).format('Do MMM YYYY') : 'N/A'}</p>
    //             </div>
    //             <div className="text-right">
    //                 <label className="text-xs text-gray-500 uppercase font-bold">Due Date</label>
    //                 <p className="text-sm text-red-600 font-medium">{dueDate ? moment(dueDate).format('Do MMM YYYY') : 'No due date'}</p>
    //             </div>
    //         </div>

    //         <div className="w-full flex items-center justify-between">
    //             <AvatarGroup avatars={assignedTo || []} />
    //             {attachmentCount > 0 && (
    //                 <div className="flex items-center gap-1 text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
    //                     <LuPaperclip className="text-base" />
    //                     <span className="font-medium">{attachmentCount}</span>
    //                 </div>
    //             )}
    //         </div>
    //     </div>
    // </div>