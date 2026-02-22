import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { UserContext } from '../../context/userContext';
import AuthLayout from '../../components/layouts/AuthLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { FaShieldAlt, FaTerminal } from 'react-icons/fa';

const HostLogin = () => {
  const [hostId, setHostId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState(["> SYSTEM IDLE - WAITING FOR HOST"]);
  const navigate = useNavigate();
  const { updateUser } = useContext(UserContext);

  // Host credentials (can be moved to env variables for security)
  const REQUIRED_HOST_ID = "Arjunhost";
  const REQUIRED_PASSWORD = "arjunsharma@host007";
  const ADMIN_INVITE_TOKEN = import.meta.env.VITE_ADMIN_INVITE_TOKEN || "admin-key-12345";

  const addTerminalLine = (line) => {
    setTerminalLines(prev => [...prev.slice(-4), line]);
  };

  const handleHostAccess = async (e) => {
    e.preventDefault();
    
    // Validate credentials
    if (!hostId || !password) {
      addTerminalLine("> ERROR: Missing HOST_ID or PASSWORD");
      toast.error("Please enter both Host ID and Password");
      return;
    }

    setLoading(true);
    addTerminalLine("> Verifying credentials with secure server...");

    try {
      // Call backend host login endpoint
      const response = await axiosInstance.post(API_PATHS.AUTH.HOST_LOGIN, {
        hostId,
        password,
      });

      if (response.data) {
        const userData = response.data;

        // Store token and user data
        localStorage.setItem("token", userData.token);
        updateUser({
          _id: userData._id,
          name: userData.name,
          email: userData.email,
          role: "host",
          profileImageUrl: userData.profileImageUrl,
          isOnline: true,
          token: userData.token,
        });

        addTerminalLine("> ✓ Authentication successful");
        addTerminalLine(`> Welcome, ${hostId}`);
        addTerminalLine("> Initializing God Mode...");

        toast.success(`WELCOME BACK, ${hostId}`);

        // Redirect to Host Dashboard
        setTimeout(() => {
          navigate("/host/dashboard");
        }, 1500);
      }
    } catch (error) {
      console.error("Host access error:", error);
      const errorMsg = error.response?.data?.message || error.message;
      addTerminalLine(`> SYSTEM ERROR: ${errorMsg}`);
      toast.error(errorMsg || "Host access denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Toaster position="top-right" />
      <div className="w-full max-w-md">
        {/* Terminal Emulator */}
        <div className="mb-8 bg-black/80 border border-green-500/30 rounded-lg overflow-hidden backdrop-blur-sm">
          {/* Terminal Header */}
          <div className="bg-green-500/10 px-4 py-2 flex items-center gap-2 border-b border-green-500/20">
            <FaTerminal className="text-green-400 w-4 h-4" />
            <span className="text-xs font-mono text-green-400">SECURE.TERMINAL.HOST_ACCESS_v1.0</span>
          </div>

          {/* Terminal Content */}
          <div className="p-4 font-mono text-sm h-32 overflow-y-auto space-y-1">
            {terminalLines.map((line, idx) => (
              <div key={idx} className="text-green-400 text-xs font-mono">
                {line}
              </div>
            ))}
            <div className="text-green-400 text-xs font-mono animate-pulse">
              _
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <FaShieldAlt className="w-16 h-16 text-[#EA8D23] drop-shadow-[0_0_15px_rgba(234,141,35,0.4)]" />
              <div className="absolute inset-0 animate-pulse">
                <FaShieldAlt className="w-16 h-16 text-[#EA8D23] opacity-30" />
              </div>
            </div>
          </div>
          <h1 className="text-white font-bold tracking-[0.2em] text-sm uppercase">
            Host Control Protocol
          </h1>
          <p className="text-green-400 text-xs mt-2 font-mono">GOD MODE ACCESS</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleHostAccess} className="space-y-6">
          {/* Host ID Input */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
              HOST_ID
            </label>
            <div className="relative group">
              <input
                type="text"
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                placeholder="HOST_ID"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-green-500/20 text-white placeholder-gray-600 outline-none transition-all duration-300 focus:border-[#EA8D23] focus:bg-white/10 focus:shadow-[0_0_15px_rgba(234,141,35,0.2)] disabled:opacity-50"
              />
              <div className="absolute inset-0 pointer-events-none rounded-lg bg-gradient-to-r from-green-500/0 via-green-500/0 to-[#EA8D23]/0 group-focus-within:via-[#EA8D23]/10 transition-all duration-300" />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
              SECURITY_PASSCODE
            </label>
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-green-500/20 text-white placeholder-gray-600 outline-none transition-all duration-300 focus:border-[#EA8D23] focus:bg-white/10 focus:shadow-[0_0_15px_rgba(234,141,35,0.2)] disabled:opacity-50"
              />
              <div className="absolute inset-0 pointer-events-none rounded-lg bg-gradient-to-r from-green-500/0 via-green-500/0 to-[#EA8D23]/0 group-focus-within:via-[#EA8D23]/10 transition-all duration-300" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#EA8D23] to-orange-500 text-white font-bold uppercase text-sm tracking-wider hover:shadow-[0_0_20px_rgba(234,141,35,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  VERIFYING...
                </>
              ) : (
                <>
                  <FaShieldAlt className="w-4 h-4" />
                  INITIALIZE HOST ACCESS
                </>
              )}
            </span>
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
          <p className="text-xs text-green-400 font-mono">
            🔐 SECURE CONNECTION ESTABLISHED
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Host credentials required for system access
          </p>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-400 hover:text-white transition-colors underline"
          >
            Back to Standard Login
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default HostLogin;
