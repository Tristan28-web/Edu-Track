
'use server';

/**
 * @fileOverview Generates Grade 10 math problems on a specific topic.
 *
 * - generateMathProblems - A function that generates math problems.
 * - GenerateMathProblemsInput - The input type for the generateMathProblems function.
 * - GenerateMathProblemsOutput - The return type for the generateMathProblems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMathProblemsInputSchema = z.object({
  topic: z.string().describe('The specific math topic for which problems should be generated (e.g., algebra, geometry, trigonometry).'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the problems.'),
  number: z.number().describe('The number of problems to generate.'),
});

export type GenerateMathProblemsInput = z.infer<typeof GenerateMathProblemsInputSchema>;

const GenerateMathProblemsOutputSchema = z.object({
  problems: z.array(z.string()).describe('An array of generated math problems for the specified topic and difficulty.'),
});

export type GenerateMathProblemsOutput = z.infer<typeof GenerateMathProblemsOutputSchema>;

export async function generateMathProblems(input: GenerateMathProblemsInput): Promise<GenerateMathProblemsOutput> {
  return generateMathProblemsFlow(input);
}

const generateMathProblemsPrompt = ai.definePrompt({
  name: 'generateMathProblemsPrompt',
  input: {schema: GenerateMathProblemsInputSchema},
  output: {schema: GenerateMathProblemsOutputSchema},
  prompt: `You are an expert Grade 10 math teacher. Generate {{number}} math problems for the topic of {{{topic}}} with {{{difficulty}}} difficulty.`,
});

const generateMathProblemsFlow = ai.defineFlow(
  {
    name: 'generateMathProblemsFlow',
    inputSchema: GenerateMathProblemsInputSchema,
    outputSchema: GenerateMathProblemsOutputSchema,
  },
  async input => {
    const {output} = await generateMathProblemsPrompt(input);
    return output!;
  }
);
