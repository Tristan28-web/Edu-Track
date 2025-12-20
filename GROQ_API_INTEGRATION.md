# Groq API Integration Guide for Edu-Track AI Math Assistant

## Overview

This guide explains how to use the Groq API for the Edu-Track AI Math Assistant. The refactored implementation is **client-side only** and uses direct fetch calls to the Groq API instead of Gemini.

---

## Environment Setup

### Step 1: Get Your Groq API Key

1. Visit [https://console.groq.com](https://console.groq.com)
2. Create an account or sign in
3. Generate an API key
4. Copy the key (you'll use it in the next step)

### Step 2: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# For Next.js with client-side access
NEXT_PUBLIC_GROQ_API_KEY=your-groq-api-key-here

# Alternative (for projects using REACT_APP prefix)
REACT_APP_GROQ_API_KEY=your-groq-api-key-here
```

**Important**: 
- For client-side access in Next.js, use `NEXT_PUBLIC_` prefix
- The environment variable must start with `NEXT_PUBLIC_` or `REACT_APP_`
- Never commit your API key to version control
- Add `.env.local` to `.gitignore`

### Step 3: Rebuild Your Application

```bash
npm run build
# or
yarn build
```

---

## Implementation Files

### 1. Groq API Utility (`src/lib/groq-api.ts`)

This is the core utility that handles all Groq API communication:

```typescript
import { answerMathQuestionWithGroq } from '@/lib/groq-api';

// Call it from anywhere in your client components
const answer = await answerMathQuestionWithGroq("What is 2 + 2?");
```

**Features:**
- Pure fetch-based implementation (no external AI SDK needed)
- Automatic API key detection from environment variables
- Built-in error handling and validation
- Supports Grade 10 level math questions
- Returns formatted step-by-step explanations

### 2. Refactored Student Assistant Component (`src/app/student/assistant/AssistantClient.tsx`)

The existing component has been updated to use the Groq API:

**Changes Made:**
- Removed dependency on `answerMathQuestion` server function
- Now directly calls `answerMathQuestionWithGroq` from the client
- Maintains all existing UI and styling
- Same error handling and user feedback
- Response type changed from `AnswerMathQuestionOutput` to `string`

### 3. Standalone Component (`src/components/standalone/GroqMathAssistant.tsx`)

A complete, ready-to-use React component that can be dropped into any Next.js or React app.

**Usage:**

```typescript
import { StandaloneGroqMathAssistant } from '@/components/standalone/GroqMathAssistant';

export default function MathPage() {
  return <StandaloneGroqMathAssistant />;
}
```

**Features:**
- Completely self-contained
- No external dependencies beyond React
- Includes form validation with Zod
- Built-in error handling
- Responsive design
- Dark mode support
- All code includes detailed comments

---

## API Details

### Endpoint
```
https://api.groq.com/openai/v1/chat/completions
```

### Model Used
```
mixtral-8x7b-32768
```
- Fast inference
- Suitable for educational content
- Reliable for math problems

### Request Parameters

```typescript
{
  model: "mixtral-8x7b-32768",
  messages: [
    {
      role: "system",
      content: "You are an expert Grade 10 math tutor..."
    },
    {
      role: "user",
      content: "Please answer this Grade 10 math question..."
    }
  ],
  temperature: 0.7,      // Balanced creativity
  max_tokens: 2048       // Allow reasonably long responses
}
```

### Response Format

```typescript
{
  choices: [
    {
      message: {
        content: "Step 1: ...\nStep 2: ..."
      }
    }
  ]
}
```

---

## Error Handling

The implementation includes comprehensive error handling:

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| API key not configured | Missing environment variable | Set `REACT_APP_GROQ_API_KEY` or `NEXT_PUBLIC_GROQ_API_KEY` |
| 401 Unauthorized | Invalid API key | Generate a new key from Groq console |
| 429 Too Many Requests | Rate limit exceeded | Wait and retry, consider caching responses |
| Empty response | API connectivity issue | Check internet connection and Groq status |
| Question too short | Validation error | Use questions with at least 5 characters |

### Fallback Message

If any error occurs, users see:
```
"Sorry, I couldn't process your question right now. Please try again."
```

---

## Integration Steps

### For Existing Projects

1. **Copy the utility file:**
   ```bash
   cp src/lib/groq-api.ts your-project/src/lib/
   ```

2. **Update your component:**
   ```typescript
   import { answerMathQuestionWithGroq } from '@/lib/groq-api';

   // In your submit handler:
   const answer = await answerMathQuestionWithGroq(question);
   ```

3. **Set environment variable:**
   Add to `.env.local`:
   ```
   NEXT_PUBLIC_GROQ_API_KEY=your-key
   ```

### For New Projects

1. **Copy the standalone component:**
   ```bash
   cp src/components/standalone/GroqMathAssistant.tsx your-project/src/components/
   ```

2. **Use in your page:**
   ```typescript
   import StandaloneGroqMathAssistant from '@/components/standalone/GroqMathAssistant';

   export default function Page() {
     return <StandaloneGroqMathAssistant />;
   }
   ```

3. **Configure environment:**
   ```
   NEXT_PUBLIC_GROQ_API_KEY=your-key
   ```

---

## Testing the Implementation

### Manual Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the student assistant page
3. Enter a math question (e.g., "What is 2x + 3 = 7?")
4. Click "Ask Question"
5. Wait for the AI response

### Example Questions to Try

- "What is 2x + 3 = 7? Solve for x."
- "How do I find the area of a circle with radius 5cm?"
- "Simplify the expression: (x + 3)² - (x - 3)²"
- "What is the slope of the line passing through (2, 3) and (5, 9)?"

### Debugging

Enable debug logging in the browser console:

```typescript
// In your component
console.log("Sending question:", question);
console.log("API Key configured:", !!getGroqApiKey());
```

Check the browser Network tab to see:
- Request payload to Groq API
- Response status and data
- Any CORS issues

---

## Performance Considerations

### Caching Responses (Optional)

For frequently asked questions, consider caching:

```typescript
const questionCache = new Map<string, string>();

async function answerWithCache(question: string): Promise<string> {
  if (questionCache.has(question)) {
    return questionCache.get(question)!;
  }
  
  const answer = await answerMathQuestionWithGroq(question);
  questionCache.set(question, answer);
  return answer;
}
```

### Response Time

- Average response: 2-5 seconds
- Max tokens: 2048
- Model: Groq's Mixtral 8x7B (fast inference)

---

## Migration from Gemini API

### What Changed

| Aspect | Gemini | Groq |
|--------|--------|------|
| SDK | `@google/generative-ai` | None (fetch-based) |
| API Key | `GEMINI_API_KEY` | `REACT_APP_GROQ_API_KEY` |
| Server-side? | Yes (Genkit) | No (client-side) |
| Cost | Pay per request | Free tier + paid tiers |
| Endpoint | Google's endpoint | Groq's endpoint |

### Files You Can Remove (Optional)

If you're fully migrating and not using Genkit for other flows:

```bash
# These are no longer needed
rm -r src/ai/flows/answer-math-question.ts
rm -r src/ai/genkit.ts
rm -r src/app/api/ai-math/route.ts  # if only for math
```

**Note**: Keep if you're using other Genkit flows

### Dependencies to Update

No new dependencies are needed! The refactored code uses:
- React (already installed)
- TypeScript (already installed)
- Fetch API (built-in)

You can optionally remove:
```json
"@genkit-ai/googleai": "^1.8.0",
"@genkit-ai/next": "^1.8.0",
"@google/generative-ai": "^0.11.3",
"genkit": "^1.8.0"
```

---

## Troubleshooting

### Issue: "API key not configured"

```
Solution: Check that REACT_APP_GROQ_API_KEY or NEXT_PUBLIC_GROQ_API_KEY is set
- Verify file: .env.local
- Restart dev server after adding env var
- Use echo $REACT_APP_GROQ_API_KEY to test (won't work with NEXT_PUBLIC_)
```

### Issue: CORS Error

```
Solution: This shouldn't happen with proper header configuration
- Verify Authorization header is correct
- Check Content-Type is application/json
- Ensure API endpoint URL is correct
```

### Issue: 401 Unauthorized

```
Solution: Invalid or expired API key
- Generate a new key from https://console.groq.com
- Update .env.local
- Restart dev server
```

### Issue: Empty responses

```
Solution: API or network issue
- Check internet connection
- Verify Groq API status at groq.com
- Check browser console for detailed error
- Try a simpler question
```

---

## Best Practices

1. **Never expose API keys in client code** - Use environment variables
2. **Cache responses** for commonly asked questions
3. **Validate input** before sending to API (already done)
4. **Handle errors gracefully** (already done with fallback message)
5. **Monitor API usage** - Check Groq console for rate limits
6. **Add loading states** for better UX (already done)
7. **Test with various questions** to ensure quality

---

## Support & Resources

- **Groq Documentation**: https://console.groq.com/docs/quickstart
- **API Reference**: https://console.groq.com/docs/chat-completions
- **Models Available**: https://console.groq.com/docs/models
- **Rate Limits**: Check your Groq account dashboard

---

## Summary

The Edu-Track AI Math Assistant has been successfully refactored to use Groq API with:

✅ Client-side only implementation
✅ Direct fetch-based API calls
✅ Environment variable configuration
✅ Comprehensive error handling
✅ User-friendly fallback messages
✅ Existing UI preserved
✅ Ready-to-drop components
✅ Full code documentation

Start using it by setting your `REACT_APP_GROQ_API_KEY` and rebuilding your app!
