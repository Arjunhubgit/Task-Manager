import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { validateEmail } from "../../utils/helper.js";
import { FaEnvelope, FaLock, FaGoogle, FaCheckCircle, FaSignInAlt } from 'react-icons/fa';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axiosInstance from "../../utils/axiosInstance.js";
import { API_PATHS } from "../../utils/apiPaths.js";
import { UserContext } from "../../context/userContext.jsx";
import imgage from "../../assets/svg/google-color.svg";
import logo from "../../assets/images/logo1.png";

// --- 1. ADDED: Firebase Imports ---
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase"; 

const TypingText = ({ words }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleTyping = () => {
      const fullWord = words[currentWordIndex];
      if (isDeleting) {
        setCurrentText(fullWord.substring(0, currentText.length - 1));
        setTypingSpeed(50);
      } else {
        setCurrentText(fullWord.substring(0, currentText.length + 1));
        setTypingSpeed(150);
      }
      if (!isDeleting && currentText === fullWord) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      }
    };
    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, words, currentWordIndex, typingSpeed]);

  return <span className="text-orange-500 font-bold border-r-4 border-orange-500 pr-1 animate-pulse">{currentText}</span>;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  // --- 2. ADDED: Google Sign-In Handler ---
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const response = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_LOGIN, {
        name: user.displayName,
        email: user.email,
        googlePhotoUrl: user.photoURL,
      });

      const { token, role } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        updateUser(response.data);

        if (role === "admin") navigate("/admin/dashboard");
        else navigate("/user/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Google Sign In failed.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters long."); return; }
    setError(null);

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, { email, password });
      updateUser(response.data);
      const { token, role } = response.data;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        updateUser(response.data);
        if (role === "admin") navigate("/admin/dashboard");
        else navigate("/user/dashboard");
      }
    } catch (error) {
      if (error.response && error.response.data.message) setError(error.response.data.message);
      else setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side: Login Form */}
        <div className="flex justify-center lg:justify-start">
          <div className="w-full max-w-[450px] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl relative">
            <img src={logo} alt="DailyTrack Logo" className="w-120 mb-4" />
            <div className="flex flex-col items-center mb-8">
              <div className="mb-4">
                <FaSignInAlt className="text-orange-500 text-3xl drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
              </div>
              <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-gray-400 text-sm">Sign in to access your dashboard.</p>
            </div>

            {/* --- 3. ADDED: onClick Handler --- */}
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full cursor-pointer bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mb-6 shadow-lg"
            >
              <img src={imgage} alt="Google logo" className="w-5 h-5" />
              <span>Sign-In with Google</span>
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] bg-white/10 flex-1"></div>
              <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">Or login with email</span>
              <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-semibold ml-1">Email Address</label>
                <div className="relative">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="arjun@example.com" className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block w-full p-3 pl-10 outline-none placeholder-gray-600 transition-all hover:bg-white/10" />
                    <FaEnvelope className="absolute left-3 top-3.5 text-gray-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-semibold ml-1">Password</label>
                <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block w-full p-3 pl-10 pr-10 outline-none placeholder-gray-600 transition-all hover:bg-white/10" />
                    <FaLock className="absolute left-3 top-3.5 text-gray-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>
              </div>
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center flex items-center justify-center gap-2"><span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>{error}</div>}
              <button type="submit" className="w-full bg-[#EA8D23] hover:bg-[#d67e1b] text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-[0_0_20px_rgba(234,141,35,0.3)] mt-2 hover:shadow-[0_0_25px_rgba(234,141,35,0.5)] active:scale-[0.98]">Sign In</button>
              <div className="mt-8 text-center"><p className="text-gray-500 text-sm">Don't have an account? <Link to="/signup" className="text-[#EA8D23] hover:text-[#FF9F38] font-semibold transition-colors">Sign up here</Link></p></div>
            </form>
          </div>
        </div>

        {/* Right Side: Animated Welcome */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 pl-12">
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit"><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span><span className="text-orange-500 text-xs font-bold tracking-wider uppercase">Secure Access</span></div>
                <h1 className="text-5xl font-extrabold text-white leading-tight">Welcome Back to <br /><TypingText words={["Efficiency.", "Clarity.", "Results.", "Success."]} /></h1>
                <p className="text-gray-400 text-lg max-w-md leading-relaxed">Pick up right where you left off. Your projects, tasks, and team are waiting for you.</p>
            </div>
            <div className="space-y-4 pt-4">{["Encrypted & Secure Login", "Instant Dashboard Access", "Sync Across Devices"].map((item, index) => (<div key={index} className="flex items-center gap-3 text-gray-300"><FaCheckCircle className="text-orange-500/80" /><span className="font-medium">{item}</span></div>))}</div>
        </div>

      </div>
    </div>
  );
};

export default Login;