import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('global_support_notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'support_messages',
        filter: isSuperAdmin ? undefined : `user_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.sender_id === user.id) return;
        if (location.pathname === '/support') return;

        toast('New support message received', {
          icon: '💬',
          style: { background: '#1e88e5', color: '#fff' },
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isSuperAdmin, location.pathname]);

  return (
    <div className="flex h-screen bg-brand-navy overflow-hidden">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
