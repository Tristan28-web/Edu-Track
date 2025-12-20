
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
            const studentData = studentDoc.data() as AppUser;
            const progressData = studentData.progress?.[fetchedQuiz.topic] as UserProgressTopic | undefined;

            studentResults.push({
              studentId: studentDoc.id,
              studentName: studentData.displayName || "Unnamed Student",
              score: progressData?.lastQuizScore ?? null,
              status: progressData?.status || 'Not Started',
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

  const averageScore = results.length > 0 ? Math.round(
    results
        .map(r => r.score || 0)
        .reduce((acc, score) => acc + score, 0) / results.filter(r => r.score !== null).length
  ) : 0;
  
  const completionRate = results.length > 0 ? Math.round(
    (results.filter(r => r.status === 'Completed').length / results.length) * 100
  ) : 0;

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
                <div className="text-2xl font-bold">{isNaN(averageScore) ? 'N/A' : <><AnimatedCounter value={averageScore} />%</>}</div>
                 <p className="text-xs text-muted-foreground">Based on completed quizzes</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold"><AnimatedCounter value={completionRate} />%</div>
                <p className="text-xs text-muted-foreground">{results.filter(r => r.status === 'Completed').length} out of {results.length} students completed</p>
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
                      <TableCell>{result.status}</TableCell>
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
