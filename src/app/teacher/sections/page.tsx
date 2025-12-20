
"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, Timestamp, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, Bookmark, AlertTriangle, Users } from "lucide-react";
import { AddEditSectionDialog, type SectionFormData } from "@/components/teacher/AddEditSectionDialog";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { AppUser } from "@/types";
import { Badge } from "@/components/ui/badge";

interface Section {
  id: string;
  name: string;
}

interface SectionWithStudents extends Section {
    students: AppUser[];
}

export default function ManageSectionsPage() {
  const { user: teacher } = useAuth();
  const [sectionsWithStudents, setSectionsWithStudents] = useState<SectionWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  
  const fetchSectionsAndStudents = async () => {
    if (!teacher) return;
    setIsLoading(true);
    setError(null);
    try {
      const sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", teacher.id), orderBy("name"));
      const studentsQuery = query(collection(db, "users"), where("teacherId", "==", teacher.id), where("role", "==", "student"));
      
      const [sectionsSnapshot, studentsSnapshot] = await Promise.all([getDocs(sectionsQuery), getDocs(studentsQuery)]);
      
      const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      const studentsBySection: Record<string, AppUser[]> = {};
      students.forEach(student => {
        if (student.sectionId) {
            if (!studentsBySection[student.sectionId]) {
                studentsBySection[student.sectionId] = [];
            }
            studentsBySection[student.sectionId].push(student);
        }
      });

      const fetchedSections: SectionWithStudents[] = sectionsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          name: doc.data().name,
          students: (studentsBySection[doc.id] || []).sort((a,b) => (a.displayName || '').localeCompare(b.displayName || ''))
      }));
      
      setSectionsWithStudents(fetchedSections);

    } catch (err: any) {
      console.error("Error fetching sections and students:", err);
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
      fetchSectionsAndStudents();
    } else {
        setIsLoading(false);
    }
  }, [teacher]);
  
  const handleSaveSection = async (data: SectionFormData) => {
    if (!teacher) {
      toast({ title: "Error", description: "Authentication error.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    try {
      if (editingSection) {
        const sectionDoc = doc(db, "sections", editingSection.id);
        await updateDoc(sectionDoc, { name: data.name });
        toast({ title: "Section Updated", description: `Section "${data.name}" has been updated.` });
      } else {
        await addDoc(collection(db, "sections"), {
          name: data.name,
          teacherId: teacher.id,
          createdAt: Timestamp.now()
        });
        toast({ title: "Section Created", description: `Section "${data.name}" has been created.` });
      }
      setIsSectionDialogOpen(false);
      setEditingSection(null);
      await fetchSectionsAndStudents();
    } catch (err: any) {
      toast({ title: "Error Saving Section", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setIsSectionDialogOpen(true);
  };
  
  const handleDeleteSection = async (section: Section) => {
    const sectionData = sectionsWithStudents.find(s => s.id === section.id);
    if (sectionData && sectionData.students.length > 0) {
        toast({
            title: "Deletion Blocked",
            description: `Cannot delete section "${section.name}" because it still has students assigned to it. Please reassign the students first.`,
            variant: "destructive",
            duration: 7000,
        });
        return;
    }

    if (!window.confirm(`Are you sure you want to delete section "${section.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "sections", section.id));
      toast({ title: "Section Deleted", description: `Section "${section.name}" has been deleted.` });
      await fetchSectionsAndStudents();
    } catch (err: any) {
      toast({ title: "Error Deleting Section", description: err.message, variant: "destructive" });
    }
  };
  
  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'transferred': return 'secondary';
      case 'dropped': case 'failed': return 'destructive';
      default: return 'outline';
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
              Create, edit, and view your class sections and their assigned students.
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingSection(null); setIsSectionDialogOpen(true); }} className="mt-4 sm:mt-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Section
          </Button>
        </CardHeader>
      </Card>

      <AddEditSectionDialog
        isOpen={isSectionDialogOpen}
        onOpenChange={setIsSectionDialogOpen}
        onSave={handleSaveSection}
        initialData={editingSection}
        isSaving={isSaving}
      />
      
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

      {!isLoading && !error && sectionsWithStudents.length === 0 && (
          <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                   No sections created yet. Click "Add New Section" to begin.
              </CardContent>
          </Card>
      )}
      
      {!isLoading && !error && sectionsWithStudents.length > 0 && (
        <div className="space-y-8">
            {sectionsWithStudents.map((section) => (
                 <Card key={section.id}>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle>{section.name}</CardTitle>
                            <CardDescription>{section.students.length} student(s) in this section.</CardDescription>
                        </div>
                         <div className="space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditSection(section)}>
                                <Edit className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteSection(section)}>
                                <Trash2 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Delete</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Display Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Username</TableHead>
                                        <TableHead>Grade Level</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {section.students.length > 0 ? (
                                    section.students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.displayName}</TableCell>
                                        <TableCell className="hidden md:table-cell">{student.username}</TableCell>
                                        <TableCell>{student.gradeLevel || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize">
                                                {student.status?.replace('_', ' ') || 'Active'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No students assigned to this section yet.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
