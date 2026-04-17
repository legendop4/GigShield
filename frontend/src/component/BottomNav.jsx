import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Wallet, History, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
  const { user } = useAuth();

  const tabs = [
    { name: 'Protection', icon: Shield, path: '/dashboard' },
    { name: 'Payouts', icon: Wallet, path: '/payouts' },
    { name: 'History', icon: History, path: '/history' },
    { name: 'Profile', icon: UserIcon, path: '/profile' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[388px] bg-navy-900 rounded-2xl shadow-2xl p-2 flex items-center justify-between z-50">
        {tabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 flex-1 py-1 rounded-xl transition-all ${isActive ? 'bg-slate-800 text-white shadow-inner scale-95' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-tight uppercase">{tab.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-gradient text-white shadow-2xl sticky top-0 h-screen z-50 p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-emerald/10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Shield className="text-emerald w-6 h-6 border-0" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-none">GigShield</span>
            <span className="text-[10px] text-emerald font-bold tracking-widest uppercase">AI Panel</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${isActive ? 'bg-emerald/10 text-emerald shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} className={isActive ? 'text-emerald' : 'text-slate-400'} />
                  <span className="tracking-wide">{tab.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Profile Section at Bottom */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shadow-soft shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-sm leading-tight block truncate">{user?.name || 'Verified Worker'}</span>
              <span className="text-[10px] text-slate-400 font-medium truncate">{user?.phone}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default BottomNav;
