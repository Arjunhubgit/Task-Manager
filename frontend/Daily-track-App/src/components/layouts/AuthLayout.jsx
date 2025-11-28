import { FaTasks } from 'react-icons/fa';
import UI_IMG from '../../assets/images/robot-img.png';
import Scene3D from '../Scene3D.jsx';
import Logo_img from '../../assets/images/logo.png';



// The 'variant' prop has been removed for a single, consistent layout style.
const AuthLayout = ({ children }) => {
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-r from-gray-900 to-indigo-900">
            {/* Background: Scene3D - Fixed */}
            <div className="fixed inset-0 z-0">
                <Scene3D />
            </div>
            
            {/* Content Container - Always allows vertical scrolling if the content is long */}
            <div className="relative z-10 w-full h-full overflow-y-auto">
                <div className="flex w-full min-h-full">
                    {/* Left side: Auth content */}
                    <div className="flex-1 flex flex-col p-0 md:p-0">
                        {/* Header: Icon and Title */}
                        <div className="flex items-center mb-0 md:mb-0 sticky top-0 z-30">
                            <img src={Logo_img} alt="Auth" className="w-[20%] h-full object-cover drop-shadow-lg pt-5 pl-5 pb-5" />
        
                            {/* <h2 className="text-1xl md:text-3xl font-bold text-white">
                                Task Manager
                            </h2> */}
                        </div>

                        {/* Header: Always at the top */}


                        {/* <h2 className="text-2xl font-medium text-white self-start mb-8 md:mb-16 drop-shadow-lg sticky top-10 z-40"> Task Manager</h2> */}
                        
                        {/* Children Wrapper: Horizontally centers the login/signup card */}
                        <div className="flex-1 flex flex-col items-center">
                            {children}
                        </div>
                    </div>
                    
                    {/* Right side: Sticky position ensures it stays in place on scroll */}
                    <div className="hidden md:flex w-[40vw] h-screen items-center justify-center overflow-hidden p-0 sticky top-0">
                        <div className="bg-indigo-1000/6 rounded-2xl p-0 shadow-2xl overflow-hidden">
                            <img src={UI_IMG} alt="Auth" className="w-full h-full object-cover drop-shadow-lg" />
                        </div>
                    </div> 
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
