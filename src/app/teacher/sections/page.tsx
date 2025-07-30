
"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, Bookmark, AlertTriangle } from "lucide-react";
import { AddEditSectionDialog, type SectionFormData } from "@/components/teacher/AddEditSectionDialog";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface Section {
  id: string;
  name: string;
}

export default function ManageSectionsPage() {
  const { user: teacher } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  
  const fetchSections = async () => {
    if (!teacher) return;
    setIsLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "sections"), where("teacherId", "==", teacher.id), orderBy("name"));
      const querySnapshot = await getDocs(q);
      setSections(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Section)));
    } catch (err: any) {
      console.error("Error fetching sections:", err);
      let detailedError = "Failed to load sections.";
      if (err.code === 'failed-precondition') {
          detailedError += " A Firestore index might be required. Please try creating one section to resolve this.";
      }
      setError(detailedError);
      toast({ title: "Error", description: detailedError, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teacher) {
      fetchSections();
    } else {
        setIsLoading(false);
    }
  }, [teacher]);
  
  const handleSave = async (data: SectionFormData) => {
    if (!teacher) {
      toast({ title: "Error", description: "Authentication error.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    try {
      if (editingSection) {
        // Update
        const sectionDoc = doc(db, "sections", editingSection.id);
        await updateDoc(sectionDoc, { name: data.name });
        toast({ title: "Section Updated", description: `Section "${data.name}" has been updated.` });
      } else {
        // Create
        await addDoc(collection(db, "sections"), {
          name: data.name,
          teacherId: teacher.id,
          createdAt: Timestamp.now()
        });
        toast({ title: "Section Created", description: `Section "${data.name}" has been created.` });
      }
      setIsDialogOpen(false);
      setEditingSection(null);
      await fetchSections(); // Refetch to show changes
    } catch (err: any) {
      toast({ title: "Error Saving Section", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (section: Section) => {
    // TODO: Later, add a check to see if students are in this section before deleting.
    if (!window.confirm(`Are you sure you want to delete section "${section.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "sections", section.id));
      toast({ title: "Section Deleted", description: `Section "${section.name}" has been deleted.` });
      await fetchSections();
    } catch (err: any) {
      toast({ title: "Error Deleting Section", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <Bookmark className="h-8 w-8" /> Manage Sections
            </CardTitle>
            <CardDescription>
              Create, edit, and delete your class sections.
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingSection(null); setIsDialogOpen(true); }} className="mt-4 sm:mt-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Section
          </Button>
        </CardHeader>
      </Card>
      
      <AddEditSectionDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        initialData={editingSection}
        isSaving={isSaving}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Your Sections</CardTitle>
          <CardDescription>A list of all your created class sections.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading sections...</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && (
            <div className="w-full overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Section Name</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                  {sections.length > 0 ? (
                    sections.map((section) => (
                      <TableRow key={section.id}>
                        <TableCell className="font-medium">{section.name}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(section)}>
                              <Edit className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(section)}>
                              <Trash2 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center h-24">
                        No sections created yet. Click "Add New Section" to begin.
                      </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
