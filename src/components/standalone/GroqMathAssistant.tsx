/**
 * @fileOverview Standalone AI Math Assistant Component with Groq API Integration
 * 
 * This is a complete, ready-to-drop React component that demonstrates
 * how to integrate the Groq API for a Grade 10 Math Assistant.
 * 
 * Features:
 * - Client-side only implementation (no server-side calls required)
 * - Direct fetch-based calls to Groq API
 * - Comprehensive error handling with user-friendly fallback messages
 * - Form validation with react-hook-form and zod
 * - Loading states and UI feedback
 * - Markdown-style response formatting
 * 
 * Environment Setup:
 * Add to your .env.local or .env file:
 * REACT_APP_GROQ_API_KEY=your-groq-api-key-here
 * 
 * or for Next.js public access:
 * NEXT_PUBLIC_GROQ_API_KEY=your-groq-api-key-here
 * 
 * Usage:
 * <StandaloneGroqMathAssistant />
 */

"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Sparkles, Bot, X, AlertCircle } from "lucide-react";

/**
 * Zod schema for form validation
 * Ensures the question is at least 5 characters long
 */
const MathQuestionSchema = z.object({
  question: z
    .string()
    .min(5, { message: "Question must be at least 5 characters long." }),
});

type MathQuestionFormData = z.infer<typeof MathQuestionSchema>;

/**
 * Interface for Groq API request body
 */
interface GroqRequest {
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
}

/**
 * Interface for Groq API response body
 */
interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Get the Groq API key from environment variables
 * Supports multiple environment variable names for flexibility
 * @returns The API key or null if not found
 */
function getGroqApiKey(): string | null {
  // Check multiple possible environment variable names
  const apiKey =
    process.env.REACT_APP_GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    (typeof window !== "undefined" && (window as any).REACT_APP_GROQ_API_KEY);

  return apiKey || null;
}

/**
 * Call Groq API to answer a math question
 * @param question - The math question to answer
 * @returns The AI-generated answer with step-by-step explanation
 * @throws Error if API key is missing or API call fails
 */
async function callGroqAPI(question: string): Promise<string> {
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    throw new Error(
      "Groq API key not configured. Please set REACT_APP_GROQ_API_KEY environment variable."
    );
  }

  // Step 1: Construct the request payload
  const requestPayload: GroqRequest = {
    model: "mixtral-8x7b-32768", // Fast and reliable model by Groq
    messages: [
      {
        role: "system",
        content:
          "You are an expert Grade 10 math tutor. When answering questions, provide clear step-by-step explanations with intermediate steps shown. Use mathematical notation where appropriate. Format your response clearly.",
      },
      {
        role: "user",
        content: `Please answer this Grade 10 math question with a detailed step-by-step explanation:\n\n${question}`,
      },
    ],
    temperature: 0.7, // Balanced between creativity and consistency
    max_tokens: 2048, // Allow reasonably long responses
  };

  try {
    // Step 2: Make the fetch request to Groq API endpoint
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    // Step 3: Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Groq API error response:", errorData);
      throw new Error(
        `Groq API returned ${response.status}: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    // Step 4: Parse the response
    const data: GroqResponse = await response.json();

    // Step 5: Extract and validate the answer
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response choices from Groq API");
    }

    const answer = data.choices[0].message.content;

    if (!answer) {
      throw new Error("Empty response from Groq API");
    }

    // Step 6: Return the answer
    return answer;
  } catch (error) {
    console.error("Groq API call failed:", error);
    throw error;
  }
}

/**
 * Main standalone AI Math Assistant component
 * Complete, self-contained component ready to be dropped into any React/Next.js app
 */
export function StandaloneGroqMathAssistant() {
  // State management
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup with validation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MathQuestionFormData>({
    resolver: zodResolver(MathQuestionSchema),
    defaultValues: {
      question: "",
    },
  });

  /**
   * Handle form submission
   * Step 1: Validate input
   * Step 2: Call Groq API
   * Step 3: Display response or error
   */
  const onSubmit: SubmitHandler<MathQuestionFormData> = async (data) => {
    // Step 1: Clear previous states
    setIsLoading(true);
    setError(null);
    setAiResponse(null);

    try {
      // Step 2: Call Groq API to get the answer
      const response = await callGroqAPI(data.question);

      // Step 3: Display the response
      setAiResponse(response);

      // Step 4: Clear the form input for next question
      reset();
    } catch (err) {
      // Step 5: Handle errors with user-friendly message
      console.error("Failed to get answer from AI:", err);
      setError(
        "Sorry, I couldn't process your question right now. Please try again."
      );
    } finally {
      // Step 6: End loading state
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          AI Math Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Ask your Grade 10 math questions and get step-by-step explanations
          powered by Groq AI.
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          {/* Question Input Label */}
          <label
            htmlFor="math-question"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Your Math Question
          </label>

          {/* Question Input Field */}
          <textarea
            id="math-question"
            placeholder="Enter your Grade 10 math question here..."
            className="w-full min-h-[120px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            {...register("question")}
          />

          {/* Validation Error Display */}
          {errors.question && (
            <p className="text-red-500 text-sm font-medium">
              {errors.question.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting Answer...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Ask Question
            </>
          )}
        </button>
      </form>

      {/* Error Alert Section */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200">
              Error
            </h3>
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* AI Response Section */}
      {aiResponse && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          {/* Response Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              AI Generated Answer
            </h2>

            {/* Close Response Button */}
            <button
              onClick={() => setAiResponse(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Close response"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Response Body */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10">
            <div className="prose dark:prose-invert max-w-none">
              {/* Display response with line breaks preserved */}
              <div
                className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-sm"
                dangerouslySetInnerHTML={{
                  __html: aiResponse.replace(/\n/g, "<br />"),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export default for convenience
 */
export default StandaloneGroqMathAssistant;
