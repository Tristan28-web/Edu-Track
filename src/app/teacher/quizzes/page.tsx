
"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CreateCourseContentDialog, type CreateCourseContentFormData } from "@/components/teacher/CreateCourseContentDialog";
import type { CourseContentItem, QuizDetails } from "@/types";
import { BookOpenCheck, PlusCircle, Edit, ListChecks, Loader2, AlertTriangle, Eye, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { mathTopics } from '@/config/topics'; 
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Section {
  id: string;
  name: string;
}

export default function QuizzesPage() {
  const { user: teacher, loading: authLoading } = useAuth();
  const [contentItems, setContentItems] = useState<CourseContentItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CourseContentItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CourseContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContentAndSections = async () => {
    if (!teacher) {
      setError("Teacher information not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const contentCollectionRef = collection(db, "courseContent");
      const sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", teacher.id));
      
      const contentQuery = query(
        contentCollectionRef,
        where("teacherId", "==", teacher.id),
        where("contentType", "==", "quiz"),
        where("isArchived", "==", showArchived),
        orderBy("createdAt", "desc")
      );
      
      const [contentSnapshot, sectionsSnapshot] = await Promise.all([getDocs(contentQuery), getDocs(sectionsQuery)]);
      
      const fetchedItems: CourseContentItem[] = [];
      contentSnapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as CourseContentItem);
      });
      setContentItems(fetchedItems);

      const fetchedSections: Section[] = sectionsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setSections(fetchedSections);

    } catch (err: any) {
      console.error("Error fetching content items:", err);
      let detailedError = "Failed to load content. If this is your first time, you may need to create a quiz to initialize the database view.";
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        detailedError = `A database index is required. Please create a sample quiz. The system will then provide a link in the developer console to automatically create the necessary index.`;
      } else if (err.code !== 'failed-precondition') {
         detailedError += ` Check the developer console for more info.`;
      }
      setError(detailedError);
      if (err.code !== 'failed-precondition') {
        toast({ title: "Error", description: "Could not load your created quizzes.", variant: "destructive", duration: 10000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && teacher) {
      fetchContentAndSections();
    } else if (!authLoading && !teacher) {
      setError("Please log in as a teacher to manage quizzes.");
      setIsLoading(false);
    }
  }, [teacher, authLoading, showArchived]);

  const handleEditClick = (item: CourseContentItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  
  const handleArchiveToggle = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? "Archived" : "Restored";
    
    const originalItems = [...contentItems];
    setContentItems(prev => prev.filter(item => item.id !== itemId));

    try {
        const docRef = doc(db, "courseContent", itemId);
        await updateDoc(docRef, { isArchived: newStatus });
        toast({ title: "Success", description: `Quiz has been ${action.toLowerCase()}.` });
    } catch (err: any) {
        console.error(`Error ${action.toLowerCase()}ing content:`, err);
        toast({ title: "Error", description: `Could not ${action.toLowerCase()} quiz.`, variant: "destructive" });
        setContentItems(originalItems);
    }
  };

  const handleDeleteClick = (item: CourseContentItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteQuiz = async () => {
    if (!itemToDelete || !teacher) return;
    setIsDeleting(true);

    try {
      const batch = writeBatch(db);

      // Find all students of this teacher
      const studentsQuery = query(
        collection(db, "users"),
        where("teacherId", "==", teacher.id),
        where("role", "==", "student")
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      // For each student, find and delete the specific quiz result
      for (const studentDoc of studentsSnapshot.docs) {
        const quizResultQuery = query(
          collection(db, "users", studentDoc.id, "quizResults"),
          where("quizId", "==", itemToDelete.id)
        );
        const quizResultSnapshot = await getDocs(quizResultQuery);
        quizResultSnapshot.forEach((resultDoc) => {
          batch.delete(resultDoc.ref);
        });

        // Reset the progress for the topic associated with the quiz
        const studentProgress = studentDoc.data().progress || {};
        if (itemToDelete.topic && studentProgress[itemToDelete.topic]) {
            delete studentProgress[itemToDelete.topic];
            batch.update(studentDoc.ref, { progress: studentProgress });
        }
      }

      // Delete the main quiz document
      batch.delete(doc(db, "courseContent", itemToDelete.id));

      await batch.commit();

      toast({ title: "Quiz Deleted", description: `"${itemToDelete.title}" and all associated student data have been permanently deleted.` });
      setContentItems(prev => prev.filter(item => item.id !== itemToDelete.id));

    } catch (err: any) {
        console.error("Error deleting quiz:", err);
        toast({ title: "Deletion Failed", description: err.message || "An unexpected error occurred during deletion.", variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
    }
  };

  const handleSaveContent = async (data: CreateCourseContentFormData) => {
    if (!teacher) {
      toast({ title: "Error", description: "Teacher not authenticated.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      if (data.contentType !== "quiz") {
        toast({ title: "Error", description: "Can only create quizzes from this page. Use Content Library for lessons.", variant: "destructive" });
        return;
      }

      let contentPayload: QuizDetails = {
        questions: data.questions || [],
        randomizeQuestions: data.randomizeQuestions || false,
        timeLimitMinutes: data.timeLimitMinutes || 0
      };

      if (editingItem) {
        const docRef = doc(db, "courseContent", editingItem.id);
        const updatePayload: { [key: string]: any } = {
          title: data.title,
          description: data.description || "",
          topic: data.topic,
          content: contentPayload,
          updatedAt: Timestamp.now(),
          sectionId: data.sectionId,
          dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
        };
        
        await updateDoc(docRef, updatePayload);
        toast({ title: "Success", description: "Quiz updated successfully." });
      } else {
        const now = Timestamp.now();
        const activityType = 'quiz_created';
        
        const docPayload: { [key: string]: any } = {
          teacherId: teacher.id,
          title: data.title,
          description: data.description || "",
          topic: data.topic,
          contentType: 'quiz',
          content: contentPayload,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
          dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
          sectionId: data.sectionId,
          gradeLevel: "Grade 10",
        };

        const docRef = await addDoc(collection(db, "courseContent"), docPayload);
        toast({ title: "Success", description: `Quiz created successfully.` });
        
        await addDoc(collection(db, "teacherActivities"), {
          teacherId: teacher.id,
          message: `${teacher.displayName || 'A teacher'} created a new quiz: "${data.title}".`,
          timestamp: now,
          type: activityType,
          relatedItemId: docRef.id,
          relatedItemTitle: data.title,
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      await fetchContentAndSections();
    } catch (err: any) {
      console.error("Error saving content:", err);
      toast({ title: "Save Failed", description: "Could not save content.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getTopicTitle = (slug: string): string => {
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <BookOpenCheck className="h-8 w-8" /> Quiz Management
            </CardTitle>
            <CardDescription>
               Manage {showArchived ? 'archived' : 'active'} quizzes and view student submissions.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
             <Button variant="outline" onClick={() => setShowArchived(prev => !prev)}>
              {showArchived ? <><Eye className="mr-2 h-4 w-4" /> View Active</> : <><Archive className="mr-2 h-4 w-4" /> View Archived</>}
            </Button>
            <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New
            </Button>
          </div>
        </CardHeader>
      </Card>

      <CreateCourseContentDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveContent}
        isLoading={isSaving}
        initialData={editingItem || undefined}
        defaultContentType="quiz"
        allowedContentTypes={["quiz"]}
        sections={sections}
      />

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quiz "{itemToDelete?.title}" and all associated student results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
            <CardTitle>Quiz List</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading && (
                <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading quizzes...</p>
                </div>
            )}

            {error && !isLoading && (
                <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && contentItems.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No {showArchived ? 'archived' : 'active'} quizzes found.</p>
                </div>
            )}

            {!isLoading && !error && contentItems.length > 0 && (
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead className="hidden md:table-cell">Topic</TableHead>
                                <TableHead className="hidden lg:table-cell">Questions</TableHead>
                                <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {contentItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.title}</TableCell>
                                <TableCell className="hidden md:table-cell">{item.topic ? getTopicTitle(item.topic) : "N/A"}</TableCell>
                                <TableCell className="hidden lg:table-cell">{(item.content as QuizDetails).questions?.length || 0}</TableCell>
                                <TableCell className="hidden sm:table-cell">{item.dueDate ? format(item.dueDate.toDate(), "PP") : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                     <Button asChild variant="outline" size="sm">
                                        <Link href={`/teacher/quizzes/${item.id}`}>
                                            <Eye className="mr-2 h-4 w-4" /> 
                                            Results
                                        </Link>
                                    </Button>
                                    {!item.isArchived && (
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(item)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                    )}
                                    <Button variant="secondary" size="sm" onClick={() => handleArchiveToggle(item.id, item.isArchived || false)}>
                                        {item.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                        {item.isArchived ? "Restore" : "Archive"}
                                    </Button>
                                     {item.isArchived && (<Button variant="destructive" size="sm" onClick={() => handleDeleteClick(item)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>)}
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
    </Card>
    </div>
  );
}
