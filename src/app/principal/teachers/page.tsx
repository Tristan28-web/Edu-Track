
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, UserCog, MoreHorizontal } from "lucide-react";
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

export default function PrincipalTeachersPage() {
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.role !== 'principal') {
      setIsLoading(false);
      if(user) setError("You do not have permission to view this page.");
      return;
    }
    const fetchTeachersList = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef, where("role", "==", "teacher"), orderBy("displayName", "asc"));
        const querySnapshot = await getDocs(q);
        const fetchedTeachers: AppUser[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
        setTeachers(fetchedTeachers);
      } catch (err: any) {
        setError(`Failed to load teachers. Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachersList();
  }, [user]);

  const handleUpdateStatus = async (teacherId: string, newStatus: UserStatus) => {
    if (user?.role !== 'principal') {
       toast({ title: "Action Denied", description: "You do not have permission to perform this action.", variant: "destructive"});
       return;
    }
   
    try {
     const teacherDocRef = doc(db, "users", teacherId);
     await updateDoc(teacherDocRef, { status: newStatus });
     toast({ title: "Status Updated", description: `Teacher's status has been updated.` });
     setTeachers(prevTeachers => prevTeachers.map(t => 
         t.id === teacherId ? { ...t, status: newStatus } : t
     ));
    } catch (err: any) {
     console.error("Error updating teacher status:", err);
     toast({ title: "Update Failed", description: err.message || "Could not update teacher status.", variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
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
  
  const canManage = user?.role === 'principal';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <UserCog className="h-8 w-8" /> Teacher Roster
          </CardTitle>
          <CardDescription>
            A read-only list of all teachers in the school.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading teachers...</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Years of Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <TableRow key={teacher.id} className={teacher.status !== 'active' ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{teacher.displayName || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{teacher.email || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{teacher.contactNumber || 'N/A'}</TableCell>
                      <TableCell>{teacher.yearsOfExperience ?? 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(teacher.status)} className="capitalize">
                          {teacher.status?.replace('_', ' ') || 'Active'}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!canManage}>
                                Manage
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                               <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(teacher.id, 'active')}>Active</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(teacher.id, 'on_leave')}>On Leave</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(teacher.id, 'deactivated')}>Deactivated</DropdownMenuItem>
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
                      No teachers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
