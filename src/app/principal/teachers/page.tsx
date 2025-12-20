
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, getDocs, Timestamp, deleteDoc, writeBatch, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { db, firebaseConfig } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, UserCog, UserPlus, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { AddTeacherDialog, type AddTeacherFormData } from "@/components/admin/AddTeacherDialog";
import { EditTeacherDialog, type EditTeacherFormData } from "@/components/admin/EditTeacherDialog";
import ViewTeacherDialog from "@/components/admin/ViewTeacherDialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


async function callCreateTeacherBackendFunction(data: { email: string; password: string }): Promise<{ success: boolean; uid?: string; error?: string }> {
  const tempAppName = `auth-worker-principal-${Date.now()}`;
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

export default function TeacherManagementPage() {
  const { user } = useAuth();
  const [allTeachers, setAllTeachers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditTeacherDialogOpen, setIsEditTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<AppUser | null>(null);
  const [isViewTeacherDialogOpen, setIsViewTeacherDialogOpen] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<AppUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  useEffect(() => {
    if (!user || user.role !== 'principal') {
      setError("You must be a principal to view this page.");
      setIsLoading(false);
      return;
    }

    const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"), orderBy("displayName", "asc"));
    
    const unsubscribe = onSnapshot(teachersQuery, async (snapshot) => {
        const teacherList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));

        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentCounts = new Map<string, number>();
        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            if (student.teacherId) {
                studentCounts.set(student.teacherId, (studentCounts.get(student.teacherId) || 0) + 1);
            }
        });

        const teachersWithStudentCount = teacherList.map(teacher => ({
            ...teacher,
            studentCount: studentCounts.get(teacher.id) || 0,
        }));
        
        setAllTeachers(teachersWithStudentCount);
        setIsLoading(false);
    }, (err) => {
        console.error("Error fetching teachers:", err);
        setError("Failed to load teacher list.");
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTeachers = useMemo(() => {
    if (statusFilter === 'all') {
      return allTeachers;
    }
    return allTeachers.filter(teacher => teacher.status === statusFilter);
  }, [allTeachers, statusFilter]);

  const handleAddTeacher = async (data: AddTeacherFormData) => {
    if (user?.role !== 'principal') {
        toast({ title: "Error", description: "Principal user details not found or invalid role. Cannot create teacher.", variant: "destructive" });
        throw new Error("Principal user details not available or invalid role.");
    }
    
    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", data.username));
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        throw new Error("Username is already taken.");
      }

      const email = `${data.username}@edu-track.local`;
      const authResponse = await callCreateTeacherBackendFunction({ email, password: data.password });

      if (!authResponse.success || !authResponse.uid) {
        throw new Error(authResponse.error || "Backend function failed to create user.");
      }
      
      const newTeacherForFirestore: AppUser = {
        id: authResponse.uid,
        username: data.username,
        email: email,
        displayName: `${data.firstName} ${data.lastName}`,
        role: 'teacher',
        status: 'active',
        createdAt: Timestamp.now(),
        lastLogin: null,
        ...data,
      };

      await setDoc(doc(db, "users", newTeacherForFirestore.id), newTeacherForFirestore);

      toast({
        title: "Teacher Created",
        description: `${newTeacherForFirestore.displayName} has been successfully created.`,
      });
      
      await addDoc(collection(db, "teacherActivities"), {
        teacherId: newTeacherForFirestore.id,
        principalId: user.id,
        message: `${user.displayName} registered a new teacher: "${newTeacherForFirestore.displayName}".`,
        timestamp: Timestamp.now(),
        type: 'teacher_registered',
        relatedItemId: newTeacherForFirestore.id,
        relatedItemTitle: newTeacherForFirestore.displayName,
      });
      
      setIsAddTeacherDialogOpen(false);

    } catch (err: any) {
      console.error("Error creating teacher:", err);
      const errorMessage = err.message || "Failed to create teacher. The username might already be in use or the password is too weak.";
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
      throw err;
    }
  };

  const handleViewTeacher = (teacherToView: AppUser) => {
    setViewingTeacher(teacherToView);
    setIsViewTeacherDialogOpen(true);
  };
  
  const handleEditTeacher = (teacherToEdit: AppUser) => {
    setEditingTeacher(teacherToEdit);
    setIsEditTeacherDialogOpen(true);
  };
  
  const handleUpdateTeacher = async (data: EditTeacherFormData) => {
    if (!editingTeacher) return;
    
    const teacherDocRef = doc(db, "users", editingTeacher.id);
    try {
        const updatePayload: Partial<AppUser> = {
            displayName: `${data.firstName} ${data.lastName}`,
            ...data,
        };
        
        await updateDoc(teacherDocRef, updatePayload as { [x: string]: any });

        toast({
            title: "Teacher Updated",
            description: `Details for ${updatePayload.displayName} have been saved.`,
        });
        setIsEditTeacherDialogOpen(false);
        setEditingTeacher(null);
    } catch (err: any) {
        console.error("Error updating teacher:", err);
        toast({
            title: "Update Failed",
            description: err.message || "Could not save teacher details.",
            variant: "destructive"
        });
    }
  };

  const handleUpdateTeacherStatus = async (teacherId: string, newStatus: UserStatus) => {
     try {
       const teacherDocRef = doc(db, "users", teacherId);
       await updateDoc(teacherDocRef, { status: newStatus });
       toast({ title: "Status Updated", description: `Teacher's status has been updated.` });
     } catch (err: any) {
       console.error("Error updating teacher status:", err);
       toast({ title: "Update Failed", description: err.message || "Could not update teacher status.", variant: "destructive" });
     }
  };

  const confirmDeleteTeacher = (teacher: AppUser) => {
    setTeacherToDelete(teacher);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "users", teacherToDelete.id));
      toast({ title: "Teacher Deleted", description: `Teacher ${teacherToDelete.displayName} has been removed from the system.` });
    } catch (err: any) {
      console.error("Error deleting teacher:", err);
      toast({ title: "Deletion Failed", description: err.message || "Could not delete teacher.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setTeacherToDelete(null);
    }
  };
  
  const canManageTeachers = user?.role === 'principal';
  
  const getStatusBadgeVariant = (status?: UserStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'on_leave':
        return 'secondary';
      case 'deactivated':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <UserCog className="h-8 w-8" /> Teacher Management
            </CardTitle>
            <CardDescription>
              View, add, and manage teacher accounts.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddTeacherDialogOpen(true)} disabled={!canManageTeachers || isLoading} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" /> Add New Teacher
          </Button>
        </CardHeader>
      </Card>
      
      <AddTeacherDialog
        isOpen={isAddTeacherDialogOpen}
        onOpenChange={setIsAddTeacherDialogOpen}
        onTeacherAdded={handleAddTeacher}
      />
      
      <EditTeacherDialog
        isOpen={isEditTeacherDialogOpen}
        onOpenChange={setIsEditTeacherDialogOpen}
        teacher={editingTeacher}
        onTeacherUpdated={handleUpdateTeacher}
      />
      
      <ViewTeacherDialog
        isOpen={isViewTeacherDialogOpen}
        onOpenChange={setIsViewTeacherDialogOpen}
        teacher={viewingTeacher}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the teacher account for <span className="font-bold">{teacherToDelete?.displayName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardDescription>A list of all registered teachers. Use the filter to narrow down results.</CardDescription>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as UserStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
          {error && <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          
          {!isLoading && !error && (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.displayName || "N/A"}</TableCell>
                        <TableCell>
                           <Badge variant={getStatusBadgeVariant(teacher.status)} className="capitalize">
                            {teacher.status?.replace('_', ' ') || 'Active'}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Manage</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleViewTeacher(teacher)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                {canManageTeachers && (
                                    <>
                                        <DropdownMenuItem onSelect={() => handleEditTeacher(teacher)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Teacher
                                        </DropdownMenuItem>
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => handleUpdateTeacherStatus(teacher.id, 'active')}>Active</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleUpdateTeacherStatus(teacher.id, 'on_leave')}>On Leave</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleUpdateTeacherStatus(teacher.id, 'deactivated')}>Deactivated</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => confirmDeleteTeacher(teacher)} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Teacher
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No teachers found.
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
