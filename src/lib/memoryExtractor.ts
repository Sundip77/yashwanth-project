/**
 * Extracts important health-related information from conversations
 * and determines if it should be saved as a memory
 */

export interface MemoryExtractionResult {
  shouldSave: boolean;
  memory?: string;
  category?: string;
  confidence?: number;
}

/**
 * Extracts important information from conversation
 * Only saves truly important health information (allergies, medications, conditions, etc.)
 * Returns null if nothing important to save
 */
export async function extractMemory(
  messages: Array<{ role: string; content: string }>,
  existingMemories: string[]
): Promise<MemoryExtractionResult | null> {
  // Get the last few messages for context (user's last message is most important)
  const recentMessages = messages.slice(-4);
  const conversationText = recentMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  // Focus on user messages
  const userMessages = recentMessages.filter(m => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

  // Important health information patterns with higher specificity
  const importantPatterns = [
    {
      pattern: /(?:i\s+am|i'm|i\s+have|i've\s+been)\s+allergic\s+to\s+([^.,!?]+)/i,
      category: 'Allergies',
      confidence: 0.95
    },
    {
      pattern: /(?:i\s+am|i'm|i\s+have|diagnosed\s+with)\s+(type\s+\d+\s+)?(diabetes|hypertension|asthma|epilepsy|arthritis|heart\s+disease|depression|anxiety|migraine|crohn's|ulcerative\s+colitis|thyroid)/i,
      category: 'Medical Conditions',
      confidence: 0.9
    },
    {
      pattern: /(?:i\s+take|i'm\s+taking|my\s+medication|prescribed)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s+\d+\s*(?:mg|ml|units|times)?(?:\s+per\s+(?:day|week|month))?)?)/i,
      category: 'Medications',
      confidence: 0.85
    },
    {
      pattern: /(?:my\s+)?blood\s+(?:type|group)\s+is\s+(O|A|B|AB)[+-]?/i,
      category: 'Medical Info',
      confidence: 0.95
    },
    {
      pattern: /(?:i\s+am|i'm)\s+pregnant/i,
      category: 'Medical Info',
      confidence: 0.9
    },
    {
      pattern: /(?:i\s+have|i\s+suffer\s+from)\s+(?:a\s+)?chronic\s+([^.,!?]+)/i,
      category: 'Medical Conditions',
      confidence: 0.8
    },
  ];

  // Check if conversation contains important information
  let extractedMemory: string | null = null;
  let category: string | null = null;
  let confidence = 0;

  // Only process user messages (not AI responses)
  const userText = userMessages.map(m => m.content).join(' ');

  for (const { pattern, category: patternCategory, confidence: patternConfidence } of importantPatterns) {
    const match = userText.match(pattern);
    if (match) {
      // Extract the relevant sentence or phrase
      const matchIndex = lastUserMessage.indexOf(match[0]);
      if (matchIndex !== -1) {
        // Extract sentence containing the match
        const beforeMatch = lastUserMessage.substring(0, matchIndex);
        const afterMatch = lastUserMessage.substring(matchIndex + match[0].length);
        
        // Find sentence boundaries
        const sentenceStart = Math.max(0, beforeMatch.lastIndexOf('.') + 1);
        const sentenceEnd = afterMatch.indexOf('.') !== -1 
          ? matchIndex + match[0].length + afterMatch.indexOf('.')
          : lastUserMessage.length;
        
        extractedMemory = lastUserMessage.substring(sentenceStart, sentenceEnd).trim();
        
        // Clean up the memory (remove extra spaces, normalize)
        extractedMemory = extractedMemory
          .replace(/\s+/g, ' ')
          .replace(/^[iI]\s+(am|have|take|m|'m)\s+/i, '') // Remove redundant "I am/have/take"
          .trim();

      } else {
        // Fallback: use the matched phrase with some context
        extractedMemory = match[0].trim();
      }

      category = patternCategory;
      confidence = patternConfidence;
      break;
    }
  }

  // Only save if we found something and it's not a duplicate
  if (extractedMemory && confidence > 0.75) {
    // Check if this is similar to existing memories (avoid duplicates)
    const isDuplicate = existingMemories.some(memory => 
      similarity(extractedMemory!, memory) > 0.75
    );

    if (!isDuplicate && extractedMemory.length > 10 && extractedMemory.length < 300) {
      return {
        shouldSave: true,
        memory: extractedMemory,
        category: category || 'General Health',
        confidence
      };
    }
  }

  return null;
}

/**
 * Simple string similarity check
 */
function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

