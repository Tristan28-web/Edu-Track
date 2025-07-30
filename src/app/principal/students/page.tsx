
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Users, MoreHorizontal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
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
} from "@/components/ui/dropdown-menu";

export default function PrincipalStudentsPage() {
  const [students, setStudents] = useState<AppUser[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'principal') {
      setIsLoading(false);
      if(user) setError("You do not have permission to view this page.");
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all teachers to create a lookup map
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const teachersSnapshot = await getDocs(teachersQuery);
        const teacherMap: Record<string, string> = {};
        teachersSnapshot.forEach(doc => {
            teacherMap[doc.id] = doc.data().displayName || "Unknown Teacher";
        });
        setTeachers(teacherMap);

        // Fetch all students
        const studentsRef = collection(db, "users");
        const q = query(studentsRef, where("role", "==", "student"), orderBy("displayName", "asc"));
        const querySnapshot = await getDocs(q);
        const fetchedStudents: AppUser[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
        setStudents(fetchedStudents);

      } catch (err: any) {
        setError(`Failed to load students. Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);
  
  const handleUpdateStatus = async (studentId: string, newStatus: UserStatus) => {
    if (user?.role !== 'principal') {
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


  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
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
  
  const canManage = user?.role === 'principal';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Users className="h-8 w-8" /> Student Roster
          </CardTitle>
          <CardDescription>
            A read-only list of all students in the school.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
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
          {!isLoading && !error && (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Section</TableHead>
                    <TableHead className="hidden md:table-cell">Adviser</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <TableRow key={student.id} className={student.status !== 'active' ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{student.displayName || "N/A"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{student.sectionName || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{student.teacherId ? teachers[student.teacherId] : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize">
                            {student.status?.replace('_', ' ') || 'Active'}
                          </Badge>
                        </TableCell>
                         <TableCell className="text-right">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canManage}>
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Manage</span>
                                </Button>
                              </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                               <DropdownMenuLabel>Actions</DropdownMenuLabel>
                               <DropdownMenuSub>
                                 <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                 <DropdownMenuPortal>
                                   <DropdownMenuSubContent>
                                     <DropdownMenuItem onSelect={() => handleUpdateStatus(student.id, 'active')}>Active</DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleUpdateStatus(student.id, 'dropped')}>Dropped</DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleUpdateStatus(student.id, 'failed')}>Failed</DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleUpdateStatus(student.id, 'transferred')}>Transferred</DropdownMenuItem>
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
                        No students found in the system.
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
