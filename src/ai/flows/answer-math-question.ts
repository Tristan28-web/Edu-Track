
'use server';

/**
 * @fileOverview An AI agent for answering Grade 10 math questions with step-by-step explanations.
 *
 * - answerMathQuestion - A function that handles the question answering process.
 * - AnswerMathQuestionInput - The input type for the answerMathQuestion function.
 * - AnswerMathQuestionOutput - The return type for the answerMathQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerMathQuestionInputSchema = z.object({
  question: z.string().describe('A Grade 10 math question.'),
});
export type AnswerMathQuestionInput = z.infer<typeof AnswerMathQuestionInputSchema>;

const AnswerMathQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question with a step-by-step explanation.'),
});
export type AnswerMathQuestionOutput = z.infer<typeof AnswerMathQuestionOutputSchema>;

export async function answerMathQuestion(input: AnswerMathQuestionInput): Promise<AnswerMathQuestionOutput> {
  return answerMathQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerMathQuestionPrompt',
  input: {schema: AnswerMathQuestionInputSchema},
  output: {schema: AnswerMathQuestionOutputSchema},
  prompt: `You are an AI Math Assistant that specializes in Grade 10 math. Answer the following question with a step-by-step explanation:

Question: {{{question}}}`,
});

const answerMathQuestionFlow = ai.defineFlow(
  {
    name: 'answerMathQuestionFlow',
    inputSchema: AnswerMathQuestionInputSchema,
    outputSchema: AnswerMathQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
