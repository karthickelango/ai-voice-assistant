import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  KeyRound,
  Mic,
  MapPin,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  requestMicrophoneAccess,
  requestLocationAccess,
  checkCurrentPermissions,
} from '../services/permissionService.ts';

interface LoginPageProps {
  onLoginSuccess: (user: { username: string }) => void;
}

type LoginStep = 'credentials' | 'requesting_permissions' | 'permissions_summary';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Staged permissions tracking
  const [micStatus, setMicStatus] = useState<'pending' | 'requesting' | 'granted' | 'denied'>('pending');
  const [locStatus, setLocStatus] = useState<'pending' | 'requesting' | 'granted' | 'denied'>('pending');
  const [activeUser, setActiveUser] = useState<string>('Assistant_AI');

  const executePermissionPrompts = async (targetUser: string) => {
    setStep('requesting_permissions');
    setActiveUser(targetUser);

    // Check initial state if already granted in this browser
    const initialPerms = await checkCurrentPermissions();
    if (initialPerms.microphone === 'granted') setMicStatus('granted');
    if (initialPerms.location === 'granted') setLocStatus('granted');

    // 1. Trigger Microphone Access prompt
    setMicStatus('requesting');
    const micGranted = await requestMicrophoneAccess();
    setMicStatus(micGranted ? 'granted' : 'denied');

    // Small delay to let browser modal transition comfortably
    await new Promise((r) => setTimeout(r, 400));

    // 2. Trigger Location Access prompt
    setLocStatus('requesting');
    const locGranted = await requestLocationAccess();
    setLocStatus(locGranted ? 'granted' : 'denied');

    // Complete transition to assistant
    setStep('permissions_summary');

    // Automatically transition to assistant after 1.2s or allow user to click
    setTimeout(() => {
      completeLogin(targetUser);
    }, 1400);
  };

  const completeLogin = (userName: string) => {
    const authData = {
      username: userName,
      token: 'authenticated',
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('thruv_auth', JSON.stringify(authData));
    } catch {
      // ignore
    }
    onLoginSuccess({ username: userName });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Call backend auth API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const validatedUser = data.user?.username || trimmedUser;
        // Proceed immediately to asking for Microphone and Location access
        await executePermissionPrompts(validatedUser);
      } else {
        setErrorMessage(data.error || 'Invalid credentials. Access denied.');
        setIsLoading(false);
      }
    } catch (err) {
      // Fallback local verification in case of network edge case
      if (trimmedUser === 'Assistant_AI' && trimmedPass === 'Thruv@2023') {
        await executePermissionPrompts('Assistant_AI');
      } else {
        setErrorMessage('Authentication failed. Please verify credentials.');
        setIsLoading(false);
      }
    }
  };

  const handleAutofill = () => {
    setUsername('Assistant_AI');
    setPassword('Thruv@2023');
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 z-20 select-none">
      {/* Centered Futuristic Terminal Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#070b16]/90 backdrop-blur-2xl p-8 shadow-[0_0_50px_-10px_rgba(6,182,212,0.2)]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header & Emblem */}
          <div className="relative flex flex-col items-center text-center mb-6">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="absolute w-16 h-16 rounded-full border border-cyan-400/30 animate-ping opacity-25" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-indigo-950/40 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                {step === 'credentials' ? (
                  <Lock className="w-6 h-6 text-cyan-300" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-cyan-300" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-xl font-bold tracking-[0.25em] uppercase text-white font-mono">
                Karthick AI
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                Thruv v2.2
              </span>
            </div>

            <p className="text-xs text-white/50 font-mono tracking-wide max-w-xs">
              {step === 'credentials'
                ? 'Voice Assistant Terminal • Secure Authentication Portal'
                : 'Authentication Verified • Requesting System Access'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'credentials' ? (
              /* Step 1: Login Form */
              <motion.form
                key="credentials-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSubmit}
                className="space-y-5 relative"
              >
                {/* Error Message */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs font-mono"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Username Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-username"
                    className="block text-[11px] font-mono uppercase tracking-wider text-cyan-300/80"
                  >
                    User Name
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-white/40 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Assistant_AI"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-cyan-400/70 focus:bg-cyan-950/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-white/25 text-sm font-mono tracking-wide transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-mono uppercase tracking-wider text-cyan-300/80"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-white/40 pointer-events-none">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••••"
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-cyan-400/70 focus:bg-cyan-950/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-white/25 text-sm font-mono tracking-wide transition-all"
                      required
                    />
                    <button
                      type="button"
                      id="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-white/40 hover:text-white/80 p-1 rounded-md transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full group mt-2 relative py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-400 hover:from-cyan-400 hover:to-sky-400 text-[#050811] font-bold text-sm tracking-wider uppercase font-mono shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-[#050811] border-t-transparent animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authenticate & Unlock</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* Autofill Helper */}
                {/* <div className="pt-2 flex flex-col items-center">
                  <button
                    type="button"
                    id="btn-autofill-credentials"
                    onClick={handleAutofill}
                    className="text-[11px] font-mono text-cyan-400/70 hover:text-cyan-300 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-950/60 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    <span>Auto-fill Demo Credentials (Assistant_AI)</span>
                  </button>
                </div> */}
              </motion.form>
            ) : (
              /* Step 2: System Permissions Authorization Screen */
              <motion.div
                key="permissions-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 py-2"
              >
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-200 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Requesting browser permissions for voice & location...</span>
                </div>

                {/* Microphone Permission Status Card */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        micStatus === 'granted'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : micStatus === 'requesting'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                          : 'bg-white/[0.05] border-white/10 text-white/50'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Microphone Access
                      </div>
                      <div className="text-[11px] font-mono text-white/40">
                        Speech commands & "Hey Thruv" detection
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-mono">
                    {micStatus === 'requesting' && (
                      <span className="text-cyan-300 flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Prompting...
                      </span>
                    )}
                    {micStatus === 'granted' && (
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Granted
                      </span>
                    )}
                    {micStatus === 'denied' && (
                      <span className="text-amber-400/80 text-[11px]">Dismissed</span>
                    )}
                    {micStatus === 'pending' && (
                      <span className="text-white/30 text-[11px]">Waiting...</span>
                    )}
                  </div>
                </div>

                {/* Location Permission Status Card */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        locStatus === 'granted'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : locStatus === 'requesting'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                          : 'bg-white/[0.05] border-white/10 text-white/50'
                      }`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Location Access
                      </div>
                      <div className="text-[11px] font-mono text-white/40">
                        Live weather forecasts & local context
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-mono">
                    {locStatus === 'requesting' && (
                      <span className="text-cyan-300 flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Prompting...
                      </span>
                    )}
                    {locStatus === 'granted' && (
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Granted
                      </span>
                    )}
                    {locStatus === 'denied' && (
                      <span className="text-amber-400/80 text-[11px]">Dismissed</span>
                    )}
                    {locStatus === 'pending' && (
                      <span className="text-white/30 text-[11px]">Waiting...</span>
                    )}
                  </div>
                </div>

                {/* Immediate Continue Button */}
                <div className="pt-2">
                  <button
                    id="btn-continue-to-assistant"
                    type="button"
                    onClick={() => completeLogin(activeUser)}
                    className="w-full py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  >
                    <span>Enter Voice Assistant</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-white/30">
            <span>SECURE TERMINAL</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {step === 'credentials' ? 'AWAITING LOGIN' : 'CONFIGURING SENSORS'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
