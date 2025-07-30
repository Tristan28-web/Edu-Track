
"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, doc, updateDoc, deleteField, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CreateCourseContentDialog, type CreateCourseContentFormData } from "@/components/teacher/CreateCourseContentDialog";
import type { CourseContentItem, QuizDetails } from "@/types";
import { BookOpenCheck, PlusCircle, Edit, ListChecks, FileText, Loader2, AlertTriangle, Eye, Archive, ArchiveRestore, Copy } from "lucide-react";
import { format } from "date-fns";
import { mathTopics, type MathTopic } from "@/config/topics"; 
import { toast } from "@/hooks/use-toast";
import Link from "next/link"; 

export default function QuizzesPage() {
  const { user: teacher, loading: authLoading } = useAuth();
  const [contentItems, setContentItems] = useState<CourseContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCloning, setIsCloning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CourseContentItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchContentItems = async () => {
    if (!teacher) {
      setError("Teacher information not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const contentCollectionRef = collection(db, "courseContent");
      const q = query(
        contentCollectionRef,
        where("teacherId", "==", teacher.id),
        where("contentType", "==", "quiz"),
        where("isArchived", "==", showArchived),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedItems: CourseContentItem[] = [];
      querySnapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as CourseContentItem);
      });
      setContentItems(fetchedItems);
    } catch (err: any) {
      console.error("Error fetching content items:", err);
      let detailedError = "Failed to load content. If this is your first time, you may need to create a quiz to initialize the database view.";
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        detailedError = `A database index is required. Please create a sample quiz. The system will then provide a link in the developer console to automatically create the necessary index. (${err.message})`;
      } else if (err.code !== 'failed-precondition') {
         detailedError += ` Error: ${err.message}`;
      }
      setError(detailedError);
      if (err.code !== 'failed-precondition') {
        toast({ title: "Error", description: detailedError, variant: "destructive", duration: 10000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && teacher) {
      fetchContentItems();
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
    
    // Optimistic UI update
    const originalItems = [...contentItems];
    setContentItems(prev => prev.filter(item => item.id !== itemId));

    try {
        const docRef = doc(db, "courseContent", itemId);
        await updateDoc(docRef, { isArchived: newStatus });
        toast({ title: "Success", description: `Quiz has been ${action.toLowerCase()}.` });
        // No need to refetch, optimistic update is enough
    } catch (err: any) {
        console.error(`Error ${action.toLowerCase()}ing content:`, err);
        toast({ title: "Error", description: `Could not ${action.toLowerCase()} quiz.`, variant: "destructive" });
        // Revert UI on error
        setContentItems(originalItems);
    }
  };
  
  const handleCloneContent = async (itemId: string) => {
    if (!teacher) return;
    setIsCloning(itemId);
    try {
      const originalDocRef = doc(db, "courseContent", itemId);
      const originalDocSnap = await getDoc(originalDocRef);
      if (!originalDocSnap.exists()) {
        throw new Error("Original item not found.");
      }
      
      const originalData = originalDocSnap.data() as CourseContentItem;
      const now = Timestamp.now();
      const newDocRef = doc(collection(db, "courseContent"));
      
      const clonedPayload: Omit<CourseContentItem, 'id'> = {
        ...originalData,
        title: `Copy of ${originalData.title}`,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        dueDate: undefined, // Reset due date
      };
      
      await setDoc(newDocRef, clonedPayload);
      toast({ title: "Quiz Cloned", description: `A copy of "${originalData.title}" has been created.` });
      await fetchContentItems(); // Refetch to show the new item
    } catch (err: any) {
      console.error("Error cloning content:", err);
      toast({ title: "Clone Failed", description: "Could not create a copy of the quiz.", variant: "destructive" });
    } finally {
      setIsCloning(null);
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
        timeLimitMinutes: data.timeLimitMinutes
      };

      if (editingItem) {
        // Update existing item
        const docRef = doc(db, "courseContent", editingItem.id);
        const updatePayload: { [key: string]: any } = {
          title: data.title,
          description: data.description || "",
          topic: data.topic,
          gradingPeriod: data.gradingPeriod || "",
          content: contentPayload,
          updatedAt: Timestamp.now(),
          dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : deleteField()
        };
        
        // Filter out undefined values to prevent Firestore errors
        Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
        if (updatePayload.dueDate === undefined) {
            updatePayload.dueDate = deleteField();
        }

        await updateDoc(docRef, updatePayload);
        toast({ title: "Success", description: "Quiz updated successfully." });
      } else {
        // Create new item
        const now = Timestamp.now();
        const activityType = 'quiz_created';
        
        const docPayload: { [key: string]: any } = {
          teacherId: teacher.id,
          title: data.title,
          description: data.description || "",
          topic: data.topic,
          gradingPeriod: data.gradingPeriod || "",
          contentType: 'quiz',
          content: contentPayload,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        };

        if (data.dueDate) {
          docPayload.dueDate = Timestamp.fromDate(data.dueDate);
        }

        const docRef = await addDoc(collection(db, "courseContent"), docPayload);
        toast({ title: "Success", description: `Quiz created successfully.` });
        
        await addDoc(collection(db, "teacherActivities"), {
          teacherId: teacher.id,
          message: `You created a new quiz: "${data.title}".`,
          timestamp: now,
          type: activityType,
          relatedItemId: docRef.id,
          relatedItemTitle: data.title,
          link: `/teacher/quizzes` 
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      await fetchContentItems();
    } catch (err: any) {
      console.error("Error saving content:", err);
      toast({ title: "Save Failed", description: err.message || "Could not save content.", variant: "destructive" });
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
              <BookOpenCheck className="h-8 w-8" /> Quizzes
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
      />

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading content...</p>
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
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No {showArchived ? 'archived' : 'active'} quizzes found.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && contentItems.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contentItems.map((item) => (
            <Card key={item.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-headline text-primary/90">{item.title}</CardTitle>
                    <Badge variant='secondary'>
                        <ListChecks className="mr-1 h-4 w-4"/>
                        Quiz
                    </Badge>
                </div>
                <CardDescription>
                  Topic: {getTopicTitle(item.topic)}
                  {item.gradingPeriod && ` | ${item.gradingPeriod}`}
                  {item.dueDate && ` | Due: ${format(item.dueDate.toDate(), "PP")}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                 {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                 {item.content?.questions && (
                    <p className="text-sm text-foreground/80">{(item.content as QuizDetails).questions.length} question(s)</p>
                 )}
              </CardContent>
              <CardFooter className="flex flex-wrap justify-end gap-2 pt-4">
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href={`/teacher/quizzes/${item.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> 
                        View Results
                    </Link>
                </Button>
                 <Button variant="outline" size="sm" onClick={() => handleEditClick(item)} disabled={isCloning === item.id} className="w-full sm:w-auto">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCloneContent(item.id)} disabled={isCloning === item.id} className="w-full sm:w-auto">
                  {isCloning === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                   Clone
                </Button>
                 <Button variant="secondary" size="sm" onClick={() => handleArchiveToggle(item.id, item.isArchived || false)} disabled={isCloning === item.id} className="w-full sm:w-auto">
                   {item.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                   {item.isArchived ? "Restore" : "Archive"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
