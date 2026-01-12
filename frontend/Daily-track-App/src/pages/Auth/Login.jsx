import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { validateEmail } from "../../utils/helper.js";
import { 
  FaEnvelope, FaLock, FaCheckCircle, FaSignInAlt, FaEye, FaEyeSlash, 
  FaShieldAlt, FaRocket, FaAtom 
} from 'react-icons/fa';
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPaths.js";
import { UserContext } from "../../context/userContext.jsx";
import imgage from "../../assets/svg/google-color.svg";
import logo from "../../assets/images/logo1.png";

// Firebase
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase"; 

// --- Animated Typing Component ---
const TypingText = ({ words }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 1000);
      return;
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 75 : 150);
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);

  return <span className="text-[#EA8D23] font-bold">{`${words[index].substring(0, subIndex)}${subIndex === words[index].length ? '' : '|'}`}</span>;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const response = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_LOGIN, {
        name: user.displayName,
        email: user.email,
        googlePhotoUrl: user.photoURL,
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      console.error(err);
      setError("Google Sign In failed.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) { setError("Invalid Email"); return; }
    if (!password) { setError("Password Required"); return; }
    setError(null);
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, { email, password });
      handleAuthSuccess(response.data);
    } catch (error) {
        setError(error.response?.data?.message || "Login Failed");
    }
  };

  const handleAuthSuccess = (data) => {
      const { token, role } = data;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        updateUser(data);
        if (role === "admin") navigate("/admin/dashboard");
        else navigate("/user/dashboard");
      }
  };

  return (
    // MAIN CONTAINER: Fixed Screen, No Scroll
    <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center relative overflow-hidden font-sans text-gray-100">
      
      {/* 1. Host Access Button (Top Right) */}
      <div className="absolute top-6 right-8 z-50">
        <button 
            onClick={() => navigate("/host-login")}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-500 hover:text-[#EA8D23] hover:border-[#EA8D23] hover:bg-[#EA8D23]/10 transition-all duration-300 group backdrop-blur-md"
        >
            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V8.5" />
              <path d="M10.5 1.5v5h5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>HOST ACCESS</span>
        </button>
      </div>

      {/* 2. Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-orange-900/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* 3. Main Content Card */}
      <div className="relative z-10 w-full max-w-[1100px] h-[600px] bg-[#121214]/80 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl flex overflow-hidden">
         
         {/* Left Side: Login Form */}
         <div className="w-full lg:w-1/2 p-10 flex flex-col justify-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EA8D23] to-transparent opacity-50"></div>
            
            <div className="mb-8">
                <img src={logo} alt="Logo" className="h-10 mb-6 object-contain" />
                <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
                <p className="text-gray-500 text-sm mt-2">Enter your credentials to access your workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                    <div className="relative group">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1c1c1f] border border-white/5 text-gray-200 text-sm rounded-xl p-3 pl-10 focus:border-[#EA8D23] focus:ring-1 focus:ring-[#EA8D23] outline-none transition-all" placeholder="user@example.com" />
                        <FaEnvelope className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-[#EA8D23] transition-colors" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative group">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1c1c1f] border border-white/5 text-gray-200 text-sm rounded-xl p-3 pl-10 pr-10 focus:border-[#EA8D23] focus:ring-1 focus:ring-[#EA8D23] outline-none transition-all" placeholder="••••••••" />
                        <FaLock className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-[#EA8D23] transition-colors" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white"><FaEye className="text-sm" /></button>
                    </div>
                </div>

                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium text-center">{error}</div>}

                <div className="pt-2">
                    <button type="submit" className="w-full bg-gradient-to-r from-[#EA8D23] to-[#d97706] hover:brightness-110 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        <span>Sign In</span> <FaRocket />
                    </button>
                </div>
            </form>

            <div className="mt-6 flex items-center gap-4">
                <div className="h-px bg-white/5 flex-1"></div>
                <span className="text-gray-600 text-[10px] font-bold uppercase">Or continue with</span>
                <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <button onClick={handleGoogleSignIn} className="mt-6 w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-colors">
                <img src={imgage} alt="G" className="w-5 h-5" />
                <span className="text-sm">Google Account</span>
            </button>

            <p className="mt-6 text-center text-gray-500 text-xs">New here? <Link to="/signup" className="text-[#EA8D23] hover:underline font-bold">Create Account</Link></p>
         </div>

         {/* Right Side: Visuals */}
         <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#1c1c1f] to-[#0d0d0f] flex-col items-center justify-center p-12 text-center overflow-hidden">
            {/* Animated Circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            
            <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-[#EA8D23]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#EA8D23]/20">
                    <FaAtom className="text-3xl text-[#EA8D23] animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold text-white leading-tight">
                    Optimized for <br />
                    <TypingText words={["Performance", "Developers", "Teams", "Scale"]} />
                </h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
                    Experience the next generation of task management with AI-driven insights and real-time collaboration.
                </p>
                
                <div className="grid grid-cols-2 gap-3 mt-8">
                     {["Secure", "Fast", "Reliable", "Cloud"].map((tag) => (
                         <div key={tag} className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-xs text-gray-400 font-medium">{tag}</div>
                     ))}
                </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default Login;