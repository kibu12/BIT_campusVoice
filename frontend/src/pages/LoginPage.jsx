import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, User, Mail, ArrowRight, AudioLines, 
  ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { apiCall } from '../services/api';

const LoginPage = () => {
  const [authTab, setAuthTab] = useState('student'); // 'student' | 'guest' | 'admin'
  const { login, loginAsGuest, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Institutional Google / Student Form
  const [googleEmail, setGoogleEmail] = useState('');
  const [studentName, setStudentName] = useState('');

  // Guest Form
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  // Admin Form (blank initial states to prevent credential prefill vulnerabilities)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;
  if (isAuthenticated) return <Navigate to="/chat" replace />;

  const handleInstitutionalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = googleEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please provide your official @bitsathy.ac.in email address.');
      return;
    }

    if (!cleanEmail.endsWith('@bitsathy.ac.in')) {
      setError('Access restricted: Only official institutional accounts ending with @bitsathy.ac.in are permitted.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ 
          email: cleanEmail,
          name: studentName.trim()
        }),
      });

      login({ 
        id: data.user_id,
        name: data.name || studentName.trim() || cleanEmail.split('@')[0], 
        role: data.role || 'student', 
        email: cleanEmail, 
        isVerified: true
      }, data.access_token);

      navigate('/chat');
    } catch (err) {
      console.error("Institutional login failed:", err);
      setError(err.message || 'Authentication failed. Please verify your @bitsathy.ac.in credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const cleanEmail = guestEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.endsWith('@bitsathy.ac.in')) {
      setError('Institutional domain policy: Guest access requires an authorized @bitsathy.ac.in email.');
      return;
    }

    setLoading(true);
    const guestDisplayName = guestName.trim() || 'Institutional Guest';
    try {
      const data = await apiCall('/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ name: guestDisplayName, email: cleanEmail }),
      });
      loginAsGuest({ 
        id: data.user_id,
        name: guestDisplayName, 
        email: cleanEmail,
        isGuest: true, 
        role: 'guest',
        isVerified: false 
      }, data.access_token);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Guest authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      login({ 
        id: 0,
        name: 'Administrator', 
        role: 'admin', 
        username: username.trim(),
        isVerified: true
      }, data.access_token);
      navigate('/admin');
    } catch (err) {
      console.error("Admin login failed:", err);
      setError(err.message || 'Invalid administrator credentials or account locked.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#09090B] transition-colors">
      <div className="w-full max-w-md space-y-5 animate-in fade-in duration-200">
        
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xs">
            <AudioLines size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
              Campus Voice
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              Bannari Amman Institute of Technology
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div className="clean-card p-6 sm:p-7 space-y-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm">
          
          {/* Tab Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold">
            <button
              onClick={() => { setAuthTab('student'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                authTab === 'student'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              Institutional
            </button>
            <button
              onClick={() => { setAuthTab('guest'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                authTab === 'guest'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              Guest
            </button>
            <button
              onClick={() => { setAuthTab('admin'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                authTab === 'admin'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Institutional Student/Faculty Tab */}
          {authTab === 'student' && (
            <form onSubmit={handleInstitutionalSubmit} className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    required
                    placeholder="e.g. 7376232ad110@bitsathy.ac.in"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Must be your official Google Account ending in @bitsathy.ac.in
                </p>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Your official name"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm gap-2 shadow-xs mt-2 cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating with BIT Domain...' : 'Sign In with Institutional Account'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Guest Tab */}
          {authTab === 'guest' && (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Sparkles size={14} />
                  <span>Institutional Visitor Access</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Campus visitors and guests must register with an authorized institutional sponsor email address.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Visitor Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    placeholder="visitor@bitsathy.ac.in"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Visitor Name (Optional)
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Guest Visitor"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm gap-2 shadow-xs cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Validating...' : 'Continue as Guest'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Admin Tab */}
          {authTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Administrator Username
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Admin username"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm gap-2 shadow-xs cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating with Argon2id...' : 'Sign In as Admin'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-blue-600" />
          <span>Official BIT Institutional Authentication Gateway</span>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
