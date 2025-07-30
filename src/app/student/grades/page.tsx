
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import type { AppUser, CourseContentItem, GradeResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, GraduationCap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { mathTopics } from '@/config/topics';

const GRADING_PERIODS = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

const gpaScale = [
    { range: [97, 100], gpa: 4.0 },
    { range: [93, 96], gpa: 3.7 },
    { range: [90, 92], gpa: 3.3 },
    { range: [87, 89], gpa: 3.0 },
    { range: [83, 86], gpa: 2.7 },
    { range: [80, 82], gpa: 2.3 },
    { range: [77, 79], gpa: 2.0 },
    { range: [73, 76], gpa: 1.7 },
    { range: [70, 72], gpa: 1.3 },
    { range: [67, 69], gpa: 1.0 },
    { range: [0, 66], gpa: 0.0 },
];

const convertToGpa = (percentage: number | null) => {
    if (percentage === null) return 0;
    const scale = gpaScale.find(s => percentage >= s.range[0] && percentage <= s.range[1]);
    return scale ? scale.gpa : 0.0;
};

const calculateAverage = (grades: GradeResult[]) => {
    if (!grades || grades.length === 0) return { percentage: 0, gpa: 0 };
    const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
    const totalPossible = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    if (totalPossible === 0) return { percentage: 0, gpa: 0 };
    const percentage = Math.round((totalScore / totalPossible) * 100);
    const gpa = convertToGpa(percentage);
    return { percentage, gpa };
};

export default function GradesPage() {
  const { user, loading: authLoading } = useAuth();
  const [gradesByQuarter, setGradesByQuarter] = useState<Record<string, GradeResult[]>>({});
  const [quarterStatus, setQuarterStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !user.teacherId) {
      setError("You must be logged in and assigned to a teacher to view your grades.");
      setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const quizzesQuery = query(
          collection(db, 'courseContent'),
          where('teacherId', '==', user.teacherId),
          where('contentType', '==', 'quiz'),
          where('isArchived', '==', false)
        );
        const quizzesSnapshot = await getDocs(quizzesQuery);
        const allTeacherQuizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));

        const userDocRef = doc(db, 'users', user.id);
        const unsubscribe = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const studentData = userDocSnap.data() as AppUser;
            setQuarterStatus(studentData.quarterStatus || { q1: false, q2: false, q3: false, q4: false });
            
            const studentProgress = studentData.progress || {};
            
            const resultsByQuarter: Record<string, GradeResult[]> = {
              "1st Quarter": [],
              "2nd Quarter": [],
              "3rd Quarter": [],
              "4th Quarter": [],
            };

            allTeacherQuizzes.forEach(quiz => {
              const gradingPeriod = quiz.gradingPeriod;
              if (gradingPeriod && resultsByQuarter.hasOwnProperty(gradingPeriod)) {
                  const progressForTopic = studentProgress[quiz.topic];
                  if (progressForTopic?.lastQuizTotal) {
                    resultsByQuarter[gradingPeriod].push({
                      title: quiz.title,
                      topic: mathTopics.find(t => t.slug === quiz.topic)?.title || quiz.topic,
                      score: progressForTopic.lastQuizCorrect ?? null,
                      total: progressForTopic.lastQuizTotal ?? null,
                    });
                  }
              }
            });
            setGradesByQuarter(resultsByQuarter);

          } else {
             setError("Could not find your user data.");
          }
          setIsLoading(false);
        }, (err) => {
          console.error("Error listening to user data:", err);
          setError("Failed to load your progress data in real-time.");
          setIsLoading(false);
        });

        return unsubscribe;

      } catch (err: any) {
        console.error("Error fetching initial quiz data:", err);
        setError(`Failed to load quizzes. Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    const unsubscribePromise = fetchAllData();
    
    return () => {
        unsubscribePromise.then(unsub => {
            if (unsub) unsub();
        });
    };
  }, [user, authLoading]);

  const hasAnyGradedQuizzes = Object.values(gradesByQuarter).some(quarter => quarter.length > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your grades...</p>
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
            <GraduationCap className="h-8 w-8" /> Grades
          </CardTitle>
          <CardDescription>
            A summary of your quiz scores for each grading period.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {!hasAnyGradedQuizzes ? (
         <Card>
            <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">No graded quizzes found. Complete quizzes in the "Lessons" section to see your grades here.</p>
            </CardContent>
         </Card>
      ) : (
        GRADING_PERIODS.map((period, index) => {
          const grades = gradesByQuarter[period] || [];
          const isEnded = quarterStatus[`q${index + 1}` as keyof typeof quarterStatus] || false;
          const average = calculateAverage(grades);
          
          if (grades.length === 0 && !isEnded) return null; // Don't show empty ongoing quarters

          return (
            <Card key={period}>
              <CardHeader>
                <CardTitle>{period}</CardTitle>
                <CardDescription>{isEnded ? "Quarter has ended." : "Quarter is ongoing."}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz Title</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.length > 0 ? (
                        grades.map((grade, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{grade.title}</TableCell>
                            <TableCell>{grade.topic}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {`${grade.score ?? 'N/A'} / ${grade.total ?? 'N/A'}`}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                No quizzes completed yet for this quarter.
                            </TableCell>
                        </TableRow>
                    )}
                    {isEnded && grades.length > 0 && (
                        <TableRow className="bg-secondary/50 font-bold">
                            <TableCell colSpan={2} className="text-right">Overall Average for Quarter</TableCell>
                            <TableCell className="text-right">
                                {average.percentage}% ({average.gpa.toFixed(2)} GPA)
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  );
}
