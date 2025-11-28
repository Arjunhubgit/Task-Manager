import React, { useRef, useState } from 'react';
import { LuUser, LuUpload, LuTrash } from 'react-icons/lu';

const ProfilePhotoSelector = ({ image, setImage }) => {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Update the image state
      setImage(file);

      // Generate preview URL from the file
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl(null);
  };

  const onChooseFile = () => {
    inputRef.current.click();
  };

  return (
  <div className="flex justify-center mb-6">
    <input
      type="file"
      accept="image/*"
      ref={inputRef}
      onChange={handleImageChange}
      className="hidden" // Optional: hide input and trigger manually
    />

    {!image ? (
  <div className="relative w-21 h-20">
    {/* Circle with user icon */}
    <div className="w-20 h-20 flex items-center justify-center bg-white/10 backdrop-blur-sm border-3 border-dashed hover:bg-white/20 border-white/30 rounded-full">
      <LuUser className="text-4xl text-white/80" />
    </div>

    {/* Upload button positioned at bottom-right */}
    <button
      type="button"
      onClick={onChooseFile}
      className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center bg-blue-500/80 backdrop-blur-sm rounded-full text-white shadow-md hover:bg-blue-600/80 transition-colors"
    >
      <LuUpload className="w-4 h-4" />
    </button>
  </div>
) : (
      <div className="relative">
        <img
          src={previewUrl || URL.createObjectURL(image)}
          alt="Profile Photo"
          className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
        />
        <button
          type="button"
          className="bg-red-500/80 backdrop-blur-sm text-white hover:bg-red-600/80 flex items-center justify-center absolute top-15 left-14 w-8 h-8 rounded-full shadow-md transition-colors"
          onClick={handleRemoveImage}
        >
          <LuTrash className="w-5 h-5" />
        </button>
      </div>
    )}
  </div>
);

};
export default ProfilePhotoSelector;
