import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { LogOut, User, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { profile, company } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-brand-border bg-brand-navy/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 md:gap-4">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
           <span className="text-xl font-bold text-white hidden sm:block">Quant-AI</span>
           {company?.name && (
             <>
               <span className="text-gray-500 hidden sm:block">|</span>
               {company.logo_url && (
                 <img src={company.logo_url} alt="Company Logo" className="w-6 h-6 object-contain rounded bg-white/10" />
               )}
               <span className="text-lg text-gray-300 font-medium truncate max-w-[120px] sm:max-w-xs">{company.name}</span>
             </>
           )}
        </div>
        <div className="h-6 w-px bg-brand-border mx-1 hidden sm:block"></div>
        <h2 className="text-sm font-medium text-gray-400 hidden sm:block">
          Welcome back, {profile?.name?.split(' ')[0] || 'User'}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full border border-brand-navy"></span>
        </button>
        
        <div className="h-8 w-px bg-brand-border mx-2"></div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-white">{profile?.name || 'Loading...'}</span>
            <span className="text-xs text-brand-primary capitalize px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
              {profile?.role?.replace('_', ' ') || 'User'}
            </span>
          </div>
          
          <div 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center cursor-pointer hover:border-brand-primary transition-colors overflow-hidden"
            title="Profile Settings"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors sm:ml-2"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
