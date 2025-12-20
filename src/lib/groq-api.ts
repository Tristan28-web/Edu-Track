/**
 * @fileOverview Groq API client for client-side math question answering
 * 
 * This module provides a pure client-side utility to interact with the Groq API.
 * It requires the REACT_APP_GROQ_API_KEY environment variable to be set.
 * 
 * Usage:
 * const answer = await answerMathQuestionWithGroq("What is 2 + 2?");
 */

/**
 * Interface for the Groq API request body
 */
interface GroqRequestBody {
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
}

/**
 * Interface for the Groq API response
 */
interface GroqResponseBody {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Get the Groq API key from environment variables
 * @returns The API key or null if not configured
 */
function getGroqApiKey(): string | null {
  // Check for environment variable (works with Next.js env variables)
  const apiKey =
    process.env.REACT_APP_GROQ_API_KEY ||
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    (typeof window !== "undefined" &&
      (window as any).REACT_APP_GROQ_API_KEY);

  return apiKey || null;
}

/**
 * Answer a Grade 10 math question using Groq API
 * @param question - The math question to answer
 * @returns A step-by-step answer to the question
 * @throws Error if API key is not configured or API call fails
 */
export async function answerMathQuestionWithGroq(
  question: string
): Promise<string> {
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    throw new Error(
      "Groq API key not configured. Please set REACT_APP_GROQ_API_KEY environment variable."
    );
  }

  // Validate input
  if (!question || question.trim().length === 0) {
    throw new Error("Question cannot be empty");
  }

  try {
    // Prepare the request body for Groq API
    const requestBody: GroqRequestBody = {
      model: "mixtral-8x7b-32768", // Groq's recommended model for fast responses
      messages: [
        {
          role: "system",
          content:
            "You are an expert Grade 10 math tutor. When answering questions, provide clear step-by-step explanations with intermediate steps shown. Use mathematical notation where appropriate.",
        },
        {
          role: "user",
          content: `Please answer this Grade 10 math question with a detailed step-by-step explanation:\n\n${question}`,
        },
      ],
      temperature: 0.7, // Moderate creativity for consistent answers
      max_tokens: 2048, // Allow reasonably long responses
    };

    // Make the API call to Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Groq API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    // Parse the response
    const data: GroqResponseBody = await response.json();

    // Extract the answer from the response
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response received from Groq API");
    }

    const answer = data.choices[0].message.content;

    if (!answer) {
      throw new Error("Empty response from Groq API");
    }

    return answer;
  } catch (error) {
    // Log the error for debugging
    console.error("Groq API call failed:", error);

    // Re-throw the error to be handled by the caller
    throw error;
  }
}
