import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Key, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // When the user clicks the link in their email, Supabase redirects here 
    // with an access token in the URL hash, which establishes a session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Invalid or expired reset link. Please try again.');
        navigate('/forgot-password');
      } else {
        setSessionChecked(true);
      }
    });
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      // Clear the force_password_reset flag if applicable
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ force_password_reset: false }).eq('id', user.id);
      }
      
      toast.success('Password successfully reset! You can now log in.');
      // Sign out so they can log in normally, or redirect to dashboard
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-navy">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="text-center mb-10 relative z-10">
          <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Quant-AI Logo" className="w-24 h-24 object-contain rounded-2xl shadow-lg border border-white/10 bg-brand-surface/50" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Set New Password</h1>
          <p className="text-gray-400">Please enter a new, secure password</p>
        </div>

        <div className="glass-card p-8 shadow-2xl relative z-10">
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-brand-border rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-brand-border rounded-xl bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary focus:ring-offset-brand-navy transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
