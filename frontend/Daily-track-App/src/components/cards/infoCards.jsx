
const InfoCard = ({ icon, label, value, color }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-3 md:w-5 md:h-5 ${color} rounded-full`}></div>
      <p className="text-xs text-gray-500 md:text-[14px]">
        {label}
        <br />
        <span className="text-sm font-semibold text-black md:text-[15px]">
          {value}
        </span>
      </p>
    </div>
  );
};

export default InfoCard;