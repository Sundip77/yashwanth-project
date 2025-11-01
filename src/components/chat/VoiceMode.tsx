import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Settings, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  const transcriptProcessedRef = useRef<boolean>(false);

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

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || 
                            (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after one utterance
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        transcriptProcessedRef.current = false;
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

        // Update transcript display
        setTranscript(finalTranscript || interimTranscript);
        
        // Only process final transcript once
        if (finalTranscript.trim() && !transcriptProcessedRef.current) {
          transcriptProcessedRef.current = true;
          // Stop recognition and process transcript
          recognition.stop();
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        onListeningChange?.(false);
        
        // Handle specific errors
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          // Normal - user didn't speak, just stop
          setIsRecording(false);
          onListeningChange?.(false);
        } else if (event.error === 'aborted') {
          // User stopped it - this is fine
          setIsRecording(false);
          onListeningChange?.(false);
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        onListeningChange?.(false);
        setTranscript("");
        transcriptProcessedRef.current = false;
      };

      recognitionRef.current = recognition;
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      if (utteranceRef.current && synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isSupported, onTranscript, onListeningChange]);

  // Handle response text-to-speech
  useEffect(() => {
    if (response && !isProcessing && !isSpeaking) {
      // Only process if this is a new response
      if (responseProcessedRef.current !== response) {
        responseProcessedRef.current = response;
        isStoppedRef.current = false;
        speakResponse(response);
      }
    }
  }, [response, isSpeaking, isProcessing]);

  const startListening = async () => {
    // Don't start if already recording
    if (isRecording) {
      return;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      toast.error('Microphone access is required for voice mode');
      return;
    }

    if (!recognitionRef.current) {
      toast.error('Speech recognition not initialized. Please refresh the page.');
      return;
    }

    try {
      setTranscript("");
      transcriptProcessedRef.current = false;
      
      // Ensure any previous recognition is stopped
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if not running
      }
      
      // Small delay to ensure previous recognition is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start recognition
      recognitionRef.current.start();
      console.log('Starting speech recognition...');
    } catch (error: any) {
      console.error('Error starting recognition:', error);
      if (error.name === 'InvalidStateError') {
        // Recognition might be busy, try again after a short delay
        setTimeout(async () => {
          try {
            if (recognitionRef.current && !isRecording) {
              recognitionRef.current.start();
            }
          } catch (e) {
            toast.error('Microphone is busy. Please wait a moment and try again.');
          }
        }, 300);
      } else {
        toast.error('Failed to start microphone. Please try again.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
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
        if (!isStoppedRef.current) {
          setIsSpeaking(true);
        } else {
          synthRef.current?.cancel();
        }
      };

      utterance.onend = () => {
        if (!isStoppedRef.current) {
          setIsSpeaking(false);
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    }, 50);
  };

  const stopSpeaking = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    isStoppedRef.current = true;
    
    if (synthRef.current) {
      synthRef.current.cancel();
      
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onstart = null;
        utteranceRef.current = null;
      }
      
      setIsSpeaking(false);
      responseProcessedRef.current = response;
    }
  };

  const handleMicClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent clicks while processing
    if (isProcessing && !isRecording && !isSpeaking) {
      return;
    }

    if (isRecording) {
      stopListening();
    } else {
      await startListening();
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
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-8">
      {/* Header Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
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
                value={selectedVoiceIndex.toString()} 
                onValueChange={(value) => setSelectedVoiceIndex(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedVoiceIndex >= 0 && availableVoices[selectedVoiceIndex]
                      ? availableVoices[selectedVoiceIndex].name
                      : 'Default'}
                  </SelectValue>
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
        <Button
          variant="outline"
          onClick={onExitVoiceMode}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Switch to Chat</span>
        </Button>
      </div>

      {/* Status Message */}
      <div className="text-center space-y-2">
        {isRecording ? (
          <div className="animate-fade-in">
            <p className="text-xl font-semibold text-red-500">Listening...</p>
            <p className="text-sm text-muted-foreground">Speak your question</p>
          </div>
        ) : isProcessing ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl font-semibold">Processing</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            </div>
          </div>
        ) : isSpeaking ? (
          <div className="animate-fade-in">
            <p className="text-xl font-semibold text-blue-500">Speaking response...</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={stopSpeaking}
              className="mt-2"
            >
              <VolumeX className="h-4 w-4 mr-2" />
              Stop Speaking
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <p className="text-xl font-semibold">Click the microphone to start</p>
            <p className="text-sm text-muted-foreground">Ask your health question</p>
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="max-w-2xl w-full px-4">
          <div className="bg-muted rounded-lg p-4 animate-slide-up">
            <p className="text-sm font-medium mb-1">You said:</p>
            <p className="text-base">{transcript}</p>
          </div>
        </div>
      )}

      {/* Animated Listening Ball */}
      <div className="relative flex items-center justify-center">
        {/* Animated background gradient */}
        {isRecording && (
          <div className="absolute inset-0 w-64 h-64 rounded-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 animate-spin-slow blur-2xl" />
        )}

        {/* Outer pulsing circles */}
        {isRecording && (
          <>
            <div className="absolute w-48 h-48 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute w-40 h-40 rounded-full bg-primary/15 animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute w-32 h-32 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: '0.4s' }} />
            <div className="absolute w-24 h-24 rounded-full bg-primary/40 animate-ping" style={{ animationDelay: '0.6s' }} />
          </>
        )}
        
        {/* Main microphone button */}
        <Button
          onClick={handleMicClick}
          disabled={isProcessing && !isRecording && !isSpeaking}
          size="lg"
          className={cn(
            "relative w-36 h-36 rounded-full shadow-2xl transition-all duration-300 z-10",
            "hover:scale-105 active:scale-95 focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isRecording 
              ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-110 shadow-red-500/50 ring-4 ring-red-500/30 cursor-pointer" 
              : isSpeaking
              ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/50 cursor-pointer"
              : "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary cursor-pointer",
            isProcessing && !isRecording && !isSpeaking && "opacity-50 cursor-not-allowed"
          )}
          type="button"
          aria-label={isRecording ? "Stop recording" : isSpeaking ? "Speaking" : "Start recording"}
        >
          {isRecording ? (
            <MicOff className="h-14 w-14 text-white animate-pulse shrink-0" />
          ) : isSpeaking ? (
            <Volume2 className="h-14 w-14 text-white animate-pulse shrink-0" />
          ) : (
            <Mic className="h-14 w-14 text-white transition-transform shrink-0" />
          )}
        </Button>

        {/* Sparkle animation when recording */}
        {isRecording && (
          <>
            <Sparkles className="absolute -top-4 -right-4 h-6 w-6 text-primary animate-pulse" />
            <Sparkles className="absolute -top-4 -left-4 h-6 w-6 text-primary animate-pulse" style={{ animationDelay: '0.3s' }} />
            <Sparkles className="absolute -bottom-4 -right-4 h-6 w-6 text-primary animate-pulse" style={{ animationDelay: '0.6s' }} />
            <Sparkles className="absolute -bottom-4 -left-4 h-6 w-6 text-primary animate-pulse" style={{ animationDelay: '0.9s' }} />
          </>
        )}
      </div>
    </div>
  );
}
