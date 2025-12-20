
"use client";

import { useEffect, useState, useRef, useMemo } from "react"; 
import { collection, getDocs, doc, setDoc, Timestamp, query, where, orderBy, addDoc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth as firebaseAuth, db, firebaseConfig } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Edit, Loader2, UserPlus, AlertTriangle, MoreHorizontal, Hourglass, RefreshCw, Bookmark, TrendingUp, BookOpenCheck, Trash2, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { AddStudentDialog, type AddStudentFormData } from "@/components/teacher/AddStudentDialog";
import { EditStudentDialog, type EditStudentFormData } from "@/components/teacher/EditStudentDialog";
import { ViewStudentDialog } from "@/components/teacher/ViewStudentDialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Section {
  id: string;
  name: string;
}

async function callCreateStudentBackendFunction(data: { email: string; password: string }): Promise<{ success: boolean; uid?: string; error?: string }> {
  const tempAppName = `auth-worker-teacher-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    console.error("Error creating auth user via temp app:", error);
    return { success: false, error: error.message || "Failed to create authentication user." };
  } finally {
    await deleteApp(tempApp);
  }
}

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<AppUser[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AppUser | null>(null);
  const [isViewStudentDialogOpen, setIsViewStudentDialogOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<AppUser | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [studentToReset, setStudentToReset] = useState<AppUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const { user: authUserFromContext } = useAuth(); 
  const originalTeacherIdRef = useRef<string | null>(null);

  const fetchStudentsList = async (teacherId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const studentsCollectionRef = collection(db, "users");
      const q = query(
        studentsCollectionRef,
        where("role", "==", "student"),
        where("teacherId", "==", teacherId),
        orderBy("createdAt", "desc") 
      );
      const querySnapshot = await getDocs(q);
      const fetchedStudents: AppUser[] = [];
      querySnapshot.forEach((docInstance) => {
        const data = docInstance.data();
        fetchedStudents.push({ 
          id: docInstance.id, 
          status: data.status || 'active',
          ...data,
        } as AppUser);
      });
      setStudents(fetchedStudents);
      
      const sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", teacherId), orderBy("name"));
      const sectionsSnapshot = await getDocs(sectionsQuery);
      const fetchedSections: Section[] = sectionsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setSections(fetchedSections);

    } catch (err: any) {
      console.error("Error fetching students:", err);
      let detailedError = "Failed to load students. Please try again.";
      if (err.code === 'failed-precondition') {
        detailedError += " This might be due to missing Firestore indexes. Check the browser console for a link to create them (e.g., on 'teacherId', 'role', 'createdAt').";
      } else {
        detailedError += ` Error: ${err.message}`;
      }
      setError(detailedError);
      toast({ title: "Error Loading Students", description: detailedError, variant: "destructive", duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authUserFromContext) {
      if (authUserFromContext.role === 'teacher' && (!originalTeacherIdRef.current || originalTeacherIdRef.current !== authUserFromContext.id)) {
        originalTeacherIdRef.current = authUserFromContext.id;
      }

      if (originalTeacherIdRef.current && authUserFromContext.id === originalTeacherIdRef.current && authUserFromContext.role === 'teacher') {
        fetchStudentsList(originalTeacherIdRef.current);
      } else if (authUserFromContext.role !== 'teacher') {
        setError("Accessing this page requires a teacher login. Your current session may have changed.");
        setStudents([]); 
        setIsLoading(false);
      }
    } else { 
      setIsLoading(false);
      setError("Please log in as a teacher to manage students.");
      setStudents([]);
      originalTeacherIdRef.current = null; 
    }
  }, [authUserFromContext]);

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
        const gradeMatch = gradeFilter === 'all' || student.gradeLevel === gradeFilter;
        const sectionMatch = sectionFilter === 'all' || student.sectionId === sectionFilter;
        return gradeMatch && sectionMatch;
        });
    }, [students, gradeFilter, sectionFilter]);


  const handleAddStudent = async (data: AddStudentFormData) => {
    const currentTeacher = authUserFromContext; 
    if (!currentTeacher || !currentTeacher.id || currentTeacher.role !== 'teacher') {
        toast({ title: "Error", description: "Teacher details not found or invalid role. Cannot create student.", variant: "destructive" });
        throw new Error("Teacher details not available or invalid role.");
    }
    const capturedTeacherId = currentTeacher.id; 
    
    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", data.username));
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        throw new Error("Username is already taken.");
      }
      
      const email = `${data.username.toLowerCase()}@edu-track.local`;
      const authResponse = await callCreateStudentBackendFunction({ email, password: data.password });

      if (!authResponse.success || !authResponse.uid) {
        throw new Error(authResponse.error || "Backend Auth failed to create student.");
      }
      
      const selectedSection = sections.find(s => s.id === data.sectionId);

      const newStudentForFirestore: AppUser = {
        id: authResponse.uid,
        username: data.username,
        email: email,
        displayName: `${data.firstName} ${data.lastName}`,
        role: 'student',
        teacherId: capturedTeacherId,
        sectionId: data.sectionId,
        sectionName: selectedSection ? selectedSection.name : '',
        status: 'active',
        createdAt: Timestamp.now(),
        lastLogin: null,
        progress: {},
        unlockedAchievementIds: [],
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        student_id: data.student_id,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        gradeLevel: data.gradeLevel,
        guardianFirstName: data.guardianFirstName,
        guardianMiddleName: data.guardianMiddleName,
        guardianLastName: data.guardianLastName,
        guardianContact: data.guardianContact,
      };

      await setDoc(doc(db, "users", newStudentForFirestore.id), newStudentForFirestore);

      toast({
        title: "Student Created",
        description: `${newStudentForFirestore.displayName} (Student) has been successfully created and assigned to you.`,
      });
      
      await addDoc(collection(db, "teacherActivities"), {
        teacherId: capturedTeacherId,
        message: `${currentTeacher.displayName || 'A teacher'} registered a new student: "${newStudentForFirestore.displayName}".`,
        timestamp: Timestamp.now(),
        type: 'student_registered',
        relatedItemId: newStudentForFirestore.id,
        relatedItemTitle: newStudentForFirestore.displayName,
        studentName: newStudentForFirestore.displayName,
      });
      
      await fetchStudentsList(capturedTeacherId);
      setIsAddStudentDialogOpen(false);

    } catch (err: any) {
      console.error("Error creating student:", err);
      const errorMessage = err.message || "Failed to create student. The username might be taken or the password is too weak.";
      toast({ title: "Student Creation Failed", description: errorMessage, variant: "destructive" });
      throw err;
    }
  };

  const handleViewStudent = (studentToView: AppUser) => {
    setViewingStudent(studentToView);
    setIsViewStudentDialogOpen(true);
  };

  const handleEditStudent = (studentToEdit: AppUser) => {
    if (authUserFromContext?.id !== originalTeacherIdRef.current || authUserFromContext?.role !== 'teacher') {
        toast({ title: "Action Denied", description: "Please ensure you are logged in as the correct teacher.", variant: "destructive"});
        return;
    }
    setEditingStudent(studentToEdit);
    setIsEditStudentDialogOpen(true);
  };
  
  const handleUpdateStudent = async (data: EditStudentFormData) => {
    if (!editingStudent) return;
    
    const studentDocRef = doc(db, "users", editingStudent.id);
    try {
        const selectedSection = sections.find(s => s.id === data.sectionId);
        
        const updatePayload: Partial<AppUser> = {
            displayName: `${data.firstName} ${data.lastName}`,
            sectionId: data.sectionId,
            sectionName: selectedSection ? selectedSection.name : '',
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            student_id: data.student_id,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            address: data.address,
            gradeLevel: data.gradeLevel,
            guardianFirstName: data.guardianFirstName,
            guardianMiddleName: data.guardianMiddleName,
            guardianLastName: data.lastName,
            guardianContact: data.guardianContact,
        };

        await updateDoc(studentDocRef, updatePayload as { [x: string]: any });
        
        await fetchStudentsList(originalTeacherIdRef.current!);

        toast({
            title: "Student Updated",
            description: `Details for ${updatePayload.displayName} have been saved.`,
        });
        setIsEditStudentDialogOpen(false);
        setEditingStudent(null);
    } catch (err: any) {
      console.error("Error updating student:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Could not save student details.",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdateStudentStatus = async (studentId: string, newStatus: UserStatus) => {
     if (authUserFromContext?.id !== originalTeacherIdRef.current) {
       toast({ title: "Action Denied", description: "You do not have permission to perform this action.", variant: "destructive"});
       return;
     }

     try {
       const studentDocRef = doc(db, "users", studentId);
       await updateDoc(studentDocRef, { status: newStatus });
       toast({ title: "Status Updated", description: `Student's status has been updated.` });
       setStudents(prevStudents => prevStudents.map(s => 
           s.id === studentId ? { ...s, status: newStatus } : s
       ));
     } catch (err: any) {
       console.error("Error updating student status:", err);
       toast({ title: "Update Failed", description: err.message || "Could not update student status.", variant: "destructive" });
     }
  };

  const handleResetProgress = async () => {
    if (!studentToReset || authUserFromContext?.id !== originalTeacherIdRef.current) {
      toast({ title: "Action Denied", description: "Permission denied.", variant: "destructive" });
      return;
    }
  
    const studentId = studentToReset.id;
    const studentDocRef = doc(db, "users", studentId);
    const quizResultsRef = collection(db, "users", studentId, "quizResults");
  
    try {
      const batch = writeBatch(db);
  
      const quizResultsSnapshot = await getDocs(quizResultsRef);
      quizResultsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
  
      batch.update(studentDocRef, {
        progress: {},
        unlockedAchievementIds: [],
      });
  
      await batch.commit();
  
      toast({
        title: "Progress Reset",
        description: `All progress for ${studentToReset.displayName} has been cleared.`,
      });
      
      await fetchStudentsList(originalTeacherIdRef.current!);
  
    } catch (err: any) {
      console.error("Error resetting progress:", err);
      toast({ title: "Reset Failed", description: "Could not reset student progress.", variant: "destructive" });
    } finally {
      setIsResetDialogOpen(false);
      setStudentToReset(null);
    }
  };

  const openDeleteDialog = (student: AppUser) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || !authUserFromContext || studentToDelete.teacherId !== authUserFromContext.id) {
      toast({ title: "Action Denied", description: "You can only delete students assigned to you.", variant: "destructive" });
      return;
    }
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete quizResults subcollection
      const quizResultsRef = collection(db, "users", studentToDelete.id, "quizResults");
      const quizResultsSnapshot = await getDocs(quizResultsRef);
      quizResultsSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete the main user document
      const userDocRef = doc(db, "users", studentToDelete.id);
      batch.delete(userDocRef);

      await batch.commit();

      toast({ title: "Student Deleted", description: `${studentToDelete.displayName} has been permanently removed from the system.` });
      await fetchStudentsList(authUserFromContext.id);

    } catch (err: any) {
      console.error("Error deleting student:", err);
      toast({ title: "Deletion Failed", description: "Could not delete student. Note: Deleting the auth record is not supported from the client.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status?: UserStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'transferred':
        return 'secondary';
      case 'dropped':
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const canManageStudent = authUserFromContext?.role === 'teacher' && authUserFromContext?.id === originalTeacherIdRef.current;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <Users className="h-8 w-8" /> Manage Students
            </CardTitle>
            <CardDescription>
              View, add, and manage student accounts assigned to you.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddStudentDialogOpen(true)} className="mt-4 sm:mt-0" disabled={!canManageStudent || isLoading}>
            <UserPlus className="mr-2 h-4 w-4" /> Add New Student
          </Button>
        </CardHeader>
      </Card>
      
      <AddStudentDialog
        isOpen={isAddStudentDialogOpen}
        onOpenChange={setIsAddStudentDialogOpen}
        onStudentAdded={handleAddStudent}
        sections={sections}
      />

      <EditStudentDialog
        isOpen={isEditStudentDialogOpen}
        onOpenChange={setIsEditStudentDialogOpen}
        student={editingStudent}
        onStudentUpdated={handleUpdateStudent}
        sections={sections}
      />

      <ViewStudentDialog
        isOpen={isViewStudentDialogOpen}
        onOpenChange={setIsViewStudentDialogOpen}
        student={viewingStudent}
      />
      
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently reset all progress, scores, and achievements for{" "}
              <strong>{studentToReset?.displayName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToReset(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetProgress}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Reset Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Student Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{studentToDelete?.displayName}</strong>? This will remove all their data, including quiz results and progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
           <CardTitle>Your Student List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <CardDescription>Showing {filteredStudents.length} of {students.length} total students.</CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filter by grade..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Grades</SelectItem>
                            <SelectItem value="Grade 7">Grade 7</SelectItem>
                            <SelectItem value="Grade 8">Grade 8</SelectItem>
                            <SelectItem value="Grade 9">Grade 9</SelectItem>
                            <SelectItem value="Grade 10">Grade 10</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                        <SelectTrigger className="w-full sm:w-[240px]">
                            <SelectValue placeholder="Filter by section..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sections</SelectItem>
                            {sections.map(section => (
                                <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading students...</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && authUserFromContext && authUserFromContext.role === 'teacher' && (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead className="hidden md:table-cell">Grade Level</TableHead>
                    <TableHead className="hidden lg:table-cell">Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} className={student.status !== 'active' ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{student.displayName || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{student.gradeLevel || "N/A"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{student.sectionName || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize">
                            {student.status?.replace('_', ' ') || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canManageStudent}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Manage</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleViewStudent(student)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEditStudent(student)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setStudentToReset(student);
                                  setIsResetDialogOpen(true);
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reset Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => openDeleteDialog(student)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Student
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => handleUpdateStudentStatus(student.id, 'active')}>Active</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStudentStatus(student.id, 'dropped')}>Dropped</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStudentStatus(student.id, 'failed')}>Failed</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStudentStatus(student.id, 'transferred')}>Transferred</DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No students match the current filters.
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
