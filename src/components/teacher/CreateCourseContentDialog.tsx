"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type CourseContentItem, type QuestionType, type QuizQuestion } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MathKeyboard } from "../common/MathKeyboard";
import { toast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";

interface Section {
  id: string;
  name: string;
}

const questionSchema = z.object({
  id: z.string(), // ID is now required
  text: z.string().min(1, "Question text cannot be empty."),
  questionType: z.enum(['multipleChoice', 'identification', 'enumeration', 'problem-solving'], { required_error: "Please select a question type." }),
  options: z.array(z.string()).optional(),
  correctAnswerIndex: z.number().optional(),
  answerKey: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  topic: z.string().min(1, "Please enter a topic."), // Updated validation for Input field
  contentType: z.enum(["quiz", "lessonMaterial"]),
  sectionId: z.string().min(1, "Please select a section."),
  
  // Quiz specific
  questions: z.array(questionSchema).optional(),
  randomizeQuestions: z.boolean().optional(),
  timeLimitMinutes: z.coerce.number().min(0).optional(),
  
  // Lesson specific
  lessonContent: z.string().optional(),

  // Due Date (optional)
  dueDate: z.date().optional(),
});

export type CreateCourseContentFormData = z.infer<typeof formSchema>;

interface CreateCourseContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: CreateCourseContentFormData) => void;
  isLoading: boolean;
  initialData?: CourseContentItem;
  defaultContentType?: "quiz" | "lessonMaterial";
  allowedContentTypes?: ("quiz" | "lessonMaterial")[];
  sections?: Section[];
}

export function CreateCourseContentDialog({
  isOpen,
  onOpenChange,
  onSave,
  isLoading,
  initialData,
  defaultContentType = "quiz",
  allowedContentTypes = ["quiz", "lessonMaterial"],
  sections = [],
}: CreateCourseContentDialogProps) {

  const form = useForm<CreateCourseContentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contentType: defaultContentType,
      randomizeQuestions: false,
      timeLimitMinutes: 0,
      sectionId: "",
    },
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  });
  
  const questionInputRefs = useRef<(HTMLTextAreaElement | HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialData && isOpen) {
      form.reset({
        ...initialData,
        contentType: initialData.contentType,
        questions: initialData.contentType === 'quiz' ? (initialData.content as any).questions : [],
        lessonContent: initialData.contentType === 'lessonMaterial' ? (initialData.content as any).content : '',
        randomizeQuestions: initialData.contentType === 'quiz' ? (initialData.content as any).randomizeQuestions || false : false,
        timeLimitMinutes: initialData.contentType === 'quiz' ? (initialData.content as any).timeLimitMinutes || 0 : 0,
        dueDate: initialData.dueDate ? initialData.dueDate.toDate() : undefined,
        sectionId: initialData.sectionId || "",
      });
    } else if (!initialData && isOpen) {
      // When creating new content, automatically add default questions for quizzes
      const defaultValues = {
        contentType: defaultContentType,
        title: "",
        description: "",
        topic: "",
        sectionId: "",
        questions: defaultContentType === "quiz" ? createDefaultQuestions() : [],
        lessonContent: "",
        randomizeQuestions: false,
        timeLimitMinutes: 0,
        dueDate: undefined,
      };
      form.reset(defaultValues);
    }
  }, [initialData, isOpen, form, defaultContentType]);

  const contentType = form.watch("contentType");
  const topicSlug = form.watch("topic");

  // Function to create default questions
  const createDefaultQuestions = (): QuizQuestion[] => {
    return [
      {
        id: `question_1_${Math.random().toString(36).substring(2, 9)}`,
        text: "",
        questionType: "multipleChoice",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        explanation: "",
      },
      {
        id: `question_2_${Math.random().toString(36).substring(2, 9)}`,
        text: "",
        questionType: "multipleChoice",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        explanation: "",
      },
      {
        id: `question_3_${Math.random().toString(36).substring(2, 9)}`,
        text: "",
        questionType: "multipleChoice",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        explanation: "",
      },
    ];
  };

  // Automatically add questions when content type changes to quiz
  useEffect(() => {
    if (contentType === "quiz" && fields.length === 0 && !initialData) {
      const defaultQuestions = createDefaultQuestions();
      defaultQuestions.forEach(question => {
        append(question);
      });
    }
  }, [contentType, initialData]);

  const addQuestion = () => {
    append({
      id: `manual_${Math.random().toString(36).substring(2, 9)}`,
      text: "",
      questionType: "multipleChoice",
      options: ["", "", "", ""],
      correctAnswerIndex: 0,
      answerKey: [],
      explanation: "",
    });
  };

  const onSubmit = (data: CreateCourseContentFormData) => {
    // Sanitize questions to remove any undefined fields before saving
    if (data.contentType === 'quiz' && data.questions) {
      data.questions = data.questions.map(q => {
        const cleanQuestion: QuizQuestion = {
          id: q.id || `new_${Math.random().toString(36).substring(2, 9)}`,
          text: q.text,
          questionType: q.questionType,
          explanation: q.explanation || '',
        };

        if (q.questionType === 'multipleChoice') {
          cleanQuestion.options = q.options || ['', '', '', ''];
          cleanQuestion.correctAnswerIndex = q.correctAnswerIndex ?? 0;
        } else {
          cleanQuestion.answerKey = q.answerKey || [];
        }
        
        // Remove any remaining undefined keys, just in case
        Object.keys(cleanQuestion).forEach(key => (cleanQuestion as any)[key] === undefined && delete (cleanQuestion as any)[key]);

        return cleanQuestion;
      });
    }

    onSave(data);
  };
  
  const handleKeyboardInsert = (index: number, fieldName: `questions.${number}.text` | `questions.${number}.answerKey`, text: string) => {
    const currentVal = form.getValues(fieldName) as string[] | string || "";
    
    // For answerKey which is string[]
    if (Array.isArray(currentVal)) {
        const currentString = currentVal.join('\n');
        const newValue = currentString + text;
        form.setValue(fieldName, newValue.split('\n') as any);
    } else { // For question text which is string
        const newValue = currentVal + text;
        form.setValue(fieldName, newValue as any);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Create'} Content</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the details for your content.' : 'Fill out the form to create new content for your students.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[calc(80vh-150px)] pr-6">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Algebra Basics Quiz" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Math Topic</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Algebra, Geometry, Calculus" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the math topic for this content.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Provide a brief description of this content..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sections.map(section => (
                              <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : undefined;
                              field.onChange(date);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Set a deadline for this content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


                {contentType === "quiz" && (
                <div className="space-y-4 pt-4 border-t">
                     <div className="flex justify-between items-center">
                       <h3 className="text-lg font-medium">Quiz Questions</h3>
                       <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                       </Button>
                     </div>
                     
                     <p className="text-sm text-muted-foreground">
                       {fields.length} question{fields.length !== 1 ? 's' : ''} added. Fill in the question text, options, and correct answers.
                     </p>
                     
                     <Separator />
                     
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="randomizeQuestions"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Randomize Questions</FormLabel>
                                    <FormDescription>Shuffle question order for each student.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="timeLimitMinutes"
                            render={({ field }) => (
                                <FormItem className="rounded-lg border p-3 shadow-sm">
                                    <FormLabel>Time Limit (minutes)</FormLabel>
                                    <FormControl><Input type="number" placeholder="0 for no limit" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                  
                  {fields.map((field, index) => {
                    const questionType = form.watch(`questions.${index}.questionType`);
                    return (
                    <div key={field.id} className="space-y-3 p-4 border rounded-md relative bg-muted/20">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Question {index + 1}</p>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`questions.${index}.text`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Text</FormLabel>
                              <FormControl><Textarea 
                                placeholder="Enter your question here..."
                                {...field} 
                              /></FormControl>
                              <FormMessage />
                               {topicSlug && <MathKeyboard topic={topicSlug} onInsert={(text) => handleKeyboardInsert(index, `questions.${index}.text`, text)} />}
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`questions.${index}.questionType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="multipleChoice">Multiple Choice</SelectItem>
                                  <SelectItem value="identification">Identification</SelectItem>
                                  <SelectItem value="enumeration">Enumeration</SelectItem>
                                  <SelectItem value="problem-solving">Problem Solving</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {questionType === 'multipleChoice' && (
                        <div className="space-y-2">
                           <FormLabel>Options & Correct Answer</FormLabel>
                            <FormField
                                control={form.control}
                                name={`questions.${index}.correctAnswerIndex`}
                                render={({ field: radioField }) => (
                                    <FormItem>
                                    <RadioGroup
                                        onValueChange={(val) => radioField.onChange(parseInt(val))}
                                        value={radioField.value?.toString()}
                                        className="space-y-2"
                                    >
                                    {[0, 1, 2, 3].map(optIndex => (
                                        <div key={optIndex} className="flex items-center gap-2">
                                        <FormControl>
                                            <RadioGroupItem value={optIndex.toString()} id={`q${index}o${optIndex}`} />
                                        </FormControl>
                                        <FormField
                                            control={form.control}
                                            name={`questions.${index}.options.${optIndex}`}
                                            render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                  <Input 
                                                    placeholder={`Option ${optIndex + 1}`} 
                                                    {...field} 
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                        </div>
                                    ))}
                                    </RadioGroup>
                                    </FormItem>
                                )}/>
                        </div>
                      )}

                      {(questionType === 'identification' || questionType === 'enumeration' || questionType === 'problem-solving') && (
                         <FormField
                            control={form.control}
                            name={`questions.${index}.answerKey`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Answer Key</FormLabel>
                                <FormDescription>{questionType === 'identification' ? 'Enter the exact correct answer.' : 'Enter each correct item on a new line.'}</FormDescription>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={Array.isArray(field.value) ? field.value.join('\n') : ''} 
                                    onChange={e => field.onChange(e.target.value.split('\n'))}
                                    placeholder={questionType === 'identification' ? 'Enter correct answer...' : 'Enter each item on a new line...'}
                                  />
                                </FormControl>
                                <FormMessage />
                                {topicSlug && <MathKeyboard topic={topicSlug} onInsert={(text) => handleKeyboardInsert(index, `questions.${index}.answerKey`, text)} />}
                                </FormItem>
                            )}
                        />
                      )}
                      
                        <FormField
                            control={form.control}
                            name={`questions.${index}.explanation`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Explanation (Optional)</FormLabel>
                                <FormDescription>A brief explanation of the solution.</FormDescription>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ''} 
                                    placeholder="Optional explanation for the answer..."
                                  />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                    </div>
                  )})}

                </div>
              )}
            </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Save Changes' : 'Create Content'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
