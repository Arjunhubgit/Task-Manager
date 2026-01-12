import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ProfilePhotoSelector from '../../components/inputs/ProfilePhotoSelector';
import { 
  FaRocket, FaEye, FaEyeSlash, FaLink, FaCheck, 
  FaUser, FaEnvelope, FaLock, FaShieldAlt, FaBolt, FaCheckCircle, FaCloud 
} from 'react-icons/fa';
import { validateEmail } from '../../utils/helper';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { UserContext } from '../../context/userContext';
import uploadImage from '../../utils/uploadimage';
import googleIcon from "../../assets/svg/google-color.svg";
import logo from "../../assets/images/logo1.png";

// Firebase Imports
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase"; 

const TypingText = ({ words }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 2000);
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

  return (
    <span className="text-[#E88916]">
      {words[index].substring(0, subIndex)}
      <span className="animate-pulse ml-1">|</span>
    </span>
  );
};

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValidation, setInviteValidation] = useState({ status: null, message: '' });
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [error, setError] = useState(null);
  
  const [searchParams] = useSearchParams();
  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const inviteFromURL = searchParams.get('invite');
    if (inviteFromURL) {
      setInviteCode(inviteFromURL);
      validateInviteCode(inviteFromURL);
    }
  }, [searchParams]);

  const validateInviteCode = async (code) => {
    if (!code.trim()) {
      setInviteValidation({ status: null, message: '' });
      return;
    }
    setIsValidatingInvite(true);
    try {
      const response = await axiosInstance.get(`/api/invites/verify/${code}`);
      if (response.data.success) {
        setInviteValidation({ status: 'valid', message: `Invite from ${response.data.data.adminName}` });
      }
    } catch (err) {
      setInviteValidation({ status: 'invalid', message: 'Invalid invite code' });
    } finally { setIsValidatingInvite(false); }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const response = await axiosInstance.post(API_PATHS.AUTH.GOOGLE_LOGIN, {
        name: result.user.displayName,
        email: result.user.email,
        googlePhotoUrl: result.user.photoURL,
        inviteCode: inviteCode || undefined
      });
      updateUser(response.data);
      navigate(response.data.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    } catch (err) { setError("Google Sign In failed."); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!fullName || !validateEmail(email) || !profilePic || password.length < 8) {
      setError("Please fill all fields (Password min 8 chars).");
      return;
    }
    setError(null);
    try {
      const imgUploadRes = await uploadImage(profilePic);
      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        name: fullName, email, password, profileImageUrl: imgUploadRes.imageUrl, inviteCode: inviteCode || undefined
      });
      updateUser(response.data);
      navigate(response.data.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    } catch (err) { setError(err.response?.data?.message || "Registration failed."); }
  };

  return (
    <div className="h-screen w-screen bg-[#050505] flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#E88916]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl h-full max-h-[850px] bg-[#121212] rounded-[32px] border border-white/5 shadow-2xl flex flex-col md:flex-row overflow-hidden z-10">
        
        {/* LEFT SIDE: BRANDING/MARKETING */}
        <div className="hidden md:flex w-[45%] bg-[#1A1A1A] p-12 flex-col items-center justify-center relative h-full">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="w-[85%] h-[85%] border border-white/10 rounded-full" />
            <div className="absolute w-[65%] h-[65%] border border-white/10 rounded-full" />
            <div className="absolute w-[45%] h-[45%] border border-white/10 rounded-full" />
          </div>
          
          <div className="z-10 text-center">
            <div className="w-14 h-14 bg-[#252525] rounded-2xl flex items-center justify-center mb-6 mx-auto border border-white/5 shadow-inner">
              <FaShieldAlt className="text-[#E88916] text-2xl" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Optimized for <br />
              <TypingText words={["Performance", "Efficiency", "Teamwork"]} />
            </h2>
            
            <p className="text-gray-400 max-w-xs mx-auto mb-10 text-sm leading-relaxed">
              Experience the next generation of task management with AI-driven insights and real-time collaboration.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Tag icon={<FaShieldAlt />} text="Secure" />
              <Tag icon={<FaBolt />} text="Fast" />
              <Tag icon={<FaCheckCircle />} text="Reliable" />
              <Tag icon={<FaCloud />} text="Cloud" />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: FORM SECTION */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col h-full overflow-y-auto custom-scrollbar bg-[#121212]">
          <div className="flex items-center gap-2 mb-6 flex-shrink-0">
            <img src={logo} alt="ChronoFlow Logo" className="h-7" />
            <span className="text-white font-bold text-lg tracking-tight uppercase">CHRONOFLOW</span>
          </div>

          <div className="mb-6 flex-shrink-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Create Account</h1>
            <p className="text-gray-500 text-sm">Join the workspace to manage your projects.</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4 flex-grow">
            <div className="flex justify-center mb-2">
              <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <InputBox icon={<FaUser />} label="FULL NAME">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="input-style" />
              </InputBox>

              <InputBox icon={<FaEnvelope />} label="EMAIL">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="input-style" />
              </InputBox>

              <InputBox icon={<FaLock />} label="PASSWORD">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-style pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </InputBox>

              <InputBox icon={<FaLink />} label="INVITE CODE (OPTIONAL)">
                <input type="text" value={inviteCode} onChange={(e) => {setInviteCode(e.target.value); validateInviteCode(e.target.value);}} placeholder="Paste invite code" className="input-style" />
                {isValidatingInvite && <span className="text-[10px] text-blue-400 mt-1 block">Validating...</span>}
                {inviteValidation.status === 'valid' && <span className="text-[10px] text-green-500 flex items-center gap-1 mt-1"><FaCheck /> {inviteValidation.message}</span>}
              </InputBox>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-400/5 p-3 rounded-lg border border-red-400/10 text-center mt-2">{error}</p>}

            <button type="submit" className="w-full bg-gradient-to-r from-[#E88916] to-[#C96C00] hover:brightness-110 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#E88916]/20 active:scale-[0.99] flex items-center justify-center gap-2 mt-2">
              Sign Up <FaRocket className="text-sm" />
            </button>
          </form>

          <div className="relative my-6 flex-shrink-0">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-gray-500"><span className="bg-[#121212] px-3">Or continue with</span></div>
          </div>

          <button onClick={handleGoogleSignIn} type="button" className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.99] flex-shrink-0">
            <img src={googleIcon} alt="Google" className="w-4 h-4" /> Google Account
          </button>

          <p className="text-center mt-6 text-sm text-gray-500 flex-shrink-0">
            Already have an account? <Link to="/login" className="text-[#E88916] font-bold hover:underline ml-1">Log in</Link>
          </p>
        </div>
      </div>

      <style jsx="true">{`
        .input-style {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 14px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .input-style:focus {
          border-color: #E88916;
          background: rgba(232, 137, 22, 0.02);
          box-shadow: 0 0 0 4px rgba(232, 137, 22, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(232, 137, 22, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

const InputBox = ({ icon, label, children }) => (
  <div className="space-y-1.5">
    <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-2">
      <span className="text-[#E88916] text-xs">{icon}</span> {label}
    </label>
    {children}
  </div>
);

const Tag = ({ icon, text }) => (
  <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-semibold cursor-default">
    <span className="text-[#E88916]">{icon}</span>
    {text}
  </div>
);

export default SignUp;