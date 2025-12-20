"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Loader2, AlertTriangle, FileText, ChevronRight, Users } from "lucide-react";
import type { CourseContentItem, AppUser } from "@/types";
import { mathTopics } from "@/config/topics";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResults {
  users: AppUser[];
  courseContent: CourseContentItem[];
}

export default function TeacherSearchPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResults>({ users: [], courseContent: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setError("Please enter a search query.");
      return;
    }
    if (!user) {
        setError("You must be logged in to search.");
        return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setResults({ users: [], courseContent: [] });

    try {
      const lowerCaseQuery = queryText.toLowerCase();

      // 1. Fetch all students for the teacher
      const studentQuery = query(
        collection(db, "users"),
        where("teacherId", "==", user.id),
        where("role", "==", "student")
      );
      const studentPromise = getDocs(studentQuery);

      // 2. Fetch all quizzes for the teacher
      const quizQuery = query(
        collection(db, "courseContent"),
        where("teacherId", "==", user.id),
        where("contentType", "==", "quiz")
      );
      const quizPromise = getDocs(quizQuery);

      // 3. Fetch all resources for the teacher
      const resourceQuery = query(
        collection(db, "courseContent"),
        where("teacherId", "==", user.id),
        where("contentType", "==", "lessonMaterial")
      );
      const resourcePromise = getDocs(resourceQuery);

      const [studentSnapshot, quizSnapshot, resourceSnapshot] = await Promise.all([
        studentPromise, 
        quizPromise, 
        resourcePromise
      ]);

      // Filter students on the client-side
      const allStudents: AppUser[] = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      const filteredUsers = allStudents.filter(student => 
        student.displayName?.toLowerCase().includes(lowerCaseQuery) ||
        (student.username && student.username.toLowerCase().includes(lowerCaseQuery))
      );

      // Filter content on the client-side
      const allQuizzes: CourseContentItem[] = quizSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));
      const filteredQuizzes = allQuizzes.filter(quiz => quiz.title.toLowerCase().includes(lowerCaseQuery));

      const allResources: CourseContentItem[] = resourceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));
      const filteredResources = allResources.filter(resource => resource.title.toLowerCase().includes(lowerCaseQuery));

      const filteredContent = [...filteredQuizzes, ...filteredResources].sort((a, b) => a.title.localeCompare(b.title));

      setResults({ users: filteredUsers, courseContent: filteredContent });

    } catch (err: any) {
      console.error("Error performing search:", err);
      setError(`An unexpected error occurred during the search. Please try again. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (searchQuery) {
      performSearch(searchQuery);
    }
  }, [searchQuery, user]);

  const noResults = hasSearched && !isLoading && results.users.length === 0 && results.courseContent.length === 0;
  
  const getCourseContentTitle = () => {
    const count = results.courseContent.length;
    if (count === 0) return "";

    const hasQuizzes = results.courseContent.some(item => item.contentType === 'quiz');
    const hasResources = results.courseContent.some(item => item.contentType === 'lessonMaterial');
    const itemsFound = `(${count} item${count > 1 ? 's' : ''} found)`;

    if (hasQuizzes && hasResources) {
        return `Quizzes & Resources ${itemsFound}`;
    }
    if (hasQuizzes) {
        return `Quiz${count > 1 ? 'zes' : ''} ${itemsFound}`;
    }
    if (hasResources) {
        return `Resource${count > 1 ? 's' : ''} ${itemsFound}`;
    }
    return `Course Content ${itemsFound}`;
  };


  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Search className="h-8 w-8" /> Global Search
          </CardTitle>
          <CardDescription>
            {searchQuery ? `Search results for "${searchQuery}"` : "Search for students, quizzes, and learning resources"}
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!searchQuery && !hasSearched && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Enter a search term in the header search bar to find students and content.
          </CardContent>
        </Card>
      )}

      {noResults && searchQuery && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No students or content found for "{searchQuery}".
          </CardContent>
        </Card>
      )}

      {/* Student Results */}
      {results.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users />
              Students ({results.users.length} found)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {results.users.map(student => (
              <div key={student.id} className="p-4 border rounded-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarImage src={student.avatarUrl || undefined} alt={student.displayName || ''} />
                        <AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="font-semibold text-lg">{student.displayName}</h4>
                        <p className="text-sm text-muted-foreground">@{student.username}</p>
                    </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teacher/students/view/${student.id}`}>
                    View Profile <ChevronRight className="ml-2 h-4 w-4"/>
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Content Results */}
      {results.courseContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText />
              {getCourseContentTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {results.courseContent.map(item => (
              <div key={item.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                    <Badge variant={item.contentType === 'quiz' ? "default" : "secondary"} className="capitalize">
                      {item.contentType === 'lessonMaterial' ? 'Resource' : 'Quiz'}
                    </Badge>
                    <span>Topic: {mathTopics.find(t => t.slug === item.topic)?.title || item.topic}</span>
                  </div>
                  {item.description && (
                    <p className="text-sm mt-2 text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href={item.contentType === 'quiz' ? `/teacher/quizzes/view/${item.id}` : `/teacher/materials/view/${item.id}`}>
                    View <ChevronRight className="ml-2 h-4 w-4"/>
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
