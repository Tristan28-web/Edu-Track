
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { generateMathProblems, type GenerateMathProblemsOutput } from '@/ai/flows/generate-math-problems';
import { generateMathHint, type GenerateMathHintOutput } from '@/ai/flows/generate-math-hint';
import { Loader2, Sparkles, Lightbulb, Bot, X, BookCopy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { mathTopics } from '@/config/topics';

// Schema for Problem Generator
const problemGeneratorSchema = z.object({
  topic: z.string().min(1, "Please select a topic."),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  number: z.coerce.number().min(1).max(5),
});
type ProblemGeneratorData = z.infer<typeof problemGeneratorSchema>;

// Schema for Hint Generator
const hintGeneratorSchema = z.object({
  problem: z.string().min(10, "Problem must be at least 10 characters long."),
});
type HintGeneratorData = z.infer<typeof hintGeneratorSchema>;


export function AssistantFeatures() {
  const [generatedProblems, setGeneratedProblems] = useState<GenerateMathProblemsOutput | null>(null);
  const [generatedHint, setGeneratedHint] = useState<GenerateMathHintOutput | null>(null);
  const [isGeneratingProblems, setIsGeneratingProblems] = useState(false);
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);

  const problemForm = useForm<ProblemGeneratorData>({
    resolver: zodResolver(problemGeneratorSchema),
    defaultValues: { topic: "algebra-and-polynomials", difficulty: 'medium', number: 3 },
  });

  const hintForm = useForm<HintGeneratorData>({
    resolver: zodResolver(hintGeneratorSchema),
    defaultValues: { problem: "" },
  });

  const onProblemSubmit: SubmitHandler<ProblemGeneratorData> = async (data) => {
    setIsGeneratingProblems(true);
    setProblemError(null);
    setGeneratedProblems(null);
    try {
        const topicTitle = mathTopics.find(t => t.slug === data.topic)?.title || data.topic;
        const response = await generateMathProblems({ ...data, topic: topicTitle });
        setGeneratedProblems(response);
    } catch (err) {
      console.error("Error generating problems:", err);
      setProblemError("Sorry, I couldn't generate problems right now. Please try again.");
    } finally {
      setIsGeneratingProblems(false);
    }
  };
  
  const onHintSubmit: SubmitHandler<HintGeneratorData> = async (data) => {
    setIsGeneratingHint(true);
    setHintError(null);
    setGeneratedHint(null);
    try {
      const response = await generateMathHint({ problem: data.problem });
      setGeneratedHint(response);
      hintForm.reset();
    } catch (err) {
      console.error("Error generating hint:", err);
      setHintError("Sorry, I couldn't generate a hint right now. Please try again.");
    } finally {
      setIsGeneratingHint(false);
    }
  };

  return (
    <div className="space-y-8">
        
      <div className="grid grid-cols-1 md:grid-cols-1 gap-8 items-start">
        {/* Problem Generator */}
        <Form {...problemForm}>
            <form onSubmit={problemForm.handleSubmit(onProblemSubmit)}>
                <Card className="shadow-md h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                           <BookCopy className="h-6 w-6" /> Practice Problem Generator
                        </CardTitle>
                        <CardDescription>Generate custom math problems to test your skills.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={problemForm.control} name="topic" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Topic</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>{mathTopics.map(t => <SelectItem key={t.slug} value={t.slug}>{t.title}</SelectItem>)}</SelectContent>
                                </Select><FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={problemForm.control} name="difficulty" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Difficulty</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField control={problemForm.control} name="number" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number</FormLabel>
                                <FormControl><Input type="number" min="1" max="5" {...field} /></FormControl><FormMessage/>
                            </FormItem>
                        )}/>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isGeneratingProblems} className="w-full md:w-auto font-semibold">
                            {isGeneratingProblems ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Problems</>}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
        {problemError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{problemError}</AlertDescription></Alert>}
        {generatedProblems && (
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6" /> Generated Problems</CardTitle>
                    </div>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setGeneratedProblems(null)}
                        aria-label="Close"
                        >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <ol className="list-decimal list-inside space-y-2">
                    {generatedProblems.problems.map((p, i) => (
                        <li key={i} className="bg-secondary/20 p-3 rounded-md">{p}</li>
                    ))}
                    </ol>
                </CardContent>
            </Card>
        )}

        {/* Hint Generator */}
        <Form {...hintForm}>
            <form onSubmit={hintForm.handleSubmit(onHintSubmit)}>
                <Card className="shadow-md h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                           <Lightbulb className="h-6 w-6" /> Hint Generator
                        </CardTitle>
                        <CardDescription>Get a little help without giving away the answer.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <FormField control={hintForm.control} name="problem" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Paste the problem you're stuck on:</FormLabel>
                                <FormControl><Textarea placeholder="e.g., 'What is the value of x in the equation 2x + 5 = 15?'" {...field} /></FormControl><FormMessage/>
                            </FormItem>
                        )}/>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isGeneratingHint} className="w-full md:w-auto font-semibold">
                             {isGeneratingHint ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Getting Hint...</> : <><Sparkles className="mr-2 h-4 w-4" />Get Hint</>}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
        {hintError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{hintError}</AlertDescription></Alert>}
        {generatedHint && (
             <Card className="shadow-md">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6" /> Here's a Hint</CardTitle>
                    </div>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setGeneratedHint(null)}
                        aria-label="Close"
                        >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <div className="bg-secondary/20 p-4 rounded-md">{generatedHint.hint}</div>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
