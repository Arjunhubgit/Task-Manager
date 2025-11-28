import {  useUserAuth } from "../../hooks/useUserAuth"

const UserDashboard = () => {

   useUserAuth();
  return (
    <div className="text-3xl text-blue-500 font-bold text-center mt-10 align-middle">
      User Dashboard
    </div>
  );
}
export default UserDashboard;