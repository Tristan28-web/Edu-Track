'use server';

/**
 * @fileOverview An AI agent for generating math quiz questions based on topic, difficulty, and grade level.
  *
   * - generateQuizQuestions - A function that handles the question generation process.
    * - GenerateQuizQuestionsInput - The input type for the function.
     * - GenerateQuizQuestionsOutput - The return type for the function.
      */
      
      import { ai } from '@/ai/genkit';
      import { z } from 'zod';
      import { QuizQuestion } from '@/types';
      
      const GenerateQuizQuestionsInputSchema = z.object({
        topic: z.string().describe('The specific math topic for the quiz (e.g., algebra, geometry).'),
          difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the questions.'),
            numQuestions: z.number().int().min(1).max(15).default(5).describe('The number of questions to generate.'),
              gradeLevel: z.string().describe('The target grade level for the quiz questions (e.g., "Grade 7", "Grade 8", "Grade 9", "Grade 10").'),
              });
              
              export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;
              
              const QuizQuestionSchema = z.object({
                  question: z.string().describe("The text of the question. Max 2 sentences."),
                      type: z.enum(["multiple-choice", "identification", "problem-solving"]).describe("The type of the question."),
                          choices: z.array(z.string()).optional().describe("An array of 4 strings for multiple-choice options. Required only if type is 'multiple-choice'."),
                              answer: z.string().describe("The correct answer. For multiple-choice, this should be the text of the correct choice (e.g., 'A'). For other types, it's the direct answer."),
                                  explanation: z.string().describe("A short, step-by-step explanation for the correct answer. Max 2 sentences."),
                                  });
                                  
                                  
                                  const GenerateQuizQuestionsOutputSchema = z.object({
                                      questions: z.array(QuizQuestionSchema).describe('An array of generated quiz questions.')
                                      });
                                      
                                      export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;
                                      
                                      
                                      export async function generateQuizQuestions(input: GenerateQuizQuestionsInput): Promise<GenerateQuizQuestionsOutput> {
                                          try {
                                                  const result = await generateQuizQuestionsFlow(input);
                                                          // Add a temporary ID to each question for useFieldArray key
                                                                  if (result.questions) {
                                                                              result.questions = result.questions.map(q => ({...q, id: `temp_${Math.random().toString(36).substring(2, 9)}`}));
                                                                                      }
                                                                                              return result;
                                                                                                  } catch (err: any) {
                                                                                                          // Log the full error on the server for debugging
                                                                                                                  // Include digest if it's available from Next's error wrapper
                                                                                                                          console.error('generateQuizQuestions error:', err);
                                                                                                                                  const digest = err?.digest ? ` (digest: ${err.digest})` : '';
                                                                                                                                          throw new Error(`AI generation failed${digest}: ${err?.message ?? String(err)}`);
                                                                                                                                              }
                                                                                                                                              }
                                                                                                                                              
                                                                                                                                              
                                                                                                                                              const prompt = ai.definePrompt({
                                                                                                                                                  name: 'generateQuizQuestionsPrompt',
                                                                                                                                                      input: { schema: GenerateQuizQuestionsInputSchema },
                                                                                                                                                          output: { schema: GenerateQuizQuestionsOutputSchema },
                                                                                                                                                              prompt: `You are an AI Quiz Generator for Edu-Track. Your task is to create a set of {{{gradeLevel}}} Math quiz questions.
                                                                                                                                                              
                                                                                                                                                              Instructions:
                                                                                                                                                              - The topic is: {{{topic}}}.
                                                                                                                                                              - The difficulty level is: {{{difficulty}}}.
                                                                                                                                                              - The response must contain exactly {{numQuestions}} questions. No more, no less.
                                                                                                                                                              - Each question must be unique and should not repeat.
                                                                                                                                                              - The questions must cover different aspects of the topic.
                                                                                                                                                              - Support different formats: multiple-choice, identification, and problem-solving.
                                                                                                                                                              - Each question's text must be short (max 2 sentences).
                                                                                                                                                              - For each question, provide the correct answer and a short step-by-step explanation (max 2 sentences).
                                                                                                                                                              - For multiple-choice questions, provide exactly 4 choices.
                                                                                                                                                              - Randomize values in problems so every generated question is different.
                                                                                                                                                              - Your entire response MUST be a valid JSON object matching the requested schema. Ensure the "questions" array contains exactly {{numQuestions}} items.
                                                                                                                                                              `,
                                                                                                                                                              });
                                                                                                                                                              
                                                                                                                                                              const generateQuizQuestionsFlow = ai.defineFlow(
                                                                                                                                                                  {
                                                                                                                                                                          name: 'generateQuizQuestionsFlow',
                                                                                                                                                                                  inputSchema: GenerateQuizQuestionsInputSchema,
                                                                                                                                                                                          outputSchema: GenerateQuizQuestionsOutputSchema,
                                                                                                                                                                                              },
                                                                                                                                                                                                  async (input) => {
                                                                                                                                                                                                          const { output } = await prompt(input);
                                                                                                                                                                                                                  if (!output) {
                                                                                                                                                                                                                              throw new Error("AI failed to generate quiz questions.");
                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                              return output;
                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                  );
