"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Loader2, AlertTriangle, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ViewStudentDialog } from "@/components/teacher/ViewStudentDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Section {
    id: string;
    name: string;
}

export default function StudentDetailsPage() {
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewStudentDialogOpen, setIsViewStudentDialogOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<AppUser | null>(null);

  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const { user: authUserFromContext } = useAuth();

  useEffect(() => {
    if (authUserFromContext) {
      if (authUserFromContext.role === 'principal') {
        
        let unsubStudents: (() => void) | undefined;
        let unsubSections: (() => void) | undefined;
        
        const fetchStudentsAndSections = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const studentsCollectionRef = collection(db, "users");
            const studentQuery = query(
              studentsCollectionRef,
              where("role", "==", "student"),
              orderBy("createdAt", "desc")
            );
            unsubStudents = onSnapshot(studentQuery, (querySnapshot) => {
              const fetchedStudents: AppUser[] = querySnapshot.docs.map((docInstance) => ({
                id: docInstance.id,
                status: docInstance.data().status || 'active',
                ...docInstance.data(),
              } as AppUser));
              setAllStudents(fetchedStudents);
            }, (err) => {
                 console.error("Error fetching students:", err);
                 setError("Failed to load students. Please try again.");
            });

            const sectionsQuery = query(collection(db, "sections"), orderBy("name"));
            unsubSections = onSnapshot(sectionsQuery, (snapshot) => {
                setSections(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
                setIsLoading(false);
            }, (err) => {
                console.error("Error fetching sections:", err);
                setError("Failed to load sections data.");
                setIsLoading(false);
            });

          } catch (err: any) {
            console.error("Error setting up listeners:", err);
            setError("Failed to load page data. Please try again.");
            setIsLoading(false);
          }
        };

        fetchStudentsAndSections();
        
        return () => {
            if (unsubStudents) unsubStudents();
            if (unsubSections) unsubSections();
        }
      } else {
        setError("Accessing this page requires a principal login.");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setError("Please log in as a principal to view students.");
    }
  }, [authUserFromContext]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const gradeMatch = gradeFilter === 'all' || student.gradeLevel === gradeFilter;
      const sectionMatch = sectionFilter === 'all' || student.sectionId === sectionFilter;
      return gradeMatch && sectionMatch;
    });
  }, [allStudents, gradeFilter, sectionFilter]);

  const handleViewStudent = (studentToView: AppUser) => {
    setViewingStudent(studentToView);
    setIsViewStudentDialogOpen(true);
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

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Users className="h-8 w-8" /> Student Details
          </CardTitle>
          <CardDescription>
            Browse, filter, and view the details of all students in the system.
          </CardDescription>
        </CardHeader>
      </Card>

      <ViewStudentDialog
        isOpen={isViewStudentDialogOpen}
        onOpenChange={setIsViewStudentDialogOpen}
        student={viewingStudent}
      />

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
           <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardDescription>
                Showing {filteredStudents.length} of {allStudents.length} total students.
            </CardDescription>
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
          {!isLoading && !error && (
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
                      <TableRow key={student.id}>
                        <TableCell>{student.displayName || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{student.gradeLevel || "N/A"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{student.sectionName || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(student.status)} className="capitalize">
                            {student.status?.replace('_', ' ') || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleViewStudent(student)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No students found matching your filters.
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
