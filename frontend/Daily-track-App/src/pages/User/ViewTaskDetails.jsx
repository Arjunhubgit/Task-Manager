import React from 'react';

const ViewTaskDetails = () => {
  // Placeholder for task details. You can fetch task details using useEffect and axios/moment as needed.
  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Task Details</h2>
      {/* Task details will be displayed here */}
      <p className="text-gray-700">Select a task to view its details.</p>
    </div>
  );
};

export default ViewTaskDetails;
