import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfilePhotoSelector from '../../components/inputs/ProfilePhotoSelector';
import { FaRocket, FaGoogle, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { validateEmail } from '../../utils/helper';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { UserContext } from '../../context/userContext';
import uploadImage from '../../utils/uploadimage';

// --- 1. ADDED: Firebase Imports ---
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase"; 

// --- Internal Component for Typing Animation ---
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

  return (
    <span className="text-orange-500 font-bold border-r-4 border-orange-500 pr-1 animate-pulse">
      {currentText}
    </span>
  );
};

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminInviteToken, setAdminInviteToken] = useState('');
  const [error, setError] = useState(null);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  // --- 2. ADDED: Google Sign-In Handler ---
  const handleGoogleSignIn = async () => {
  try {
    // 1. Authenticate with Firebase Popup
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // 2. Send Google Data + THE ADMIN TOKEN to backend
    const response = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_LOGIN, {
      name: user.displayName,
      email: user.email,
      googlePhotoUrl: user.photoURL,
      adminInviteToken: adminInviteToken // <--- CRITICAL ADDITION
    });

    updateUser(response.data);
    const { role } = response.data;
    
    // 3. Redirect based on role
    if (role === 'admin') navigate('/admin/dashboard');
    else navigate('/user/dashboard');

  } catch (err) {
    console.error("Google Sign In Error:", err);
    setError("Google Sign In failed. Please try again.");
  }
};

  const handleSignUp = async (e) => {
    e.preventDefault();
    let profileImageUrl = "";
    if (!fullName) { setError("Please enter your full name."); return; }
    if (!validateEmail(email)) { setError("Please enter a valid email address."); return; }
    if (!profilePic) { setError("Please upload a profile picture."); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters long."); return; }
    setError(null);

    try {
      if (profilePic) {
        const imgUploadRes = await uploadImage(profilePic);
        profileImageUrl = imgUploadRes.imageUrl || "";
      }

      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        name: fullName,
        email,
        password,
        profileImageUrl,
        adminInviteToken
      });

      updateUser(response.data);

      const { role } = response.data;
      if (role === 'admin') navigate('/admin/dashboard');
      else navigate('/user/dashboard');

    } catch (err) {
      if (err.response && err.response.data.message) setError(err.response.data.message);
      else setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side: Animated Text */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 pl-8">
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    <span className="text-orange-500 text-xs font-bold tracking-wider uppercase">AI-Powered Task Management</span>
                </div>
                
                <h1 className="text-5xl font-extrabold text-white leading-tight">
                    Manage your <br />
                    <TypingText words={["Projects.", "Workflow.", "Team.", "Deadlines."]} />
                </h1>
                
                <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                    Streamline your daily tasks with our intelligent system. 
                    Join thousands of professionals delivering high-impact work.
                </p>
            </div>

            <div className="space-y-4 pt-4">
                {["Real-time Collaboration", "Smart Task Analytics", "Automated Workflow"].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-gray-300">
                        <FaCheckCircle className="text-orange-500/80" />
                        <span className="font-medium">{item}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[450px] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl relative">
                
                <div className="flex flex-col items-center mb-8">
                <div className="mb-4">
                    <FaRocket className="text-orange-500 text-3xl transform -rotate-45 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                </div>
                <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">Create Account</h1>
                <p className="text-gray-400 text-sm">Join the future of productivity.</p>
                </div>

                {/* --- 3. ADDED: onClick Handler --- */}
                <button 
                  type="button"
                  onClick={handleGoogleSignIn} 
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mb-6 shadow-lg"
                >
                  <FaGoogle className="text-xl" />
                  <span>Sign up with Google</span>
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="h-[1px] bg-white/10 flex-1"></div>
                  <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">Or register with email</span>
                  <div className="h-[1px] bg-white/10 flex-1"></div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-5">
                   <div className="flex justify-center">
                       <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
                   </div>
                   <div className="space-y-1">
                       <label className="text-gray-400 text-xs font-semibold ml-1">Full Name</label>
                       <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block w-full p-3 outline-none placeholder-gray-600 transition-all hover:bg-white/10" />
                   </div>
                   <div className="space-y-1">
                       <label className="text-gray-400 text-xs font-semibold ml-1">Email Address</label>
                       <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block w-full p-3 outline-none placeholder-gray-600 transition-all hover:bg-white/10" />
                   </div>
                   <div className="space-y-1">
                       <label className="text-gray-400 text-xs font-semibold ml-1">Password</label>
                       <div className="relative">
                           <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block w-full p-3 pl-3 pr-10 outline-none placeholder-gray-600 transition-all hover:bg-white/10" />
                           <button
                             type="button"
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300 transition-colors"
                           >
                             {showPassword ? <FaEyeSlash /> : <FaEye />}
                           </button>
                       </div>
                   </div>
                   <div className="space-y-1">
                       <label className="text-gray-400 text-xs font-semibold ml-1">Admin Token (Optional)</label>
                       <input type="text" value={adminInviteToken} onChange={(e) => setAdminInviteToken(e.target.value)} placeholder="Enter invite code" className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block w-full p-3 outline-none placeholder-gray-600 transition-all hover:bg-white/10" />
                   </div>
                   <div className="flex items-start gap-3 mt-2 px-1">
                       <input type="checkbox" id="terms" className="mt-1 w-4 h-4 rounded border-gray-600 bg-black/40 text-orange-500 focus:ring-orange-500/20" />
                       <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed">I agree to the <a href="#" className="text-gray-300 hover:text-white underline">Terms</a> and <a href="#" className="text-gray-300 hover:text-white underline">Privacy Policy</a>.</label>
                   </div>
                   {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">{error}</div>}
                   <button type="submit" className="w-full bg-[#EA8D23] hover:bg-[#d67e1b] text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-[0_0_20px_rgba(234,141,35,0.3)] mt-2 hover:shadow-[0_0_25px_rgba(234,141,35,0.5)] active:scale-[0.98]">Create Account</button>
                </form>
                <div className="mt-8 text-center"><p className="text-gray-500 text-sm">Already have an account? <Link to="/login" className="text-[#EA8D23] hover:text-[#FF9F38] font-semibold transition-colors">Log in</Link></p></div>
            </div>
        </div>
      </div>
    </div>
  );
};
export default SignUp;