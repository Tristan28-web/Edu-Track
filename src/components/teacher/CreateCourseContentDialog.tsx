
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription as FormDescriptionComponent,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, PlusCircle, Trash2, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { mathTopics } from "@/config/topics";
import type { CourseContentItem, CourseContentItemType, QuizDetails, LessonMaterialDetails, QuestionType } from "@/types";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";


const quizQuestionSchema = z.object({
  id: z.string(), 
  text: z.string().min(5, "Question text must be at least 5 characters."),
  questionType: z.enum(['multipleChoice', 'identification', 'enumeration']),
  options: z.array(z.string()).optional(),
  correctAnswerIndex: z.coerce.number().optional(),
  answerKey: z.array(z.string()).optional(), 
  answerKeyString: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.questionType === 'multipleChoice') {
        if (!data.options || data.options.length !== 4 || data.options.some(o => o.trim() === '')) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "All 4 options are required for multiple choice.", path: ['options'] });
        }
        if (data.correctAnswerIndex === undefined || data.correctAnswerIndex < 0 || data.correctAnswerIndex > 3) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A correct answer must be selected.", path: ['correctAnswerIndex'] });
        }
    }
    if (data.questionType === 'identification') {
        const answer = (data.answerKey && data.answerKey[0]) ? data.answerKey[0] : "";
        if (!answer || answer.trim() === "") {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A correct answer is required for identification.", path: ['answerKey', 0] });
        }
    }
    if (data.questionType === 'enumeration') {
        if (!data.answerKeyString || data.answerKeyString.trim().split('\n').filter(Boolean).length < 2) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least two items are required for enumeration, each on a new line.", path: ['answerKeyString'] });
        }
    }
});


const baseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  topic: z.string().min(1, "Please select a topic."),
  contentType: z.enum(["quiz", "lessonMaterial"]),
  gradingPeriod: z.string().optional(),
});

const formSchema = z.discriminatedUnion("contentType", [
    baseFormSchema.extend({
        contentType: z.literal("quiz"),
        dueDate: z.date().optional(),
        questions: z.array(quizQuestionSchema).min(1, "Quizzes must have at least one question."),
        randomizeQuestions: z.boolean().optional(),
        timeLimitMinutes: z.coerce.number().optional(),
    }),
    baseFormSchema.extend({
        contentType: z.literal("lessonMaterial"),
        mainContent: z.string().min(10, "Lesson content must be at least 10 characters."),
        scheduledOn: z.date().optional(),
    }),
]);


export type CreateCourseContentFormData = z.infer<typeof formSchema>;

interface CreateCourseContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: CreateCourseContentFormData) => Promise<void>;
  initialData?: CourseContentItem;
  isLoading: boolean;
  defaultContentType?: CourseContentItemType;
  allowedContentTypes?: CourseContentItemType[];
}

const ALL_CONTENT_TYPES: CourseContentItemType[] = ["quiz", "lessonMaterial"];

const questionTypeOptions: { value: QuestionType; label: string }[] = [
    { value: 'multipleChoice', label: 'Multiple Choice' },
    { value: 'identification', label: 'Identification' },
    { value: 'enumeration', label: 'Enumeration' },
];

const gradingPeriodOptions = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

export function CreateCourseContentDialog({ 
  isOpen, 
  onOpenChange, 
  onSave, 
  initialData, 
  isLoading,
  defaultContentType = "quiz",
  allowedContentTypes 
}: CreateCourseContentDialogProps) {

  const isEditMode = !!initialData;
  
  const getEffectiveDefaultContentType = React.useCallback(() => {
    const finalAllowedTypes = allowedContentTypes?.length ? allowedContentTypes : ALL_CONTENT_TYPES;
    if (finalAllowedTypes.length === 1) {
      return finalAllowedTypes[0];
    }
    if (finalAllowedTypes.includes(defaultContentType)) {
      return defaultContentType;
    }
    return finalAllowedTypes[0] || "quiz";
  }, [allowedContentTypes, defaultContentType]);
  
  const form = useForm<CreateCourseContentFormData>({
    resolver: zodResolver(formSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const contentType = form.watch("contentType");
  const currentAllowedTypes = React.useMemo(() => allowedContentTypes?.length ? allowedContentTypes : ALL_CONTENT_TYPES, [allowedContentTypes]);
  const showContentTypeSelector = currentAllowedTypes.length > 1 && !isEditMode;

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit mode
        if (initialData.contentType === 'quiz') {
            const quizContent = initialData.content as QuizDetails;
            const questionsData = quizContent.questions.map(q => ({
                ...q,
                answerKeyString: q.questionType === 'enumeration' ? q.answerKey?.join('\n') : q.answerKey?.[0] || '',
            }));
            form.reset({
                ...initialData,
                dueDate: initialData.dueDate ? initialData.dueDate.toDate() : undefined,
                questions: questionsData,
                randomizeQuestions: quizContent.randomizeQuestions || false,
                timeLimitMinutes: quizContent.timeLimitMinutes ?? undefined
            });
        } else { // lessonMaterial
            form.reset({
                ...initialData,
                mainContent: (initialData.content as LessonMaterialDetails).mainContent || "",
                scheduledOn: initialData.scheduledOn ? initialData.scheduledOn.toDate() : undefined,
            });
        }
      } else {
        // Create mode
        const defaultType = getEffectiveDefaultContentType();
        if (defaultType === 'quiz') {
            form.reset({
                title: "",
                description: "",
                topic: "",
                gradingPeriod: "",
                contentType: 'quiz',
                dueDate: undefined,
                randomizeQuestions: false,
                timeLimitMinutes: 0,
                questions: [{ id: `new-${Date.now()}`, text: "", questionType: 'multipleChoice', options: ["", "", "", ""], correctAnswerIndex: undefined, answerKey: [], answerKeyString: '' }],
            });
        } else { // lessonMaterial
             form.reset({
                title: "",
                description: "",
                topic: "",
                gradingPeriod: "",
                contentType: 'lessonMaterial',
                mainContent: "",
                scheduledOn: undefined,
            });
        }
      }
    }
  }, [isOpen, initialData, form, getEffectiveDefaultContentType]);

 const onSubmit = async (values: CreateCourseContentFormData) => {
    let payload = { ...values };

    if (payload.contentType === 'quiz') {
      const processedQuestions = (payload.questions || []).map((q: any) => {
        const baseQuestion: any = {
          id: q.id,
          text: q.text,
          questionType: q.questionType,
        };

        switch (q.questionType) {
          case 'multipleChoice':
            baseQuestion.options = q.options || ["", "", "", ""];
            baseQuestion.correctAnswerIndex = q.correctAnswerIndex;
            break;
          case 'identification':
             baseQuestion.answerKey = [q.answerKeyString.trim()];
            break;
          case 'enumeration':
            baseQuestion.answerKey = q.answerKeyString?.split('\n').map((s:string) => s.trim()).filter(Boolean) || [];
            break;
        }
        delete baseQuestion.answerKeyString; 
        return baseQuestion;
      });
      payload.questions = processedQuestions;
    }

    await onSave(payload);
  };

  const radioOptions = [
    { value: "quiz", label: "Quiz" },
    { value: "lessonMaterial", label: "Lesson Material" },
  ].filter(opt => currentAllowedTypes.includes(opt.value as CourseContentItemType));


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) {
        onOpenChange(open);
        if(!open) form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Course Content" : "Create New Course Content"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the details for the content. Click save when you're done." : "Fill in the details for the new content."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ''} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {mathTopics.map(topic => (
                          <SelectItem key={topic.slug} value={topic.slug}>{topic.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="gradingPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grading Period (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a grading period" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {gradingPeriodOptions.map(period => (
                          <SelectItem key={period} value={period}>{period}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contentType === "quiz" && (
                <>
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              disabled={isLoading}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1 )) || isLoading} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="randomizeQuestions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background mt-2">
                        <div className="space-y-0.5">
                          <FormLabel>Randomize Questions</FormLabel>
                          <FormDescriptionComponent>
                            Shuffle question order for each student.
                          </FormDescriptionComponent>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                 <FormField
                    control={form.control}
                    name="timeLimitMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Limit (in minutes)</FormLabel>
                         <FormControl>
                           <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""}
                              onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Leave blank or 0 for no limit" 
                              disabled={isLoading} 
                            />
                         </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
               {contentType === "lessonMaterial" && (
                <FormField
                  control={form.control}
                  name="scheduledOn"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled Publish Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              disabled={isLoading}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Publish immediately</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1 )) || isLoading} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {showContentTypeSelector && (
                <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Content Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                        }}
                        value={field.value}
                        className="flex flex-wrap space-x-4"
                        disabled={isLoading}
                        >
                        {radioOptions.map(opt => (
                            <FormItem key={opt.value} className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value={opt.value} /></FormControl>
                                <FormLabel className="font-normal">{opt.label}</FormLabel>
                            </FormItem>
                        ))}
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            {contentType === "quiz" && (
              <div className="space-y-4">
                <FormLabel>Quiz Questions</FormLabel>
                {fields.map((item, index) => {
                  const questionType = form.watch(`questions.${index}.questionType`);
                  return (
                  <Card key={item.id} className="p-4 space-y-4 bg-secondary/30">
                    <div className="flex justify-between items-center gap-4">
                       <FormLabel className="text-base whitespace-nowrap">Question {index + 1}</FormLabel>
                        <FormField
                            control={form.control}
                            name={`questions.${index}.questionType`}
                            render={({ field }) => (
                            <Select onValueChange={(type) => {
                                field.onChange(type);
                            }} value={field.value} disabled={isLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {questionTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            )}
                        />
                       {fields.length > 1 && (
                         <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isLoading}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       )}
                    </div>
                    <FormField
                      control={form.control}
                      name={`questions.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Question Text</FormLabel>
                          <FormControl><Textarea {...field} placeholder="Enter question text" disabled={isLoading} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {questionType === 'multipleChoice' && (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {([0, 1, 2, 3] as const).map((optionIndex) => (
                            <FormField
                            key={`${item.id}-option-${optionIndex}`}
                            control={form.control}
                            name={`questions.${index}.options.${optionIndex}`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="sr-only">Option {optionIndex + 1}</FormLabel>
                                <FormControl><Input {...field} placeholder={`Option ${optionIndex + 1}`} disabled={isLoading} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        ))}
                        </div>
                        <FormField
                            control={form.control}
                            name={`questions.${index}.correctAnswerIndex`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Correct Answer</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)} disabled={isLoading}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {form.watch(`questions.${index}.options`)?.map((optionText, optIdx) => (
                                    <SelectItem key={optIdx} value={String(optIdx)}>
                                        Option {optIdx + 1}{optionText ? `: ${optionText.substring(0,30)}${optionText.length > 30 ? '...' : ''}`: ''}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </>
                    )}
                    {(questionType === 'identification' || questionType === 'enumeration') && (
                         <FormField
                            control={form.control}
                            name={`questions.${index}.answerKeyString`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Correct Answer(s)</FormLabel>
                                <FormControl><Textarea {...field} placeholder={questionType === 'identification' ? 'Enter the exact answer' : 'Enter each answer on a new line'} disabled={isLoading} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                  </Card>
                )})}
                <Button type="button" variant="outline" onClick={() => append({ id: `new-${Date.now()}`, text: "", questionType: 'multipleChoice', options: ["", "", "", ""], correctAnswerIndex: 0, answerKey:[], answerKeyString: ''})} disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                </Button>
                <FormField name="questions" control={form.control} render={() => <FormMessage />} />
              </div>
            )}

            {contentType === "lessonMaterial" && (
                <FormField
                  control={form.control}
                  name="mainContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Content</FormLabel>
                      <FormControl>
                        <Textarea 
                            rows={8}
                            placeholder="Enter the main text content for the lesson material here..."
                           {...field}
                           value={field.value || ""} 
                           disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditMode ? "Save Changes" : "Save Content"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
