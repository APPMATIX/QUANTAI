import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Building2, Camera, Loader2, Save, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CompanySettingsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { data: companyData, isLoading } = useQuery({
    queryKey: ['companySettings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  useEffect(() => {
    if (companyData) {
      setName(companyData.name || '');
      setContactPerson(companyData.contact_person || '');
      setEmail(companyData.email || '');
      setMobileNumber(companyData.mobile_number || '');
      setAddress(companyData.address || '');
      setCity(companyData.city || '');
      setState(companyData.state || '');
      setCountry(companyData.country || '');
      setLogoUrl(companyData.logo_url || null);
    }
  }, [companyData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('No company ID');
      
      const { error } = await supabase
        .from('companies')
        .update({
          name,
          contact_person: contactPerson,
          email,
          mobile_number: mobileNumber,
          address,
          city,
          state,
          country
        })
        .eq('id', profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Company settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      // Update global context seamlessly
      window.dispatchEvent(new Event('profile_updated'));
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update company settings');
    }
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.company_id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.company_id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      // Update company record
      const newLogoUrl = `${publicUrl}?t=${new Date().getTime()}`;
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: newLogoUrl })
        .eq('id', profile.company_id);

      if (updateError) throw updateError;

      setLogoUrl(newLogoUrl);
      toast.success('Company logo updated');
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      
      // Update global context seamlessly
      window.dispatchEvent(new Event('profile_updated'));
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Company Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your company profile and branding.</p>
      </div>

      <div className="glass-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Company Logo</h3>
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-40 h-40 rounded-xl overflow-hidden border-2 border-brand-primary/20 bg-brand-navy flex items-center justify-center p-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Building2 className="w-16 h-16 text-brand-primary/50" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <p className="text-xs text-gray-500 text-center max-w-[160px]">
              Recommended size: 512x512px. Transparent background preferred.
            </p>
          </div>

          {/* Form Section */}
          <form 
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="flex-1 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Contact Person</label>
                <div className="relative">
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
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
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-400">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Company Details
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
