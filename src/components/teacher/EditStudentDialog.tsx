
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import type { AppUser } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required."),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name is required."),
  student_id: z.string().min(1, "Student ID is required."),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.").optional(),
  gender: z.enum(['Male', 'Female', 'Other'], {required_error: "Gender is required"}),
  address: z.string().min(10, "Address is required."),
  gradeLevel: z.string().min(1, "Grade level is required."),
  guardianFirstName: z.string().min(2, "Guardian's first name is required."),
  guardianMiddleName: z.string().optional(),
  guardianLastName: z.string().min(2, "Guardian's last name is required."),
  guardianContact: z.string().min(10, "Guardian contact number is required."),
  sectionId: z.string().min(1, "Please assign the student to a section."),
});

export type EditStudentFormData = z.infer<typeof formSchema>;

interface EditStudentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStudentUpdated: (userData: EditStudentFormData) => Promise<void>;
  student: AppUser | null;
  sections: { id: string; name: string }[];
}

export function EditStudentDialog({ isOpen, onOpenChange, onStudentUpdated, student, sections }: EditStudentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditStudentFormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (student && isOpen) {
      form.reset({
        firstName: student.firstName || "",
        middleName: student.middleName || "",
        lastName: student.lastName || "",
        student_id: student.student_id || "",
        dateOfBirth: student.dateOfBirth || "",
        gender: student.gender,
        address: student.address || "",
        gradeLevel: student.gradeLevel || "",
        guardianFirstName: student.guardianFirstName || "",
        guardianMiddleName: student.guardianMiddleName || "",
        guardianLastName: student.guardianLastName || "",
        guardianContact: student.guardianContact || "",
        sectionId: student.sectionId || "",
      });
    }
  }, [student, isOpen, form]);

  const onSubmit = async (values: EditStudentFormData) => {
    setIsSubmitting(true);
    try {
      await onStudentUpdated(values);
    } catch (error) {
      console.error("Error in EditStudentDialog submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isSubmitting) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Student: {student.displayName}</DialogTitle>
          <DialogDescription>
            Update the student's details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-96 w-full pr-6">
                <div className="space-y-4">
                     <div className="space-y-2">
                        <FormLabel>Username</FormLabel>
                        <Input value={student.username || 'N/A'} readOnly disabled />
                    </div>
                     <p className="text-sm font-medium text-muted-foreground pt-4">Personal Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem className="md:col-span-1">
                                <FormLabel>First Name</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="middleName" render={({ field }) => (
                            <FormItem className="md:col-span-1">
                                <FormLabel>Middle Name (Optional)</FormLabel>
                                <FormControl><Input {...field} value={field.value || ""} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem className="md:col-span-1">
                                <FormLabel>Last Name</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="student_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Student ID</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date of Birth</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      disabled={isSubmitting}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {field.value ? (
                                        format(new Date(field.value), "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    captionLayout="dropdown-buttons"
                                    fromYear={new Date().getFullYear() - 25}
                                    toYear={new Date().getFullYear() - 10}
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="gradeLevel" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grade Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Grade 1">Grade 1</SelectItem>
                                        <SelectItem value="Grade 2">Grade 2</SelectItem>
                                        <SelectItem value="Grade 3">Grade 3</SelectItem>
                                        <SelectItem value="Grade 4">Grade 4</SelectItem>
                                        <SelectItem value="Grade 5">Grade 5</SelectItem>
                                        <SelectItem value="Grade 6">Grade 6</SelectItem>
                                        <SelectItem value="Grade 7">Grade 7</SelectItem>
                                        <SelectItem value="Grade 8">Grade 8</SelectItem>
                                        <SelectItem value="Grade 9">Grade 9</SelectItem>
                                        <SelectItem value="Grade 10">Grade 10</SelectItem>
                                        <SelectItem value="Grade 11">Grade 11</SelectItem>
                                        <SelectItem value="Grade 12">Grade 12</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                     <p className="text-sm font-medium text-muted-foreground pt-4">Guardian Information</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <FormField control={form.control} name="guardianFirstName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Guardian's First Name</FormLabel>
                                    <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="guardianMiddleName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Guardian's Middle Name</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ''} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="guardianLastName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Guardian's Last Name</FormLabel>
                                    <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                      </div>
                       <FormField control={form.control} name="guardianContact" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Guardian's Contact No.</FormLabel>
                                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                      <p className="text-sm font-medium text-muted-foreground pt-4">Class Information</p>
                      <FormField
                        control={form.control}
                        name="sectionId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Section</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || sections.length === 0}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={sections.length > 0 ? "Assign to a section" : "Create a section first"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {sections.map((section) => (
                                    <SelectItem key={section.id} value={section.id}>
                                    {section.name}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
