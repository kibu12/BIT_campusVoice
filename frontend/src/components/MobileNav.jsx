import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Bot, Map, Headphones, Phone, Sparkles } from 'lucide-react';

const MobileNav = ({ onOpenVoiceAssistant }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { name: 'Home', path: '/chat', icon: Home },
    { 
      name: 'AI Voice', 
      isAction: true, 
      action: onOpenVoiceAssistant, 
      icon: Bot,
      highlight: true
    },
    { name: 'Map', path: '/map', icon: Map },
    { name: 'Helpdesk', path: '/report', icon: Headphones },
    { name: 'SOS', path: '/contacts', icon: Phone },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || 
          (item.path === '/chat' && currentPath === '/') ||
          (item.path === '/report' && currentPath === '/helpdesk') ||
          (item.path === '/contacts' && currentPath === '/emergency');

        if (item.isAction) {
          return (
            <button
              key={item.name}
              onClick={item.action}
              className="flex flex-col items-center justify-center p-1 -mt-5 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-active:scale-95 transition-transform">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                {item.name}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Icon size={19} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
            <span className="text-[10px] mt-0.5">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
