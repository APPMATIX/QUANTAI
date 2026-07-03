import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Role } from '../types/app';
import type { User as AuthUser, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [company, setCompany] = useState<any>(null); // We will define proper type later or use any
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // Listen for manual profile/company updates
    const handleProfileUpdate = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session);
      });
    };
    window.addEventListener('profile_updated', handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile_updated', handleProfileUpdate);
    };
  }, []);

  const handleSession = async (session: Session | null) => {
    setAuthUser(session?.user ?? null);
    
    if (session?.user) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!error && data) {
        setProfile(data as User);
        
        // Fetch company details if user belongs to a company
        if (data.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('name, logo_url, company_code')
            .eq('id', data.company_id)
            .single();
            
          if (!companyError && companyData) {
            setCompany(companyData);
          }
        }
      }
    } else {
      setProfile(null);
      setCompany(null);
    }
    
    setIsLoading(false);
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    handleSession(session);
  };

  return {
    user: authUser,
    profile,
    company,
    role: profile?.role as Role | undefined,
    isLoading,
    refreshSession
  };
}
