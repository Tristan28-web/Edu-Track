
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2, CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppUser } from "@/types";

const formSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required." }),
    middleName: z.string().optional(),
    lastName: z.string().min(1, { message: "Last name is required." }),
    student_id: z.string().min(1, { message: "Student ID is required." }),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
    gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required" }),
    address: z.string().min(1, { message: "Address is required." }),
    contactNumber: z.string().min(1, { message: "Contact Number is required." }),
    gradeLevel: z.string().min(1, { message: "Grade Level is required." }),
    sectionName: z.string().min(1, { message: "Section is required." }),
    guardianFirstName: z.string().min(1, { message: "Guardian First Name is required." }),
    guardianLastName: z.string().min(1, { message: "Guardian Last Name is required." }),
    guardianContact: z.string().min(1, { message: "Guardian Contact is required." }),
});

export type EditStudentFormData = z.infer<typeof formSchema>;

interface EditStudentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStudentUpdated: (userData: EditStudentFormData) => Promise<void>;
  student: AppUser | null;
}

export function EditStudentDialog({ isOpen, onOpenChange, onStudentUpdated, student }: EditStudentDialogProps) {
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
        contactNumber: student.contactNumber || "",
        gradeLevel: student.gradeLevel || "",
        sectionName: student.sectionName || "",
        guardianFirstName: student.guardianFirstName || "",
        guardianLastName: student.guardianLastName || "",
        guardianContact: student.guardianContact || "",
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Student: {student.displayName}</DialogTitle>
          <DialogDescription>
            Update the student's details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-96 w-full pr-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Personal Information</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Middle Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    toYear={new Date().getFullYear() - 5}
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
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <p className="text-sm font-medium text-muted-foreground pt-4">School Information</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="student_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Student ID</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="gradeLevel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grade Level</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="sectionName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Section</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <p className="text-sm font-medium text-muted-foreground pt-4">Guardian Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="guardianFirstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Guardian First Name</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="guardianLastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Guardian Last Name</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                </div>
                <FormField
                    control={form.control}
                    name="guardianContact"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Guardian Contact</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={isSubmitting} />
                            </FormControl>
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
};