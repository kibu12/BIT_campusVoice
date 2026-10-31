import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  AudioLines, MessageSquare, Map, Headphones, Phone, 
  Sparkles, ArrowRight, Bot, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, isAdmin } = useAuth();

  const navItems = [
    {
      name: 'AI Assistant',
      path: '/chat',
      icon: MessageSquare,
      activeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50'
    },
    {
      name: 'Campus Map',
      path: '/map',
      icon: Map,
      activeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-100 dark:border-blue-900/50'
    },
    {
      name: 'Helpdesk',
      path: '/report',
      icon: Headphones,
      activeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50'
    },
    {
      name: 'SOS & Directory',
      path: '/contacts',
      icon: Phone,
      activeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-100 dark:border-rose-900/50'
    },
    ...(isAdmin ? [{
      name: 'Command Center',
      path: '/admin',
      icon: ShieldCheck,
      activeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50'
    }] : []),
  ];

  const currentPath = location.pathname;

  // Contextual helper card at bottom of sidebar matching design mockup
  const getHelperWidget = () => {
    if (currentPath === '/map') {
      return (
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/70 to-indigo-50/50 dark:from-zinc-900 dark:to-zinc-900/80 border border-blue-100/80 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0">
              <img 
                src="/images/student_mascot_avatar.jpg" 
                alt="Campus Guide" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = '/images/student_mascot_full.jpg'; }}
              />
            </div>
            <div className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 leading-tight">
              Need directions? I can help you find places on campus!
            </div>
          </div>
          <button 
            onClick={() => navigate('/chat')}
            className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles size={12} />
            <span>Ask Me</span>
          </button>
        </div>
      );
    }

    if (currentPath === '/report' || currentPath === '/helpdesk') {
      return (
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-blue-50/50 dark:from-zinc-900 dark:to-zinc-900/80 border border-indigo-100/80 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0">
              <img 
                src="/images/student_mascot_avatar.jpg" 
                alt="Support Companion" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = '/images/student_mascot_full.jpg'; }}
              />
            </div>
            <div className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 leading-tight">
              Can't find what you need? Talk to me, I'm here to help!
            </div>
          </div>
          <button 
            onClick={() => navigate('/chat')}
            className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Chat Now</span>
            <ArrowRight size={12} />
          </button>
        </div>
      );
    }

    if (currentPath === '/contacts' || currentPath === '/emergency') {
      return (
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-rose-50/70 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-900/80 border border-rose-100/80 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0">
              <img 
                src="/images/student_mascot_avatar.jpg" 
                alt="Contact Assistant" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = '/images/student_mascot_full.jpg'; }}
              />
            </div>
            <div className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 leading-tight">
              Need any contact info? I can help connect you!
            </div>
          </div>
          <button 
            onClick={() => navigate('/chat')}
            className="w-full py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Ask Me</span>
            <ArrowRight size={12} />
          </button>
        </div>
      );
    }

    // Default Home / Chat sidebar widget
    return (
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border border-blue-100/80 dark:border-zinc-800 space-y-2.5 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden bg-white dark:bg-zinc-800 p-1 shadow-xs border border-blue-100 dark:border-zinc-700 flex items-center justify-center">
          <img 
            src="/images/campus_satellite_view.jpg" 
            alt="BIT Campus" 
            className="w-full h-full object-cover rounded-xl"
            onError={(e) => { e.target.src = '/images/student_mascot_avatar.jpg'; }}
          />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
            Welcome to BIT!
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
            Your smart companion for everything on campus.
          </p>
        </div>
        <button 
          onClick={() => navigate('/map')}
          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Explore Campus</span>
          <ArrowRight size={12} />
        </button>
      </div>
    );
  };

  return (
    <>
      {/* 1. Fixed Left Sidebar (Anchored to viewport - 100% stable on scroll) */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 xl:w-72 h-screen flex-col justify-between p-4 border-r border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#09090B] z-30 select-none overflow-y-auto custom-scrollbar">
        
        <div className="space-y-6">
          {/* Brand Header */}
          <Link to="/chat" className="flex items-center gap-3 px-2 py-1 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <AudioLines size={19} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight flex items-center gap-1.5">
                CAMPUS VOICE
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold tracking-tight truncate">
                BIT Interactive Companion
              </span>
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || 
                (item.path === '/chat' && currentPath === '/') ||
                (item.path === '/report' && currentPath === '/helpdesk') ||
                (item.path === '/contacts' && currentPath === '/emergency');

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100/90 dark:border-indigo-900/60 shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-900/70'
                  }`}
                >
                  <Icon 
                    size={18} 
                    className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'} 
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Contextual Mascot/Promo Card */}
        <div className="pt-2">
          {getHelperWidget()}
        </div>

      </aside>

      {/* 2. Invisible Layout Spacer (Preserves grid width without overlap) */}
      <div className="hidden lg:block w-64 xl:w-72 shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  );
};

export default Sidebar;
