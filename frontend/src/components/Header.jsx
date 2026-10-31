import React, { useState } from 'react';
import { 
  Bell, Sun, Moon, LogOut, ChevronDown, User, ShieldCheck, 
  Menu, Sparkles, X, MessageSquare, AlertTriangle, Phone, Map
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Header = ({ title, subtitle, customActions }) => {
  const { user, logout, isGuest, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const notifications = [
    { id: 1, title: 'Workshop on AI & Data Science', time: 'Today • 24 May 2025', unread: true },
    { id: 2, title: 'Campus Wi-Fi Maintenance Completed', time: 'Yesterday', unread: false },
    { id: 3, title: 'Library Timings Extended for Exams', time: '2 days ago', unread: false },
  ];

  return (
    <>
      <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-md flex items-center justify-between z-20 shrink-0 sticky top-0">
        
        {/* Left Title / Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Open mobile menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Custom Actions, Notifications, User Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {customActions && (
            <div className="hidden md:flex items-center">
              {customActions}
            </div>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200/60 dark:border-blue-800/40 transition-colors shadow-2xs"
              title="Admin Command Center"
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">Command Center</span>
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl p-3 z-50 animate-in fade-in space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Campus Alerts</span>
                  <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">Mark all read</span>
                </div>
                <div className="space-y-1.5">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs">
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                        <span>{n.title}</span>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <div 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 sm:gap-2.5 pl-1.5 pr-2 py-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
            >
              {/* Simple First Letter Profile Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0 select-none ring-2 ring-blue-500/20">
                <span>{(user?.name || 'S').trim().charAt(0).toUpperCase()}</span>
              </div>
              
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                  {user?.name || 'Sarathy'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium capitalize">
                  {user?.role === 'admin' ? 'Administrator' : isGuest ? 'Guest' : 'Student'}
                </span>
              </div>

              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl p-1.5 z-50 animate-in fade-in space-y-1 text-xs">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    <span>{(user?.name || 'S').trim().charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-zinc-100 truncate">{user?.name || 'Student'}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user?.email || (user?.roll ? `${user.roll.toLowerCase()}@bitsathy.ac.in` : '')}</div>
                  </div>
                </div>

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setShowDropdown(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors text-left font-bold"
                  >
                    <ShieldCheck size={14} />
                    <span>Admin Command Center</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-zinc-950 h-full p-4 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Sparkles size={16} />
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">CAMPUS VOICE</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1">
                {[
                  { name: 'AI Assistant', path: '/chat', icon: MessageSquare },
                  { name: 'Campus Map', path: '/map', icon: Map },
                  { name: 'Helpdesk', path: '/report', icon: Headphones },
                  { name: 'SOS & Directory', path: '/contacts', icon: Phone },
                  ...(isAdmin ? [{ name: 'Command Center', path: '/admin', icon: ShieldCheck }] : []),
                ].map((l) => (
                  <Link
                    key={l.name}
                    to={l.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900"
                  >
                    <l.icon size={16} className="text-blue-600" />
                    <span>{l.name}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
