import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmergencyAlert } from "@/components/chat/EmergencyAlert";
import { DisclaimerBanner } from "@/components/chat/DisclaimerBanner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export default function Chat() {
  const { id } = useParams();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(id || null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [initialSuggestions, setInitialSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadConversation(id);
    } else {
      // New conversation
      setMessages([]);
      setConversationId(null);
      // Load dynamic suggestions for new conversations
      loadDynamicSuggestions();
    }
  }, [id]);

  useEffect(() => {
    // Load dynamic suggestions on component mount
    if (!id && initialSuggestions.length === 0) {
      loadDynamicSuggestions();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Check if message already exists by ID or by content and timestamp
            const exists = prev.some(m => 
              m.id === newMessage.id || 
              (m.content === newMessage.content && 
               Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 1000)
            );
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadDynamicSuggestions = async () => {
    try {
      // Generate random health-related suggestions
      const healthTopics = [
        "flu symptoms", "stress management", "diabetes care", "first aid burns",
        "heart health", "mental wellness", "nutrition advice", "sleep hygiene",
        "exercise benefits", "allergy symptoms", "cold remedies", "pain management",
        "vitamin deficiency", "hydration tips", "meditation benefits", "weight management"
      ];
      
      // Shuffle and pick 4 random suggestions
      const shuffled = healthTopics.sort(() => 0.5 - Math.random());
      const randomSuggestions = shuffled.slice(0, 4).map(topic => 
        `Tell me about ${topic}`
      );
      
      setInitialSuggestions(randomSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Fallback to default suggestions
      setInitialSuggestions([
        "What are the symptoms of flu?",
        "How to manage stress?",
        "Tell me about diabetes",
        "First aid for minor burns"
      ]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const loadConversation = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    } else {
      // Type assertion to ensure correct role types
      const typedMessages = (data || []).map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant" | "system"
      }));
      setMessages(typedMessages);
      setConversationId(convId);
    }
  };

  const createConversation = async (firstMessage: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        language
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }

    return data.id;
  };

  const saveMessage = async (role: "user" | "assistant", content: string, convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role,
        content
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
    }

    return data;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setLoading(true);
    setIsEmergency(false);

    try {
      // Create conversation if it doesn't exist
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation(content);
        if (!convId) return;
        setConversationId(convId);
        // Update URL without reload
        window.history.replaceState(null, '', `/chat/${convId}`);
      }

      // Add user message optimistically
      const userMessage = {
        id: crypto.randomUUID(),
        role: "user" as const,
        content,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // Save user message to DB
      await saveMessage("user", content, convId);

      // Call AI function
      const { data, error } = await supabase.functions.invoke('health-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          language
        }
      });

      if (error) throw error;

      // Handle emergency
      if (data.isEmergency) {
        setIsEmergency(true);
        const emergencyMessage = {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: data.message,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, emergencyMessage]);
        await saveMessage("assistant", data.message, convId);
        return;
      }

      // Add assistant message
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: data.message,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage("assistant", data.message, convId);

      // Set suggestions
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        <ChatHeader />
        
        {isEmergency && <EmergencyAlert />}
        <DisclaimerBanner />

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <MessageList 
              messages={messages} 
              loading={loading} 
              suggestions={initialSuggestions}
              onSuggestionClick={handleSuggestionClick}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-4">
            <ChatInput 
              onSend={sendMessage} 
              disabled={loading}
              suggestions={suggestions}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}