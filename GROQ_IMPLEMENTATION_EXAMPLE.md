/**
 * @fileOverview Complete Example - Math Assistant with Groq API
 * 
 * This file demonstrates the full integration pattern for using Groq API
 * in a Next.js application. It includes:
 * - API utility setup
 * - Component implementation
 * - Error handling patterns
 * - Environment configuration
 * 
 * This is a reference implementation showing best practices.
 */

// ============================================================================
// FILE 1: Environment Configuration (.env.local)
// ============================================================================
/*
NEXT_PUBLIC_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
*/

// ============================================================================
// FILE 2: API Utility (src/lib/groq-api-example.ts)
// ============================================================================
/*
// Client-side Groq API utility function
export async function answerMathQuestionWithGroq(question: string): Promise<string> {
  // Step 1: Get the API key from environment
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Groq API key not configured. Please set NEXT_PUBLIC_GROQ_API_KEY environment variable."
    );
  }

  // Step 2: Validate input
  if (!question || question.trim().length === 0) {
    throw new Error("Question cannot be empty");
  }

  try {
    // Step 3: Prepare the API request
    const requestBody = {
      model: "mixtral-8x7b-32768", // Groq's recommended fast model
      messages: [
        {
          role: "system",
          content:
            "You are an expert Grade 10 math tutor. Provide clear step-by-step explanations.",
        },
        {
          role: "user",
          content: `Answer this math question:\n\n${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    };

    // Step 4: Make the API call using fetch
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${apiKey}\`,
      },
      body: JSON.stringify(requestBody),
    });

    // Step 5: Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        \`Groq API error: \${response.status} - \${
          errorData.error?.message || response.statusText
        }\`
      );
    }

    // Step 6: Parse and validate response
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error("No response from Groq API");
    }

    // Step 7: Return the answer
    return answer;
  } catch (error) {
    console.error("Groq API call failed:", error);
    throw error;
  }
}
*/

// ============================================================================
// FILE 3: React Component (src/app/student/assistant/AssistantClient.tsx)
// ============================================================================
/*
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { answerMathQuestionWithGroq } from "@/lib/groq-api";
import { Loader2, Sparkles, Bot, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Validation schema
const formSchema = z.object({
  question: z
    .string()
    .min(5, { message: "Question must be at least 5 characters long." }),
});

type FormData = z.infer<typeof formSchema>;

export function AssistantClient() {
  // State for response, loading, and errors
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup with validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { question: "" },
  });

  // Handle form submission
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    // Step 1: Reset state
    setIsLoading(true);
    setError(null);
    setAiResponse(null);

    try {
      // Step 2: Call Groq API
      const response = await answerMathQuestionWithGroq(data.question);

      // Step 3: Display response
      setAiResponse(response);

      // Step 4: Clear form
      form.reset();
    } catch (err) {
      // Step 5: Show error message
      console.error("Error:", err);
      setError(
        "Sorry, I couldn't process your question right now. Please try again."
      );
    } finally {
      // Step 6: Stop loading
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Ask AI Math Assistant
              </CardTitle>
              <CardDescription>
                Enter your Grade 10 math question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Your Question</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your question here..."
                        className="min-h-[120px]"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Answer...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Ask Question
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Response Display */}
      {aiResponse && (
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                AI Generated Answer
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAiResponse(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="bg-secondary/20 p-4 rounded-md">
              <div
                className="whitespace-pre-wrap text-foreground/90"
                dangerouslySetInnerHTML={{
                  __html: aiResponse.replace(/\n/g, "<br />"),
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
*/

// ============================================================================
// FILE 4: Standalone Minimal Example
// ============================================================================
/*
import { useState } from "react";

export function SimpleGroqMathAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: \`Bearer \${apiKey}\`,
          },
          body: JSON.stringify({
            model: "mixtral-8x7b-32768",
            messages: [
              {
                role: "user",
                content: \`Answer this Grade 10 math question: \${question}\`,
              },
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        }
      );

      const data = await response.json();
      setAnswer(data.choices[0].message.content);
    } catch (error) {
      setAnswer("Sorry, I couldn't process your question right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Math Assistant with Groq</h1>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a math question..."
        style={{ width: "100%", height: "100px" }}
      />

      <button onClick={handleAsk} disabled={loading}>
        {loading ? "Waiting..." : "Ask"}
      </button>

      {answer && (
        <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc" }}>
          <h3>Answer:</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// QUICK START CHECKLIST
// ============================================================================
/*

✅ SETUP STEPS:

1. Set Environment Variable
   - Create .env.local in project root
   - Add: NEXT_PUBLIC_GROQ_API_KEY=your-api-key
   - Restart dev server

2. Copy Utility File
   - Copy src/lib/groq-api.ts to your project

3. Update Component
   - Change import from server function to groq-api utility
   - Update state from AnswerMathQuestionOutput to string
   - Update response handling: aiResponse.answer → aiResponse

4. Test
   - Navigate to /student/assistant
   - Ask a math question
   - Verify response appears

5. Deploy
   - Set NEXT_PUBLIC_GROQ_API_KEY in production environment
   - No other environment setup needed

✅ TESTING EXAMPLES:

- "Solve: 2x + 5 = 13"
- "What is the area of a triangle with base 10 and height 8?"
- "Simplify: 3(x + 2) - 2(x - 1)"
- "What is the slope between points (1,2) and (3,6)?"

*/

// ============================================================================
// KEY DIFFERENCES FROM GEMINI
// ============================================================================
/*

GEMINI:
- Required: @google/generative-ai SDK
- Required: Genkit server framework
- Required: Server-side route handler
- Used: GEMINI_API_KEY environment variable
- Models: gemini-2.0-flash

GROQ:
- No SDK needed (pure fetch)
- No server code needed (client-side)
- No route handler (direct to Groq API)
- Uses: REACT_APP_GROQ_API_KEY or NEXT_PUBLIC_GROQ_API_KEY
- Models: mixtral-8x7b-32768 (fast, high-quality)

ADVANTAGES:
✅ No external dependencies
✅ Faster API response time
✅ Client-side only (less infrastructure)
✅ Better cost efficiency
✅ Easier debugging (direct API calls)

*/

// ============================================================================
// FULL INTEGRATION PATTERN
// ============================================================================
/*

1. LAYER 1: Environment
   - NEXT_PUBLIC_GROQ_API_KEY in .env.local

2. LAYER 2: Utility (groq-api.ts)
   - getGroqApiKey() → Get from environment
   - answerMathQuestionWithGroq() → Call API

3. LAYER 3: Component (AssistantClient.tsx)
   - Form input handling
   - State management
   - Error handling

4. LAYER 4: UI (Page + CSS)
   - Card layout
   - Loading states
   - Error alerts
   - Response display

FLOW:
User Input
    ↓
Component validates with Zod
    ↓
Utility creates Groq API request
    ↓
Fetch request to Groq API
    ↓
Parse response
    ↓
Display or show error
    ↓
User sees answer or fallback message

*/

export const exampleCode = "See above for complete implementation";
