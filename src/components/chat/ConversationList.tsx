import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  title: string;
  language: string;
  updated_at: string;
}

interface ConversationListProps {
  collapsed: boolean;
}

export function ConversationList({ collapsed }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  };

  const openDeleteDialog = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteConversation = async () => {
    if (!conversationToDelete) return;
    
    const id = conversationToDelete;
    setDeletingId(id);
    setDeleteDialogOpen(false);
    
    try {
      // Optimistically remove from UI
      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Restore the conversation on error
        fetchConversations();
        toast.error(`Failed to delete conversation: ${error.message || 'Unknown error'}`);
      } else {
        toast.success('Conversation deleted');
        
        // If we're currently viewing this conversation, navigate away
        const currentPath = location.pathname;
        if (currentPath === `/chat/${id}`) {
          navigate('/');
        }
        
        // Refresh the list to ensure consistency
        fetchConversations();
      }
    } catch (error: any) {
      console.error('Delete exception:', error);
      // Restore the conversation on error
      fetchConversations();
      toast.error(`Failed to delete conversation: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
      setConversationToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="p-2 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {collapsed ? "No chats" : "No conversations yet. Start a new chat!"}
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="group flex items-center gap-2 p-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors"
          onClick={() => navigate(`/chat/${conv.id}`)}
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 overflow-hidden pr-2">
                <p className="text-sm truncate text-sidebar-foreground">
                  {conv.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-100 hover:bg-destructive/10"
                disabled={deletingId === conv.id}
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(conv.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 text-destructive shrink-0" />
              </Button>
            </>
          )}
        </div>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConversationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteConversation}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}