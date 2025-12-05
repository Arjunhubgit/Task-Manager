import { FaTasks } from 'react-icons/fa';
import UI_IMG from '../../assets/images/robot-img.png';
import Scene3D from '../Scene3D.jsx';
import Logo_img from '../../assets/images/logo.png';

const AuthLayout = ({ children }) => {
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#050505]">
            {/* --- Ambient Background Glows (Matching Login/Signup) --- */}
            <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Background: Scene3D - Fixed & Low Opacity to blend */}
            <div className="fixed inset-0 z-0 opacity-80">
                <Scene3D />
            </div>
            
            {/* Content Container */}
            <div className="relative z-10 w-full h-full overflow-y-auto custom-scrollbar">
                <div className="flex w-full min-h-full">
                    {/* Left side: Auth content */}
                    <div className="flex-1 flex flex-col p-0 md:p-0">
                        {/* Header: Logo */}
                        <div className="flex items-center sticky top-0 z-30 px-6 py-6">
                            <img 
                                src={Logo_img} 
                                alt="Auth" 
                                className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                            />
                        </div>

                        {/* Children Wrapper: Centers the login/signup card */}
                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                            {children}
                        </div>
                    </div>
                    
                    {/* Right side: Sticky Visual */}
                    <div className="hidden md:flex w-[45vw] h-screen items-center justify-center sticky top-0 p-8">
                        <div className="relative w-full h-[90%] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/20 backdrop-blur-sm group">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />
                            
                            <img 
                                src={UI_IMG} 
                                alt="Auth Visual" 
                                className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" 
                            />
                        </div>
                    </div> 
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;