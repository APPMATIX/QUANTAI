import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, Mail, MessageSquare, ShieldCheck, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SupportMessage {
  id: string;
  user_id: string;
  sender_id: string;
  message: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

export default function SupportPage() {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [userList, setUserList] = useState<{id: string, name: string, last_msg: string, unread: number}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // For image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    if (!user) return;
    
    if (isSuperAdmin) {
      fetchUsersList();
    } else {
      setActiveUser(user.id);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!user || !activeUser) return;
    fetchMessages(activeUser);

    const channel = supabase
      .channel('support_messages_page')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'support_messages', 
        filter: isSuperAdmin ? undefined : `user_id=eq.${user.id}` 
      }, (payload) => {
        const newMsg = payload.new as SupportMessage;
        
        if (isSuperAdmin) {
          if (newMsg.user_id === activeUser) {
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();
          }
          fetchUsersList();
        } else {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeUser, isSuperAdmin]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchUsersList = async () => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('user_id, message, is_read, sender_id')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') setDbError(true);
        throw error;
      }

      const userIds = Array.from(new Set(data?.map(m => m.user_id) || []));
      
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      const userMap = new Map(usersData?.map(u => [u.id, u.name]) || []);

      const uniqueUsers = new Map();
      data?.forEach(row => {
        if (!uniqueUsers.has(row.user_id)) {
          uniqueUsers.set(row.user_id, {
            id: row.user_id,
            name: userMap.get(row.user_id) || 'Unknown User',
            last_msg: row.message || 'Sent an attachment',
            unread: (!row.is_read && row.sender_id === row.user_id) ? 1 : 0
          });
        } else {
          if (!row.is_read && row.sender_id === row.user_id) {
            uniqueUsers.get(row.user_id).unread += 1;
          }
        }
      });

      setUserList(Array.from(uniqueUsers.values()));
      
      if (!activeUser && uniqueUsers.size > 0) {
        setActiveUser(Array.from(uniqueUsers.keys())[0]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (targetUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') setDbError(true);
        throw error;
      }
      setMessages(data || []);
      scrollToBottom();

      // Mark as read if admin is viewing
      if (isSuperAdmin && data?.some(m => !m.is_read && m.sender_id === targetUserId)) {
        await supabase
          .from('support_messages')
          .update({ is_read: true })
          .eq('user_id', targetUserId)
          .eq('sender_id', targetUserId);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('support-attachments')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('support-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !user || !activeUser) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    
    let imageUrl = null;
    const fileToUpload = selectedImage;
    setSelectedImage(null);

    if (fileToUpload) {
      setUploadingImage(true);
      try {
        imageUrl = await uploadImage(fileToUpload);
      } catch (err) {
        console.error("Image upload failed:", err);
        toast.error("Failed to upload image. Storage bucket may not exist.");
        setUploadingImage(false);
        setNewMessage(msgText);
        return;
      }
      setUploadingImage(false);
    }

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: activeUser, // The thread owner
          sender_id: user.id,  // The person sending (could be user or admin)
          message: msgText,
          image_url: imageUrl
        });

      if (error) throw error;
      
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        user_id: activeUser,
        sender_id: user.id,
        message: msgText,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        is_read: false
      }]);
      scrollToBottom();
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.code === '42P01') setDbError(true);
      else toast.error("Failed to send message.");
      setNewMessage(msgText);
      if (fileToUpload) setSelectedImage(fileToUpload);
    }
  };

  if (dbError) {
    return (
      <div className="max-w-4xl mx-auto pb-12 p-6">
        <div className="glass-card border border-red-500/30 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-red-400 font-bold text-lg mb-2">Database Setup Required</h3>
              <p className="text-gray-300 text-sm mb-4">
                The support messenger requires a new database table and storage bucket. Please run this SQL in your Supabase SQL Editor:
              </p>
              <pre className="bg-brand-surface border border-white/10 p-4 rounded-xl overflow-x-auto text-xs text-gray-300 font-mono shadow-sm">
{`-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own msgs" ON public.support_messages FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Users insert own msgs" ON public.support_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admins update msgs" ON public.support_messages FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', true) ON CONFLICT DO NOTHING;
CREATE POLICY "All view attach" ON storage.objects FOR SELECT USING (bucket_id = 'support-attachments');
CREATE POLICY "Auth upload attach" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex flex-col pt-4">
      <div className="mb-4 px-4 sm:px-0">
        <h1 className="text-2xl font-bold text-white mb-1">Support & Issues</h1>
        <p className="text-gray-400 text-sm">
          Need help? Send us a message below or email us directly at{' '}
          <a href="mailto:info@appmatixsolutions.com" className="text-brand-primary font-semibold hover:text-brand-accent transition-colors">
            info@appmatixsolutions.com
          </a>
        </p>
      </div>

      <div className="flex-1 glass-card border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row rounded-3xl mx-4 sm:mx-0">
        
        {/* Admin Inbox Sidebar */}
        {isSuperAdmin && (
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-brand-surface/50">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Inbox</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {userList.map(u => (
                <button
                  key={u.id}
                  onClick={() => setActiveUser(u.id)}
                  className={`w-full text-left p-4 border-b border-white/5 transition-colors ${activeUser === u.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-white truncate">{u.name}</span>
                    {u.unread > 0 && (
                      <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-primary/80 font-mono tracking-wider">#TCKT-{u.id.substring(0,6).toUpperCase()}</span>
                    <p className="text-xs text-gray-400 truncate ml-2 text-right">{u.last_msg}</p>
                  </div>
                </button>
              ))}
              {userList.length === 0 && !loading && (
                <div className="p-8 text-center text-gray-500 text-sm">No active tickets.</div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-brand-surface/20 relative">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center gap-3 backdrop-blur-md">
            <div className="w-10 h-10 bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center border border-brand-primary/30 shadow-[0_0_15px_rgba(30,136,229,0.3)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Quant-AI Support</h3>
              <p className="text-xs text-gray-400">We typically reply within a few hours</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Mail className="w-12 h-12 mb-4 text-gray-600" />
                <p>No messages yet. How can we help you today?</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-3 ${isMe ? 'bg-brand-primary text-white rounded-tr-sm shadow-[0_4px_15px_rgba(30,136,229,0.3)]' : 'bg-brand-surface border border-white/10 text-gray-200 rounded-tl-sm shadow-sm'}`}>
                      {msg.image_url && (
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                          <img src={msg.image_url} alt="Attachment" className="max-w-full rounded-lg mb-2 border border-white/20" />
                        </a>
                      )}
                      {msg.message && (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      )}
                      <p className={`text-[10px] mt-1.5 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview Area */}
          {selectedImage && (
            <div className="px-6 py-3 bg-brand-surface/80 border-t border-white/10 flex items-center gap-3">
              <div className="relative inline-block">
                <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="h-16 rounded border border-brand-primary/50" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-gray-400 truncate flex-1">{selectedImage.name}</span>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-brand-surface border-t border-white/10 rounded-b-3xl">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3 relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-colors shrink-0"
                title="Attach an image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white/10 resize-none transition-all placeholder:text-gray-500"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              
              <button
                type="submit"
                disabled={(!newMessage.trim() && !selectedImage) || uploadingImage}
                className="w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shrink-0 hover:bg-brand-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(30,136,229,0.3)]"
              >
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 ml-1" />
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
