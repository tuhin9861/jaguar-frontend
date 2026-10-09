import axios from 'axios';
import { useNavigate, Link } from "react-router-dom";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, EyeOff, Eye, KeyRound, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

// Import the background image (same as Login)
import wallBg from '../../assets/wall2.png';
import evioLogo from '../../assets/image.png';

const API_BASE = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const ForgotPassword = () => {
  const navigate = useNavigate();

  // 1 = enter email, 2 = enter otp, 3 = set new password, 4 = done
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_BASE}auth/forgot-password`, { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_BASE}auth/verify-reset-otp`, { email, otp });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}auth/reset-password`, {
        email,
        otp,
        new_password: newPassword,
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden relative">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${wallBg})` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md bg-white border border-white rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.25)] p-6 sm:p-8 z-10"
      >
        <div className="text-center mb-6 sm:mb-8">
          <img
            src={evioLogo}
            alt="EVIO Elevator Logo"
            className="h-12 sm:h-16 w-auto mx-auto object-contain mb-3 sm:mb-4"
          />
          <p className="text-slate-500 mt-1 sm:mt-2 text-xs sm:text-sm font-medium uppercase tracking-widest">
            {step === 1 && 'Reset Your Password'}
            {step === 2 && 'Enter Verification Code'}
            {step === 3 && 'Choose New Password'}
            {step === 4 && 'Password Reset'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOtp}
              className="space-y-4 sm:space-y-5"
            >
              <p className="text-sm text-slate-500 font-medium text-center">
                Enter your account email and we'll send you a one-time code to reset your password.
              </p>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400 group-focus-within:text-[#DF173C] transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                  placeholder="email@example.com"
                />
              </div>

              {error && <p className="text-xs sm:text-sm font-semibold text-red-500 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl bg-[#d81362] text-white font-bold text-base sm:text-lg shadow-[0_10px_20px_rgba(223,23,60,0.3)] hover:bg-[#B81331] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Code'}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 pt-1"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </motion.form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-4 sm:space-y-5"
            >
              <p className="text-sm text-slate-500 font-medium text-center">
                We've sent a code to <span className="font-bold text-slate-700">{email}</span>. Enter it below.
              </p>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound size={18} className="text-slate-400 group-focus-within:text-[#DF173C] transition-colors" />
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium tracking-widest"
                  placeholder="Enter OTP"
                />
              </div>

              {error && <p className="text-xs sm:text-sm font-semibold text-red-500 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl bg-[#d81362] text-white font-bold text-base sm:text-lg shadow-[0_10px_20px_rgba(223,23,60,0.3)] hover:bg-[#B81331] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 pt-1"
              >
                <ArrowLeft size={14} /> Use a different email
              </button>
            </motion.form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleResetPassword}
              className="space-y-4 sm:space-y-5"
            >
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400 group-focus-within:text-[#DF173C] transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="block w-full pl-11 pr-11 py-3 sm:py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400 group-focus-within:text-[#DF173C] transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                  placeholder="Confirm new password"
                />
              </div>

              {error && <p className="text-xs sm:text-sm font-semibold text-red-500 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl bg-[#d81362] text-white font-bold text-base sm:text-lg shadow-[0_10px_20px_rgba(223,23,60,0.3)] hover:bg-[#B81331] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
              </button>
            </motion.form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <p className="text-sm text-slate-600 font-medium">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 sm:py-4 rounded-xl bg-[#d81362] text-white font-bold text-base sm:text-lg shadow-[0_10px_20px_rgba(223,23,60,0.3)] hover:bg-[#B81331] active:scale-[0.98] transition-all"
              >
                Back to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;