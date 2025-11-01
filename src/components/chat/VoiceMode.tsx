import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Settings, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VoiceModeProps {
  onTranscript: (text: string) => void;
  onStop: () => void;
  onListeningChange?: (isListening: boolean) => void;
  onExitVoiceMode?: () => void;
  response: string | null;
  isProcessing: boolean;
}

export function VoiceMode({ 
  onTranscript, 
  onStop,
  onListeningChange,
  onExitVoiceMode,
  response,
  isProcessing 
}: VoiceModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(-1);
  const [voiceRate, setVoiceRate] = useState(0.95);
  const [voicePitch, setVoicePitch] = useState(1);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const responseProcessedRef = useRef<string | null>(null);
  const isStoppedRef = useRef<boolean>(false);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
    'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Try to find a good default voice (prefer female, English)
      if (voices.length > 0 && selectedVoiceIndex === -1) {
        const preferredVoices = [
          'Google UK English Female',
          'Google US English Female',
          'Microsoft Zira - English (United States)',
          'Samantha',
          'Karen',
          'Victoria'
        ];
        
        let foundIndex = voices.findIndex(v => 
          preferredVoices.some(pref => v.name.includes(pref))
        );
        
        if (foundIndex === -1) {
          // Find first English female voice
          foundIndex = voices.findIndex(v => 
            v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
          );
        }
        
        if (foundIndex === -1) {
          // Find first English voice
          foundIndex = voices.findIndex(v => v.lang.startsWith('en'));
        }
        
        setSelectedVoiceIndex(foundIndex >= 0 ? foundIndex : 0);
      }
    };

    loadVoices();
    // Voices may load asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, selectedVoiceIndex]);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || 
                            (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        onListeningChange?.(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setIsRecording(false);
          onListeningChange?.(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        onListeningChange?.(false);
        setTranscript("");
      };

      recognitionRef.current = recognition;
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (utteranceRef.current && synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isSupported, onTranscript, onListeningChange]);

  // Handle response text-to-speech - FIXED: Only process once per response
  useEffect(() => {
    // Don't process if stopped or if already processing this response
    if (isStoppedRef.current || responseProcessedRef.current === response) {
      return;
    }
    
    if (response && synthRef.current && !isProcessing && !isSpeaking) {
      // Only process if this is a new response
      if (responseProcessedRef.current !== response) {
        responseProcessedRef.current = response;
        isStoppedRef.current = false; // Reset stopped flag for new response
        speakResponse(response);
      }
    }
  }, [response, isSpeaking, isProcessing]);

  const startListening = () => {
    if (recognitionRef.current && !isRecording) {
      setTranscript("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      onListeningChange?.(false);
      onStop();
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current || isStoppedRef.current) return;

    // Cancel any ongoing speech first
    synthRef.current.cancel();
    
    // Small delay to ensure cancel completes
    setTimeout(() => {
      // Check again if stopped before speaking
      if (!synthRef.current || isStoppedRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = voiceRate;
      utterance.pitch = voicePitch;
      utterance.volume = 1;

      // Set voice if available
      if (availableVoices.length > 0 && selectedVoiceIndex >= 0 && selectedVoiceIndex < availableVoices.length) {
        utterance.voice = availableVoices[selectedVoiceIndex];
      }

      utterance.onstart = () => {
        // Only set speaking if not stopped
        if (!isStoppedRef.current) {
          setIsSpeaking(true);
        } else {
          // If stopped, cancel immediately
          synthRef.current?.cancel();
        }
      };

      utterance.onend = () => {
        // Only process end if not stopped
        if (!isStoppedRef.current) {
          setIsSpeaking(false);
          responseProcessedRef.current = null;
        }
        utteranceRef.current = null;
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        if (!isStoppedRef.current) {
          responseProcessedRef.current = null;
        }
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    }, 100);
  };

  const stopSpeaking = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Set stopped flag to prevent re-triggering
    isStoppedRef.current = true;
    
    if (synthRef.current) {
      // Cancel all speech synthesis immediately
      synthRef.current.cancel();
      
      // Clear utterance callbacks to prevent state updates
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onstart = null;
        utteranceRef.current = null;
      }
      
      // Update state immediately
      setIsSpeaking(false);
      // Mark this response as processed so it won't trigger again
      responseProcessedRef.current = response;
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Voice mode not supported</p>
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support speech recognition or text-to-speech.
            Please use Chrome, Edge, or Safari for voice features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6 relative">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* Exit to Chat Button */}
        {onExitVoiceMode && (
          <Button
            variant="outline"
            onClick={onExitVoiceMode}
            className="gap-2"
            disabled={isRecording || isSpeaking}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Switch to Chat</span>
          </Button>
        )}
        
        {/* Settings Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice</label>
              <Select
                value={selectedVoiceIndex >= 0 ? selectedVoiceIndex.toString() : "0"}
                onValueChange={(value) => setSelectedVoiceIndex(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Speed: {voiceRate.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pitch: {voicePitch.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voicePitch}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Animated Listening Ball with enhanced animations */}
      <div className="relative flex items-center justify-center">
        {/* Animated background gradient */}
        {isRecording && (
          <div className="absolute inset-0 w-64 h-64 rounded-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 animate-spin-slow blur-2xl" />
        )}

        {/* Outer pulsing circles */}
        {isRecording && (
          <>
            <div 
              className="absolute rounded-full bg-primary/20 animate-ping"
              style={{
                width: '240px',
                height: '240px',
                animationDuration: '2s',
              }}
            />
            <div 
              className="absolute rounded-full bg-primary/15 animate-ping"
              style={{
                width: '260px',
                height: '260px',
                animationDelay: '0.6s',
                animationDuration: '2.2s',
              }}
            />
            <div 
              className="absolute rounded-full bg-primary/10 animate-ping"
              style={{
                width: '280px',
                height: '280px',
                animationDelay: '1.2s',
                animationDuration: '2.4s',
              }}
            />
          </>
        )}
        
        {/* Middle pulsing circles */}
        <div 
          className={cn(
            "absolute rounded-full bg-primary/30 transition-all duration-500",
            isRecording && "animate-pulse"
          )}
          style={{
            width: isRecording ? '180px' : '140px',
            height: isRecording ? '180px' : '140px',
          }}
        />
        
        {isRecording && (
          <div 
            className="absolute rounded-full bg-primary/40 animate-pulse"
            style={{
              width: '160px',
              height: '160px',
              animationDelay: '0.3s',
              animationDuration: '1.5s',
            }}
          />
        )}

        {/* Speaking animation */}
        {isSpeaking && !isRecording && (
          <div 
            className="absolute rounded-full bg-blue-500/30 animate-pulse"
            style={{
              width: '200px',
              height: '200px',
              animationDuration: '1s',
            }}
          />
        )}
        
        {/* Main microphone button */}
        <Button
          onClick={handleMicClick}
          disabled={isProcessing && !isRecording}
          size="lg"
          className={cn(
            "relative w-36 h-36 rounded-full shadow-2xl transition-all duration-300 z-10",
            "hover:scale-105 active:scale-95",
            isRecording 
              ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-110 shadow-red-500/50 ring-4 ring-red-500/30" 
              : isSpeaking
              ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/50"
              : "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary",
            isProcessing && !isRecording && "opacity-50"
          )}
        >
          {isRecording ? (
            <MicOff className="h-14 w-14 text-white animate-pulse" />
          ) : isSpeaking ? (
            <Volume2 className="h-14 w-14 text-white animate-pulse" />
          ) : (
            <Mic className="h-14 w-14 text-white transition-transform" />
          )}
        </Button>

        {/* Sparkle animation when recording */}
        {isRecording && (
          <>
            <Sparkles className="absolute -top-4 -right-4 h-6 w-6 text-primary animate-pulse" />
            <Sparkles className="absolute -bottom-4 -left-4 h-6 w-6 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
            <Sparkles className="absolute -top-4 -left-4 h-5 w-5 text-primary animate-pulse" style={{ animationDelay: '1s' }} />
            <Sparkles className="absolute -bottom-4 -right-4 h-5 w-5 text-primary animate-pulse" style={{ animationDelay: '1.5s' }} />
          </>
        )}
      </div>

      {/* Status Text with animations */}
      <div className="text-center space-y-3 min-h-[80px]">
        {isProcessing && !isRecording ? (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-lg font-semibold animate-pulse">Processing your message...</p>
            <p className="text-sm text-muted-foreground">Generating response</p>
          </div>
        ) : isRecording ? (
          <div className="space-y-2 animate-fade-in">
            <p className="text-xl font-bold text-red-500 animate-pulse">Listening...</p>
            <p className="text-sm text-muted-foreground">Click the microphone again to stop</p>
          </div>
        ) : isSpeaking ? (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xl font-bold text-blue-500 animate-pulse">Speaking response...</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => stopSpeaking(e)}
              className="mt-2"
            >
              <VolumeX className="h-4 w-4 mr-2" />
              Stop Speaking
            </Button>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            <p className="text-xl font-semibold">Voice Mode Active</p>
            <p className="text-sm text-muted-foreground">
              Click the microphone to start talking
            </p>
          </div>
        )}
      </div>

      {/* Transcript Display with animation */}
      {transcript && (
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-gradient-to-br from-muted to-muted/50 rounded-lg p-4 border border-border shadow-sm">
            <p className="text-sm font-medium mb-1 text-muted-foreground">You said:</p>
            <p className="text-sm font-medium">{transcript}</p>
          </div>
        </div>
      )}

      {/* Instructions with fade animation */}
      <div className="text-center text-xs text-muted-foreground max-w-md space-y-1 opacity-70">
        <p className="flex items-center justify-center gap-1">
          <Mic className="h-3 w-3" />
          Click the microphone to start talking
        </p>
        <p className="flex items-center justify-center gap-1">
          <MicOff className="h-3 w-3" />
          Click again to stop and send your message
        </p>
        <p className="flex items-center justify-center gap-1">
          <Volume2 className="h-3 w-3" />
          The AI will respond with voice
        </p>
      </div>
    </div>
  );
}

// TypeScript declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}
