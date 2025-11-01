import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEALTH_SYSTEM_PROMPT = `You are a compassionate and professional health assistant. Follow these guidelines:

1. Provide accurate, helpful health information while being empathetic and supportive.
2. Always include this disclaimer at the end of your responses: "⚠️ I'm an AI assistant and not a substitute for professional medical advice. For medical concerns, please consult a healthcare provider. In emergencies, contact local emergency services immediately."
3. If the user mentions emergency symptoms (severe chest pain, difficulty breathing, severe bleeding, unconsciousness, stroke symptoms), immediately prioritize safety and urge them to seek emergency care.
4. Provide information in a clear, easy-to-understand manner.
5. When suggesting follow-up actions, be specific and actionable.
6. Respect cultural and language preferences.
7. Never diagnose conditions or prescribe treatments.

CRITICAL: Detect medical emergencies in user messages. Emergency keywords include:
- Chest pain, heart attack
- Severe bleeding, hemorrhage
- Difficulty breathing, can't breathe
- Unconscious, unresponsive
- Stroke symptoms (face drooping, arm weakness, speech difficulty)
- Severe allergic reaction
- Poisoning
- Severe burns

If emergency detected, respond with:
{
  "isEmergency": true,
  "message": "🚨 EMERGENCY DETECTED: Please seek immediate medical attention. Call emergency services (911/108/999) right away. Do not wait."
}`;

interface ChatMessage {
  role: string;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'en', memories = [] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    console.log('Health chat request:', { messageCount: messages.length, language });

    // Check for emergency keywords in the latest user message
    const latestMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'severe bleeding', 'hemorrhage',
      'difficulty breathing', 'can\'t breathe', 'cannot breathe',
      'unconscious', 'unresponsive', 'stroke', 'face drooping',
      'severe allergic', 'anaphylaxis', 'poisoning', 'poison',
      'severe burn'
    ];
    
    const isEmergency = emergencyKeywords.some(keyword => latestMessage.includes(keyword));
    
    if (isEmergency) {
      console.log('Emergency detected in message');
      return new Response(
        JSON.stringify({
          isEmergency: true,
          message: "🚨 EMERGENCY DETECTED: Based on your symptoms, please seek immediate medical attention. Call emergency services (911/108/999) right away. Do not wait. If you're experiencing a medical emergency, professional help is critical.",
          suggestions: [
            "Call emergency services now",
            "Go to nearest emergency room",
            "Have someone take you to hospital"
          ]
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Add language instruction to system prompt
    const languageInstruction = language !== 'en' 
      ? `\n\nIMPORTANT: The user prefers ${language} language. Respond in ${language} while maintaining medical accuracy.`
      : '';

    // Add user memories to context if available
    let memoryContext = '';
    if (memories && Array.isArray(memories) && memories.length > 0) {
      memoryContext = `\n\nUSER MEMORY CONTEXT (Important information about the user):\n${memories.map((m: string) => `- ${m}`).join('\n')}\n\nUse this information to provide personalized, relevant health advice. Always consider the user's medical history, allergies, medications, and conditions when responding.`;
    }

    const systemInstruction = HEALTH_SYSTEM_PROMPT + languageInstruction + memoryContext;

    // Convert messages to Gemini format
    const contents = [];
    for (const message of messages) {
      if (message.role === 'system') {
        // System messages are handled via systemInstruction
        continue;
      }
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      });
    }

    console.log('Calling Google Generative Language API (Gemini)...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Gemini error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('AI response received successfully');

    // Generate follow-up suggestions based on the conversation
    const suggestions = generateSuggestions(latestMessage, assistantMessage);

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        suggestions,
        isEmergency: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in health-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        isEmergency: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateSuggestions(userMessage: string, assistantResponse: string): string[] {
  // Generate contextual follow-up questions
  const defaultSuggestions = [
    "Tell me more about this",
    "What are the symptoms?",
    "How can I prevent this?"
  ];

  const messageLower = userMessage.toLowerCase();
  
  if (messageLower.includes('pain') || messageLower.includes('hurt')) {
    return [
      "How long has the pain lasted?",
      "What makes the pain better?",
      "Is the pain constant or intermittent?"
    ];
  }
  
  if (messageLower.includes('fever') || messageLower.includes('temperature')) {
    return [
      "What is my temperature?",
      "How to reduce fever naturally?",
      "When should I see a doctor?"
    ];
  }
  
  if (messageLower.includes('cough') || messageLower.includes('cold')) {
    return [
      "Best remedies for cough?",
      "How long does a cold last?",
      "When is cough serious?"
    ];
  }
  
  if (messageLower.includes('diet') || messageLower.includes('nutrition')) {
    return [
      "Balanced diet recommendations?",
      "Foods to avoid?",
      "Vitamin supplements needed?"
    ];
  }

  return defaultSuggestions;
}