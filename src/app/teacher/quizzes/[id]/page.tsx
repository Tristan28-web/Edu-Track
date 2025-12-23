"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { CourseContentItem, QuizDetails, AppUser, UserProgressTopic } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, ListChecks, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";

interface StudentQuizResult {
  studentId: string;
  studentName: string;
  score: number | null;
  status: 'Completed' | 'In Progress' | 'Not Started' | 'Content Viewed';
}

export default function QuizSubmissionsPage() {
  const params = useParams();
  const contentId = typeof params.id === 'string' ? params.id : "";
  
  const { user: teacher, loading: authLoading } = useAuth();
  const [quiz, setQuiz] = useState<CourseContentItem | null>(null);
  const [results, setResults] = useState<StudentQuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !teacher || !contentId) {
      setIsLoading(false);
      return () => {};
    }

    let unsubscribe: () => void = () => {};

    const fetchQuizAndListenForSubmissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const quizDocRef = doc(db, "courseContent", contentId);
        const quizDocSnap = await getDoc(quizDocRef);

        if (!quizDocSnap.exists() || quizDocSnap.data().teacherId !== teacher.id || quizDocSnap.data().contentType !== 'quiz') {
          throw new Error("Quiz not found or you do not have permission to view it.");
        }
        const fetchedQuiz = { id: quizDocSnap.id, ...quizDocSnap.data() } as CourseContentItem;
        setQuiz(fetchedQuiz);

        const studentsQuery = query(
          collection(db, "users"),
          where("teacherId", "==", teacher.id),
          where("role", "==", "student")
        );
        
        unsubscribe = onSnapshot(studentsQuery, (studentsSnapshot) => {
          if (studentsSnapshot.empty) {
            setResults([]);
            setIsLoading(false);
            return;
          }

          const studentResults: StudentQuizResult[] = [];
          
          studentsSnapshot.forEach(studentDoc => {
            const studentId = studentDoc.id;
            const studentData = studentDoc.data() as AppUser;
            const progressData = studentData.progress?.[fetchedQuiz.topic] as UserProgressTopic | undefined;
            
            // Get the score (already rounded in the database)
            const rawScore = progressData?.lastQuizScore;
            const score = rawScore !== undefined && rawScore !== null ? Math.round(rawScore) : null;
            
            // Determine status based on score and quiz completion
            let status: 'Completed' | 'In Progress' | 'Not Started' | 'Content Viewed' = 'Not Started';
            
            if (score !== null) {
              // Student has a score, so quiz is completed
              status = 'Completed';
            } else if (progressData?.status === 'Completed' || progressData?.status === 'In Progress' || progressData?.status === 'Content Viewed') {
              // Use the topic status if no score but topic has progress
              status = progressData.status;
            }
            // Otherwise, status remains 'Not Started'
            
            studentResults.push({
              studentId: studentId,
              studentName: studentData.displayName || "Unnamed Student",
              score: score,
              status: status,
            });
          });
          
          setResults(studentResults.sort((a, b) => (a.studentName > b.studentName) ? 1 : -1));
          setIsLoading(false);
        }, (err) => {
           console.error("Error listening for student submissions:", err);
           setError("Failed to load real-time submission data.");
           setIsLoading(false);
        });

      } catch (err: any) {
        console.error("Error fetching quiz data:", err);
        setError(err.message || "An unexpected error occurred.");
        setIsLoading(false);
      }
    };

    fetchQuizAndListenForSubmissions();

    return () => unsubscribe();
  }, [contentId, teacher, authLoading]);

  // Calculate average score - FIXED: Avoid NaN and properly handle rounding
  const completedResults = results.filter(r => r.score !== null);
  const averageScore = completedResults.length > 0 ? 
    Math.round(
      completedResults.reduce((acc, r) => acc + (r.score || 0), 0) / 
      completedResults.length
    ) : 0;
  
  const completionRate = results.length > 0 ? 
    Math.round(
      (results.filter(r => r.status === 'Completed').length / results.length) * 100
    ) : 0;

  // Rest of your component remains the same...
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading quiz results...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <Button asChild variant="outline" size="sm" className="mb-4 w-fit">
            <Link href="/teacher/quizzes"><ArrowLeft className="mr-2 h-4 w-4" />Back to Quizzes</Link>
          </Button>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <ListChecks className="h-8 w-8" /> {quiz?.title} Results
          </CardTitle>
          <CardDescription>
            Review student performance for this quiz. Updates will appear in real-time.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class Average Score</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                  {completedResults.length > 0 ? 
                    <><AnimatedCounter value={averageScore} />%</> : 
                    'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on {completedResults.length} completed quizzes
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={completionRate} />%</div>
                <p className="text-xs text-muted-foreground">
                  {results.filter(r => r.status === 'Completed').length} out of {results.length} students completed
                </p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length > 0 ? (
                  results.map(result => (
                    <TableRow key={result.studentId}>
                      <TableCell className="font-medium">{result.studentName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          result.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          result.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                          result.status === 'Content Viewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                          {result.score !== null ? `${result.score}%` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      No students have been assigned this quiz's topic yet.
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
