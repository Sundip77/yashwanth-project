import { useState, useEffect } from "react";
import { Brain, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export function MemoryManager() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);
  const [newMemory, setNewMemory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (isDialogOpen) {
      loadMemories();
    }
  }, [isDialogOpen]);

  const loadMemories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('memories' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories((data as unknown as Memory[]) || []);
    } catch (error) {
      console.error('Error loading memories:', error);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) {
      toast.error('Please enter a memory');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('memories' as any)
        .insert({
          user_id: user.id,
          content: newMemory.trim(),
          category: newCategory.trim() || null
        });

      if (error) throw error;

      toast.success('Memory added successfully');
      setNewMemory("");
      setNewCategory("");
      setIsDialogOpen(false);
      loadMemories();
    } catch (error) {
      console.error('Error adding memory:', error);
      toast.error('Failed to add memory');
    }
  };

  const handleDeleteMemory = async () => {
    if (!memoryToDelete) return;

    try {
      const { error } = await supabase
        .from('memories' as any)
        .delete()
        .eq('id', memoryToDelete);

      if (error) throw error;

      toast.success('Memory deleted successfully');
      setMemoryToDelete(null);
      setIsDeleteDialogOpen(false);
      loadMemories();
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
    }
  };

  const openDeleteDialog = (memoryId: string) => {
    setMemoryToDelete(memoryId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2" size="sm">
            <Brain className="h-4 w-4" />
            <span>Manage Memories</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Memory Manager
            </DialogTitle>
            <DialogDescription>
              Manage your health-related memories. These help the AI provide personalized responses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Memory Form */}
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-sm">Add New Memory</h3>
              <Textarea
                placeholder="e.g., I'm allergic to penicillin, I have type 2 diabetes, I take metformin daily..."
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Category (optional) e.g., Allergies, Medications"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                />
                <Button onClick={handleAddMemory} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Memories List */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading memories...
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No memories yet. Add one above to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          {memory.category && (
                            <Badge variant="outline" className="mb-2 text-xs shrink-0">
                              {memory.category}
                            </Badge>
                          )}
                          <p className="text-sm break-words">{memory.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(memory.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 opacity-100 hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(memory.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this memory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMemory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

