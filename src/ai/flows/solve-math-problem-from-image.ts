
'use server';

/**
 * @fileOverview An AI agent for solving Grade 10 math problems from an image.
 *
 * - solveMathProblemFromImage - A function that handles the image-based problem-solving process.
 * - SolveMathProblemFromImageInput - The input type for the function.
 * - SolveMathProblemFromImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SolveMathProblemFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a math problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().optional().describe('Optional additional context or instructions about the problem.'),
});
export type SolveMathProblemFromImageInput = z.infer<typeof SolveMathProblemFromImageInputSchema>;

const SolveMathProblemFromImageOutputSchema = z.object({
  solution: z.string().describe('The answer to the math problem with a detailed, step-by-step explanation.'),
});
export type SolveMathProblemFromImageOutput = z.infer<typeof SolveMathProblemFromImageOutputSchema>;

export async function solveMathProblemFromImage(input: SolveMathProblemFromImageInput): Promise<SolveMathProblemFromImageOutput> {
  return solveMathProblemFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'solveMathProblemFromImagePrompt',
  input: {schema: SolveMathProblemFromImageInputSchema},
  output: {schema: SolveMathProblemFromImageOutputSchema},
  prompt: `You are an expert AI Math Assistant that specializes in Grade 10 math.

Analyze the image provided, which contains a math problem. Use the optional user-provided description for additional context.

Your task is to identify the problem, solve it, and provide a clear, step-by-step explanation of how to arrive at the solution. Ensure the explanation is easy for a Grade 10 student to understand.

{{#if description}}
User's additional context: {{{description}}}
{{/if}}

Problem Image:
{{media url=photoDataUri}}`,
});

const solveMathProblemFromImageFlow = ai.defineFlow(
  {
    name: 'solveMathProblemFromImageFlow',
    inputSchema: SolveMathProblemFromImageInputSchema,
    outputSchema: SolveMathProblemFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
