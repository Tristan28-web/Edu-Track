
"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, doc, updateDoc, setDoc, deleteField, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CreateCourseContentDialog, type CreateCourseContentFormData } from "@/components/teacher/CreateCourseContentDialog";
import type { CourseContentItem, LessonMaterialDetails } from "@/types";
import { Library, PlusCircle, Edit, FileText, Loader2, AlertTriangle, Archive, ArchiveRestore, Eye, Copy } from "lucide-react";
import { mathTopics } from "@/config/topics";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

export default function ContentLibraryPage() {
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
        where("contentType", "==", "lessonMaterial"),
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
      let detailedError = "Failed to load lesson materials. If this is your first time, you may need to create an item to initialize the database view.";
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        detailedError = `A database index is required. Please create a sample lesson material. The system will then provide a link in the developer console to automatically create the necessary index. (${err.message})`;
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
      setError("Please log in as a teacher to manage the content library.");
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
        toast({ title: "Success", description: `Material has been ${action.toLowerCase()}.` });
    } catch (err: any) {
        console.error(`Error ${action.toLowerCase()}ing material:`, err);
        toast({ title: "Error", description: `Could not ${action.toLowerCase()} material.`, variant: "destructive" });
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
        scheduledOn: undefined, // Reset schedule date
      };
      
      await setDoc(newDocRef, clonedPayload);
      toast({ title: "Content Cloned", description: `A copy of "${originalData.title}" has been created.` });
      await fetchContentItems(); // Refetch to show the new item
    } catch (err: any) {
      console.error("Error cloning content:", err);
      toast({ title: "Clone Failed", description: "Could not create a copy of the content.", variant: "destructive" });
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
      if (data.contentType === "lessonMaterial") {
          
          if (editingItem) {
            // UPDATE Logic for Lesson Material
            const docRef = doc(db, "courseContent", editingItem.id);
            const updatePayload: { [key: string]: any } = {
                title: data.title,
                description: data.description || "",
                topic: data.topic,
                gradingPeriod: data.gradingPeriod || "",
                updatedAt: Timestamp.now(),
                content: {
                    mainContent: data.mainContent || "",
                },
                scheduledOn: data.scheduledOn ? Timestamp.fromDate(data.scheduledOn) : deleteField(),
            };
            
            // Filter out undefined values to prevent Firestore errors
            Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
            if (updatePayload.scheduledOn === undefined) {
                updatePayload.scheduledOn = deleteField();
            }

            await updateDoc(docRef, updatePayload);
            toast({ title: "Success", description: "Lesson material updated successfully." });

          } else {
            // CREATE Logic for Lesson Material
            const now = Timestamp.now();
            const docRef = doc(collection(db, "courseContent"));
            
            const docPayload: { [key: string]: any } = {
                id: docRef.id,
                teacherId: teacher.id,
                title: data.title,
                description: data.description || "",
                topic: data.topic,
                gradingPeriod: data.gradingPeriod || "",
                contentType: "lessonMaterial" as const,
                content: {
                    mainContent: data.mainContent || "",
                },
                isArchived: false,
                createdAt: now,
                updatedAt: now,
            };

            if (data.scheduledOn) {
              docPayload.scheduledOn = Timestamp.fromDate(data.scheduledOn);
            }
            
            await setDoc(docRef, docPayload);

            toast({ title: "Success", description: "Lesson Material created successfully." });
            
            await addDoc(collection(db, "teacherActivities"), {
              teacherId: teacher.id,
              message: `You created new lesson material: "${data.title}".`,
              timestamp: now,
              type: 'lesson_material_created' as const,
              relatedItemId: docRef.id,
              relatedItemTitle: data.title,
              link: `/teacher/content`
            });
          }
      } else {
        toast({ title: "Error", description: "Invalid content type for library.", variant: "destructive" });
        setIsSaving(false);
        return;
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

  const getTopicTitle = (slug: string) => mathTopics.find(t => t.slug === slug)?.title || slug;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <Library className="h-8 w-8" /> Content Library
            </CardTitle>
            <CardDescription>
              Manage {showArchived ? 'archived' : 'active'} reusable lesson materials, notes, and external resources.
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
        defaultContentType="lessonMaterial"
        allowedContentTypes={["lessonMaterial"]}
      />

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading materials...</p>
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
              No {showArchived ? 'archived' : 'active'} lesson materials found.
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
                    <Badge variant='outline'>
                        <FileText className="mr-1 h-4 w-4"/>
                        Lesson Material
                    </Badge>
                </div>
                <CardDescription>
                  Topic: {getTopicTitle(item.topic)}
                  {item.gradingPeriod && ` | ${item.gradingPeriod}`}
                  {item.scheduledOn && ` | Publishes: ${format(item.scheduledOn.toDate(), "PP")}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                 {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
              </CardContent>
              <CardFooter className="flex flex-wrap justify-end gap-2 pt-4">
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
