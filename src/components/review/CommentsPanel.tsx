import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare, X, Send, CheckCircle2, User } from 'lucide-react';
import toast from 'react-hot-toast';

type Comment = {
  id: string;
  project_id: string;
  element_id: string;
  element_type: string;
  user_id: string;
  comment: string;
  is_resolved: boolean;
  created_at: string;
  users: {
    first_name: string;
    last_name: string;
    role: string;
  };
};

interface CommentsPanelProps {
  projectId: string;
  elementId: string;
  elementType: 'structural' | 'architectural';
  elementName: string;
  onClose: () => void;
}

export default function CommentsPanel({ projectId, elementId, elementType, elementName, onClose }: CommentsPanelProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', elementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_comments')
        .select(`
          *,
          users (first_name, last_name, role)
        `)
        .eq('element_id', elementId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data as Comment[];
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase
        .from('item_comments')
        .insert([{
          project_id: projectId,
          element_id: elementId,
          element_type: elementType,
          user_id: profile?.id,
          comment: text
        }]);
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', elementId] });
      setNewComment('');
    },
    onError: () => {
      toast.error('Failed to add comment');
    }
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('item_comments')
        .update({ is_resolved: true })
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', elementId] });
      toast.success('Comment resolved');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-brand-navy border-l border-brand-border shadow-2xl z-50 flex flex-col">
      <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-surface">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-primary" />
          <div>
            <h3 className="text-white font-medium">Comments</h3>
            <p className="text-xs text-gray-400 capitalize">{elementName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : comments?.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No comments yet</p>
          </div>
        ) : (
          comments?.map(comment => (
            <div key={comment.id} className={`p-3 rounded-lg border ${comment.is_resolved ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-300">
                      {comment.users?.first_name} {comment.users?.last_name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!comment.is_resolved && (
                  <button 
                    onClick={() => resolveCommentMutation.mutate(comment.id)}
                    className="text-gray-500 hover:text-green-400 transition-colors"
                    title="Mark as resolved"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {comment.is_resolved && (
                  <span className="text-[10px] text-green-400 font-medium px-1.5 py-0.5 bg-green-400/10 rounded">
                    Resolved
                  </span>
                )}
              </div>
              <p className="text-sm text-white ml-8">{comment.comment}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-brand-border bg-brand-surface">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-brand-navy border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
            disabled={addCommentMutation.isPending}
          />
          <button 
            type="submit"
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="p-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
