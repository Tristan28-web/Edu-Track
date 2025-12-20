
'use server';

/**
 * @fileOverview Generates a hint for a given Grade 10 math problem.
 *
 * - generateMathHint - A function that generates a hint.
 * - GenerateMathHintInput - The input type for the generateMathHint function.
 * - GenerateMathHintOutput - The return type for the generateMathHint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMathHintInputSchema = z.object({
  problem: z.string().describe('The Grade 10 math problem for which a hint is needed.'),
});
export type GenerateMathHintInput = z.infer<typeof GenerateMathHintInputSchema>;

const GenerateMathHintOutputSchema = z.object({
  hint: z.string().describe('A helpful, concise hint for the math problem that guides the student without giving away the final answer.'),
});
export type GenerateMathHintOutput = z.infer<typeof GenerateMathHintOutputSchema>;

export async function generateMathHint(input: GenerateMathHintInput): Promise<GenerateMathHintOutput> {
  return generateMathHintFlow(input);
}

const generateMathHintPrompt = ai.definePrompt({
  name: 'generateMathHintPrompt',
  input: {schema: GenerateMathHintInputSchema},
  output: {schema: GenerateMathHintOutputSchema},
  prompt: `You are a helpful Grade 10 math tutor. A student needs a hint for the following problem. Provide a concise hint that helps them think about the next step or the right concept to use, but do not give away the solution.

Problem: {{{problem}}}

Generate a hint.`,
});

const generateMathHintFlow = ai.defineFlow(
  {
    name: 'generateMathHintFlow',
    inputSchema: GenerateMathHintInputSchema,
    outputSchema: GenerateMathHintOutputSchema,
  },
  async input => {
    const {output} = await generateMathHintPrompt(input);
    return output!;
  }
);
