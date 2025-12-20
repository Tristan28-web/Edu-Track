
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Section {
    id: string;
    name: string;
}

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};


export default function PrincipalProgressOverviewPage() {
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user: authUser } = useAuth();
  
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  useEffect(() => {
    if (!authUser || authUser.role !== 'principal') {
      setIsLoading(false);
      if (authUser) setError("Accessing this page requires a principal login.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student"),
      orderBy("displayName", "asc")
    );

    const unsubscribeStudents = onSnapshot(studentsQuery, (studentsSnapshot) => {
        setAllStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
        if (!sections.length) { // Only fetch sections if they haven't been fetched
             const sectionsQuery = query(collection(db, "sections"), orderBy("name"));
             getDocs(sectionsQuery).then(sectionsSnapshot => {
                setSections(sectionsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
                setIsLoading(false);
             }).catch(err => {
                console.error("Error fetching sections:", err);
                setError("Failed to load section data for filtering.");
                setIsLoading(false);
             });
        } else {
            setIsLoading(false);
        }
    }, (err: any) => {
      console.error("Error listening to students:", err);
      setError("Failed to load student data in real-time.");
      setIsLoading(false);
    });
    
    return () => {
      unsubscribeStudents();
    }
  }, [authUser, sections.length]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const gradeMatch = gradeFilter === 'all' || student.gradeLevel === gradeFilter;
      const sectionMatch = sectionFilter === 'all' || student.sectionId === sectionFilter;
      return gradeMatch && sectionMatch;
    });
  }, [allStudents, gradeFilter, sectionFilter]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <TrendingUp className="h-8 w-8" /> Student Progress Overview
          </CardTitle>
          <CardDescription>
            Select a student to view their detailed academic performance report. Use the filters to narrow your search.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Student List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <CardDescription>Showing {filteredStudents.length} of {allStudents.length} total students.</CardDescription>
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
          <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="hidden md:table-cell">Grade Level</TableHead>
                        <TableHead className="hidden lg:table-cell">Section</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.displayName}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">@{student.username}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{student.gradeLevel || 'N/A'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{student.sectionName || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/principal/progress-overview/${student.id}`}>
                              View Progress <ChevronRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No progress data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
