
// Summarize external learning resources using AI.
'use server';
/**
 * @fileOverview Summarizes external learning resources using AI.
 *
 * - summarizeLearningResource - A function that summarizes the provided learning resource content.
 * - SummarizeLearningResourceInput - The input type for the summarizeLearningResource function.
 * - SummarizeLearningResourceOutput - The return type for the summarizeLearningResource function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLearningResourceInputSchema = z.object({
  resourceContent: z.string().describe('The content of the learning resource to summarize.'),
});

export type SummarizeLearningResourceInput = z.infer<typeof SummarizeLearningResourceInputSchema>;

const SummarizeLearningResourceOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the learning resource.'),
});

export type SummarizeLearningResourceOutput = z.infer<typeof SummarizeLearningResourceOutputSchema>;

export async function summarizeLearningResource(input: SummarizeLearningResourceInput): Promise<SummarizeLearningResourceOutput> {
  return summarizeLearningResourceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeLearningResourcePrompt',
  input: {schema: SummarizeLearningResourceInputSchema},
  output: {schema: SummarizeLearningResourceOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing learning resources for Grade 10 math students.

  Summarize the following content, focusing on the key concepts and ideas. The summary should be concise and easy to understand for a Grade 10 student.

  Content: {{{resourceContent}}}`,
});

const summarizeLearningResourceFlow = ai.defineFlow(
  {
    name: 'summarizeLearningResourceFlow',
    inputSchema: SummarizeLearningResourceInputSchema,
    outputSchema: SummarizeLearningResourceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
