import React from 'react'

const AvatarGroup = ({ avatars, maxVisible, onAvatarClick }) => {
  // Ensure avatars is always an array to prevent crashes
  const safeAvatars = Array.isArray(avatars) ? avatars : [];

  return (
    <div className="flex items-center pl-3">
      {safeAvatars.slice(0, maxVisible).map((user, index) => {
        // Handle both: string URLs (old data) and User Objects (new data)
        const imgSrc = typeof user === 'string' ? user : (user?.profileImageUrl || "https://ui-avatars.com/api/?name=" + (user?.name || "User"));
        const name = typeof user === 'object' ? user?.name : "User";
        
        return (
            <div 
                key={index} 
                className="relative group -ml-3 hover:z-10 transition-all cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation(); // Stop the click from opening the Task Edit page
                    if(onAvatarClick && typeof user === 'object') onAvatarClick(user);
                }}
                title={name} 
            >
                <img
                  src={imgSrc}
                  alt={`Avatar ${index}`}
                  className="w-9 h-9 rounded-full border-2 border-white object-cover group-hover:border-[#EA8D23] group-hover:scale-110 transition-all shadow-sm"
                />
            </div>
        )
      })}
      
      {safeAvatars.length > maxVisible && (
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 border-2 border-white text-xs font-bold text-gray-600 -ml-3 z-0">
          +{safeAvatars.length - maxVisible}
        </div>
      )}
    </div>
  )
}

export default AvatarGroup