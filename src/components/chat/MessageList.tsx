import { Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function MessageList({ messages, loading, suggestions = [], onSuggestionClick }: MessageListProps) {
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bot className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Welcome to MediShield AI</h2>
        <p className="text-muted-foreground max-w-md">
          Ask me any health-related questions. I'm here to provide information and guidance.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors text-sm"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                {suggestion}
              </div>
            ))
          ) : (
            [
              "What are the symptoms of flu?",
              "How to manage stress?",
              "Tell me about diabetes",
              "First aid for minor burns"
            ].map((suggestion, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors text-sm"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                {suggestion}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-4",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "assistant" && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          )}

          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border"
            )}
          >
            <div className={cn(
              "prose prose-sm max-w-none",
              message.role === "user" ? "prose-invert" : ""
            )}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            <p className="text-xs opacity-70 mt-2">
              {new Date(message.created_at).toLocaleTimeString()}
            </p>
          </div>

          {message.role === "user" && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <User className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="flex gap-4 justify-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}