import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { User, Camera, Mail, Phone, Building, Shield, Key, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettingsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isUploading, setIsUploading] = useState(false);

  // Profile Form State
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [mobileNumber, setMobileNumber] = useState(profile?.mobile_number || '');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('users')
        .update({
          name,
          mobile_number: mobileNumber
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      // Update email if changed
      if (email !== profile.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      if (email !== profile?.email) {
        toast('Please check your new email for a confirmation link.');
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      window.dispatchEvent(new Event('profile_updated'));
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile');
    }
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: `${publicUrl}?t=${new Date().getTime()}` }) // cache buster
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success('Profile picture updated');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      window.dispatchEvent(new Event('profile_updated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      // Update force_password_reset if needed
      if (profile?.force_password_reset) {
        await supabase.from('users').update({ force_password_reset: false }).eq('id', profile.id);
      }

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your personal information and security preferences.</p>
      </div>

      <div className="flex gap-4 border-b border-brand-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'profile' 
              ? 'text-brand-primary border-b-2 border-brand-primary' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Profile Information
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'security' 
              ? 'text-brand-primary border-b-2 border-brand-primary' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="glass-card p-6 md:p-8 animate-in fade-in">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-brand-primary/20 bg-brand-navy flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-brand-primary/50" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="text-center">
                <h3 className="text-white font-medium">{profile.name}</h3>
                <p className="text-sm text-gray-400 capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Form Section */}
            <form 
              onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(); }}
              className="flex-1 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                {/* Read Only Fields */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Company / Organization</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={profile.company_id ? 'Assigned' : 'N/A'}
                      disabled
                      className="w-full pl-10 pr-4 py-2 bg-black/10 border border-brand-border rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="glass-card p-6 md:p-8 max-w-2xl animate-in fade-in">
          <div className="mb-6 pb-6 border-b border-brand-border">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-primary" /> Password Settings
            </h2>
            <p className="text-sm text-gray-400 mt-1">Ensure your account is using a long, random password to stay secure.</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Current Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                  placeholder="Enter current password"
                />
              </div>
              <p className="text-xs text-gray-500">(Required for verification depending on policy)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                  placeholder="New password (min 6 characters)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Confirm New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
