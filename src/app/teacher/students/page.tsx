
"use client";

import { useEffect, useState, useRef } from "react"; 
import { collection, getDocs, doc, setDoc, Timestamp, query, where, orderBy, addDoc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth as firebaseAuth, db, firebaseConfig } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Edit, Loader2, UserPlus, AlertTriangle, MoreHorizontal, Hourglass, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddStudentDialog, type AddStudentFormData } from "@/components/teacher/AddStudentDialog";
import { EditStudentDialog, type EditStudentFormData } from "@/components/teacher/EditStudentDialog";
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
          quarterStatus: data.quarterStatus || { q1: false, q2: false, q3: false, q4: false },
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
      
      const email = `${data.username}@edu-track.local`;
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
        quarterStatus: { q1: false, q2: false, q3: false, q4: false },
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
        message: `You registered a new student: "${newStudentForFirestore.displayName}".`,
        timestamp: Timestamp.now(),
        type: 'student_registered',
        relatedItemId: newStudentForFirestore.id,
        relatedItemTitle: newStudentForFirestore.displayName,
        studentName: newStudentForFirestore.displayName,
        link: `/teacher/students`
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
  
  const handleToggleQuarter = async (student: AppUser, quarter: 'q1' | 'q2' | 'q3' | 'q4') => {
    if (authUserFromContext?.id !== originalTeacherIdRef.current) {
        toast({ title: "Action Denied", description: "Permission denied.", variant: "destructive" });
        return;
    }
    
    const currentStatus = student.quarterStatus?.[quarter] || false;
    const newStatus = !currentStatus;
    const actionText = newStatus ? "ended" : "reopened";
    const quarterText = `Quarter ${quarter.substring(1)}`;

    try {
        const studentDocRef = doc(db, "users", student.id);
        await updateDoc(studentDocRef, { [`quarterStatus.${quarter}`]: newStatus });
        toast({ title: "Success", description: `${quarterText} has been ${actionText} for ${student.displayName}.` });
        setStudents(prev => prev.map(s => 
            s.id === student.id ? { ...s, quarterStatus: { ...s.quarterStatus, [quarter]: newStatus } } : s
        ));
    } catch(err: any) {
        console.error("Error toggling quarter status:", err);
        toast({ title: "Update Failed", description: err.message || "Could not update quarter status.", variant: "destructive" });
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
  
  const formatEndedQuarters = (status?: { [key: string]: boolean }): string => {
    if (!status) return "All Ongoing";
    const ended = Object.entries(status)
      .filter(([_, isEnded]) => isEnded)
      .map(([key]) => `Q${key.substring(1)}`);
    return ended.length > 0 ? `${ended.join(', ')} Ended` : "All Ongoing";
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

      <Card>
        <CardHeader>
          <CardTitle>Your Student List</CardTitle>
          <CardDescription>A list of students you are managing.</CardDescription>
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
          {!isLoading && !error && !authUserFromContext && ( 
            <Alert variant="default">
              <AlertTitle>Login Required</AlertTitle>
              <AlertDescription>Please ensure you are logged in as a teacher to view and manage students.</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && authUserFromContext && authUserFromContext.role === 'teacher' && (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead className="hidden md:table-cell">Username</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quarter Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <TableRow key={student.id} className={student.status !== 'active' ? 'opacity-60' : ''}>
                        <TableCell>{student.displayName || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{student.username}</TableCell>
                        <TableCell>{student.sectionName || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize">
                            {student.status?.replace('_', ' ') || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatEndedQuarters(student.quarterStatus)}
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
                              <DropdownMenuItem onSelect={() => handleEditStudent(student)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                              </DropdownMenuItem>
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
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Manage Quarters</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuLabel>1st Quarter</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => handleToggleQuarter(student, 'q1')}>
                                      {student.quarterStatus?.q1 ? "Reopen" : "End"} Quarter 1
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>2nd Quarter</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => handleToggleQuarter(student, 'q2')}>
                                      {student.quarterStatus?.q2 ? "Reopen" : "End"} Quarter 2
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>3rd Quarter</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => handleToggleQuarter(student, 'q3')}>
                                      {student.quarterStatus?.q3 ? "Reopen" : "End"} Quarter 3
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>4th Quarter</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => handleToggleQuarter(student, 'q4')}>
                                      {student.quarterStatus?.q4 ? "Reopen" : "End"} Quarter 4
                                    </DropdownMenuItem>
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
                      <TableCell colSpan={6} className="text-center h-24">
                        No students found assigned to you. Use the "Add New Student" button to register students.
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
