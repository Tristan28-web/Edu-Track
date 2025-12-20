
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { answerMathQuestion, type AnswerMathQuestionOutput } from '@/ai/flows/answer-math-question';
import { Loader2, Sparkles, Bot, X } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  question: z.string().min(5, { message: "Question must be at least 5 characters long." }),
});

type FormData = z.infer<typeof formSchema>;

export function AssistantClient() {
  const [aiResponse, setAiResponse] = useState<AnswerMathQuestionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAiResponse(null);
    try {
      const response = await answerMathQuestion({ question: data.question });
      setAiResponse(response);
      form.reset(); // Clear the form input after successful submission
    } catch (err) {
      console.error("Error calling AI assistant:", err);
      setError("Sorry, I couldn't process your question right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="shadow-md h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                    <Sparkles className="h-6 w-6" />
                    Ask the AI Math Assistant
                </CardTitle>
                <CardDescription>
                    Enter your Grade 10 math question below and get a step-by-step explanation.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <FormField
                    control={form.control}
                    name="question"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel htmlFor="math-question" className="sr-only">Your Math Question</FormLabel>
                        <FormControl>
                        <Textarea
                            id="math-question"
                            placeholder="Enter your Grade 10 math question here..."
                            className="min-h-[120px] text-base"
                            disabled={isLoading} // Textarea disabled during loading
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto font-semibold">
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

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {aiResponse && (
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1.5">
                <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                    <Bot className="h-6 w-6" />
                    AI Generated Answer
                </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setAiResponse(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="bg-secondary/20 p-4 rounded-md">
                <div 
                    className="whitespace-pre-wrap text-foreground/90 leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: aiResponse.answer.replace(/\n/g, '<br />') }} 
                />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
