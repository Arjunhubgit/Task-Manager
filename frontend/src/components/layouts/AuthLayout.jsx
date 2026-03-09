import { FaTasks } from 'react-icons/fa';
import Logo_img from '../../assets/svg/logo1.png';

const AuthLayout = ({ children }) => {
    return (
        <div className="relative w-full min-h-[100dvh] overflow-hidden bg-[#050505]">
            {/* --- Ambient Background Glows (Matching Login/Signup) --- */}
            <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Content Container */}
            <div className="relative z-10 w-full min-h-[100dvh] overflow-y-auto custom-scrollbar">
                <div className="flex w-full min-h-[100dvh]">
                    {/* Left side: Auth content */}
                    <div className="flex-1 flex flex-col p-0 md:p-0">
                        {/* Header: Logo */}
                        <div className="flex items-center sticky top-0 z-30 px-4 sm:px-6 py-4 sm:py-6">
                            <img
                                src={Logo_img}
                                alt="Auth"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                            />
                        </div>

                        {/* Children Wrapper: Centers the login/signup card */}
                        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-6 pb-6 sm:pb-8">
                            {children}
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
