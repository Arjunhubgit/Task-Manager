import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { validateEmail } from "../../utils/helper.js";
import { 
  FaEnvelope, FaLock, FaEye, FaEyeSlash, 
  FaRocket, FaAtom, FaShieldAlt, FaChevronRight, FaSpinner 
} from 'react-icons/fa';
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPaths.js";
import { UserContext } from "../../context/userContext.jsx";
import imgage from "../../assets/svg/google-color.svg";
import logo from "../../assets/svg/logo1.png";
import title from "../../assets/svg/title.png";

// Firebase
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase"; 

// --- PREMIUM TASK MANAGER TYPING COMPONENT ---
const words = [
  "Task Management",
  "Workflow Automation",
  "Productivity Control",
  "Execution Precision"
];

const PremiumTypingText = () => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (subIndex === words[index].length && !isDeleting) {
      const pause = setTimeout(() => setIsDeleting(true), 1200); 
      return () => clearTimeout(pause);
    }
    if (subIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }
    
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, isDeleting ? 40 : 70); 

    return () => clearTimeout(timeout);
  }, [subIndex, index, isDeleting]);

  return (
    // Scaled down to 38px for perfect single-frame fit
    <span className="premium-gradient-text block text-[38px] mt-1 border-r-[2px] border-[#FF8C00] pr-2 align-middle">
      {words[index].substring(0, subIndex)}
    </span>
  );
};


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleAuthSuccess = (data) => {
    const { token, role } = data;
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      updateUser(data);
      navigate(role === "admin" ? "/admin/dashboard" : "/user/dashboard");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) { setError("Invalid Email Address format."); return; }
    if (!password) { setError("Password verification is required."); return; }
    // Do not clear error here, so user can see the last error until next submit
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, { email, password });
      handleAuthSuccess(response.data);
    } catch (error) {
      if (error.response) {
        // Server responded with a status code outside 2xx
        setError(error.response.data?.message || "Authentication failed. Please check your credentials.");
      } else if (error.request) {
        // Request was made but no response received
        setError("Network error: Unable to reach authentication server. Please check your connection.");
      } else {
        // Something else happened
        setError("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const response = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_LOGIN, {
        name: result.user.displayName,
        email: result.user.email,
        googlePhotoUrl: result.user.photoURL,
        googleUid: result.user.uid,
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      if (err?.code === "auth/unauthorized-domain") {
        setError("Google sign-in blocked for this domain. Add this IP/domain in Firebase Authorized domains.");
      } else if (err?.code === "auth/popup-blocked") {
        setError("Popup blocked by browser. Allow popups and try Google sign-in again.");
      } else if (err.response) {
        setError(err.response.data?.message || "Google authentication failed. Please try again.");
      } else if (err.request) {
        setError("Network error: Unable to reach Google authentication server.");
      } else {
        setError("External Google authentication failed.");
      }
    }
  };

  return (
    // FIX 1: Strict `h-screen` and `overflow-hidden` for absolute zero scroll
    <div className="min-h-[100dvh] w-full bg-[#0B0F19] flex items-center justify-center relative overflow-x-hidden p-3 sm:p-4 md:p-6 font-sans text-slate-200">
      
      <style>{`
        .premium-gradient-text {
          background: linear-gradient(90deg, #ff8c00, #ffb347, #ff8c00);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientFlow 4s linear infinite, cursorBlink 1s infinite;
        }
        @keyframes gradientFlow {
          to { background-position: 200% center; }
        }
        @keyframes cursorBlink {
          0%, 100% { border-color: transparent; }
          50% { border-color: #ff8c00; } 
        }
      `}</style>

      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#FF8C00]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

      {/* Host Access Portal */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-10 z-50">
        <button 
          onClick={() => navigate("/host-login")}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-white/[0.03] border border-white/10 rounded-full text-[9px] sm:text-[10px] font-bold tracking-[1.4px] sm:tracking-[2px] text-gray-400 hover:bg-[#FF8C00] hover:text-black hover:border-[#FF8C00] transition-all duration-300 backdrop-blur-md"
        >
          HOST PORTAL <FaChevronRight className="text-[8px]" />
        </button>
      </div>

      {/* FIX 2: Strict Height Limits -> `h-[600px] max-h-[90vh]` guarantees it never breaks the viewport */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[1050px] min-h-[560px] h-auto sm:h-[600px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] bg-[rgba(20,20,25,0.6)] backdrop-blur-[20px] border border-white/[0.08] rounded-[16px] sm:rounded-[20px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row overflow-hidden"
      >
        
        {/* LEFT SECTION: Form Interface */}
        {/* FIX 3: Optimized padding for compact layout */}
        <div className="w-full h-full lg:w-[45%] p-5 sm:p-6 md:p-7 flex flex-col justify-center relative z-20 overflow-y-auto">
          
          <div className="flex items-center gap-2 mb-3 h-7">
            <img src={logo} alt="Chronoflow Logo" className="h-12 object-contain drop-shadow-[0_0_8px_rgba(255,140,0,0.5)]" />
            <img src={title} alt="Chronoflow" className="h-15 w-auto object-contain" />
          </div>

          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-gray-400 text-sm sm:text-[15px] mt-0.5">Initialize your session to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-2.5">
            
            <div className="relative group">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 peer-focus:text-[#FF8C00] transition-colors z-10" />
              <input 
                type="email" 
                id="email"
                placeholder=" "
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="peer w-full h-[44px] bg-white/[0.02] border border-white/10 text-white text-sm rounded-xl px-12 pt-3 pb-1 focus:border-[#FF8C00]/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#FF8C00]/50 outline-none transition-all shadow-inner" 
              />
              <label 
                htmlFor="email" 
                className="absolute left-12 top-1 text-gray-500 text-[10px] uppercase tracking-wider font-semibold transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-[10px] peer-focus:text-[#FF8C00] pointer-events-none"
              >
                Work Email
              </label>
            </div>

            <div className="relative group">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 peer-focus:text-[#FF8C00] transition-colors z-10" />
              <input 
                type={showPassword ? "text" : "password"} 
                id="password"
                placeholder=" "
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="peer w-full h-[44px] bg-white/[0.02] border border-white/10 text-white text-sm rounded-xl px-12 pt-3 pb-1 focus:border-[#FF8C00]/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#FF8C00]/50 outline-none transition-all shadow-inner" 
              />
              <label 
                htmlFor="password" 
                className="absolute left-12 top-1 text-gray-500 text-[10px] uppercase tracking-wider font-semibold transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-[10px] peer-focus:text-[#FF8C00] pointer-events-none"
              >
                Password
              </label>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-10">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs py-0.5">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${rememberMe ? 'bg-[#FF8C00] border-[#FF8C00]' : 'border-gray-500 bg-transparent group-hover:border-gray-400'}`}>
                        {rememberMe && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><FaShieldAlt className="text-black text-[8px]" /></motion.div>}
                    </div>
                    <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Remember me</span>
                    <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                </label>
                <Link to="/forgot-password" className="text-gray-400 font-medium hover:text-[#FFA726] transition-colors">Forgot Password?</Link>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-semibold">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full mt-1.5 relative group overflow-hidden bg-gradient-to-r from-[#FF8C00] to-[#FFA726] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(255,140,0,0.2)] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(255,140,0,0.35)] active:scale-[0.98] disabled:opacity-80"
            >
              {isSubmitting ? (
                 <FaSpinner className="animate-spin text-lg" />
              ) : (
                 <>Authorize Access <FaRocket className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-2 flex items-center justify-center gap-1.5 text-[8px] text-gray-500 font-medium tracking-wide">
              <FaShieldAlt className="text-green-500/70" />
              <span>SECURE 256-BIT ENCRYPTED</span>
          </div>

          <div className="mt-2.5 relative flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="bg-[rgba(20,20,25,1)] px-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest relative z-10">Or continue with</span>
          </div>

          <button onClick={handleGoogleSignIn} className="mt-2.5 w-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300">
            <img src={imgage} alt="G" className="w-4 h-4" />
            <span className="text-[11px] tracking-wide">Google SSO</span>
          </button>

          <p className="mt-3 text-center text-gray-400 text-[10px] font-medium">
            Need account? <Link to="/signup" className="text-[#FFA726] hover:text-white font-bold transition-colors">Sign Up</Link>
          </p>
        </div>

        {/* RIGHT SECTION: Animated Futuristic Hero */}
        <div 
          className="hidden lg:flex w-[55%] h-full relative flex-col items-center justify-center p-10 text-center overflow-hidden border-l border-white/[0.04]"
          style={{ background: "radial-gradient(circle, rgba(255,140,0,0.05), transparent 70%)" }}
        >
          
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 120, ease: "linear" }} className="absolute w-[500px] h-[500px] border border-white/[0.02] rounded-full pointer-events-none" />
          <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 80, ease: "linear" }} className="absolute w-[350px] h-[350px] border border-[#FF8C00]/[0.08] rounded-full border-dashed pointer-events-none" />
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 60, ease: "linear" }} className="absolute w-[200px] h-[200px] border border-white/[0.03] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center w-full">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative w-24 h-24 bg-[rgba(20,20,25,0.8)] border border-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,140,0,0.15)]"
            >
              <div className="absolute inset-0 bg-[#FF8C00]/20 blur-xl rounded-full animate-pulse" />
              <FaAtom className="text-5xl text-[#FF8C00] relative z-10 drop-shadow-[0_0_15px_rgba(255,140,0,1)]" />
            </motion.div>
            
            {/* FIX 4: Task Manager tailored branding and correctly scaled font sizes */}
            <h2 className="font-extrabold text-white leading-[1.15] tracking-[-0.5px] mb-6 flex flex-col justify-center text-center h-[90px]">
              <span className="block text-[30px] opacity-90 mb-1">Manage Your</span>
              <PremiumTypingText /> 
            </h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 2, ease: "easeOut" }}
              className="text-gray-400 text-[13px] max-w-[320px] leading-relaxed mb-10 italic"
            >
              "The best way to predict the future is to create it. Manage your performance with precision."
            </motion.p>

            <div className="flex items-center justify-center gap-10 bg-white/[0.02] border border-white/[0.05] py-3.5 px-8 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <span className="text-xl text-white font-mono font-bold tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">99.9%</span>
                <span className="text-[8px] uppercase tracking-[3px] text-[#FFA726] font-bold mt-1">Uptime</span>
              </div>
              <div className="h-8 w-[1px] bg-white/[0.08]"></div>
              <div className="flex flex-col items-center">
                <span className="text-xl text-white font-mono font-bold tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">256-bit</span>
                <span className="text-[8px] uppercase tracking-[3px] text-[#FFA726] font-bold mt-1">Security</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 flex gap-4">
            <span className="text-[9px] font-mono font-bold tracking-[2px] text-gray-600">SYS.VER: 3.0.4</span>
            <span className="text-[9px] font-mono font-bold tracking-[2px] text-green-500/50 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> ONLINE</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login; 
