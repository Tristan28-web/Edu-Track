"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle, Search, FileText } from "lucide-react";
import type { CourseContentItem, AppUser, QuizResult } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QuizAnalytics {
  quiz: (CourseContentItem & { teacher?: AppUser }) | null;
  results: QuizResult[];
  averageScore: number;
  totalAttempts: number;
}

export default function QuizAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const quizDocRef = doc(db, "courseContent", id);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists() || quizDoc.data().contentType !== 'quiz') {
          setError("Quiz not found.");
          setIsLoading(false);
          return;
        }

        const quizData = { id: quizDoc.id, ...quizDoc.data() } as CourseContentItem;
        
        let teacherData: AppUser | undefined = undefined;
        if (quizData.teacherId) {
          const teacherDoc = await getDoc(doc(db, "users", quizData.teacherId));
          if (teacherDoc.exists()) {
            teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as AppUser;
          }
        }

        // Get all students
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        // Fetch quiz results from each student's subcollection
        const allResults: QuizResult[] = [];
        
        for (const studentDoc of studentsSnapshot.docs) {
          const studentId = studentDoc.id;
          const quizResultsQuery = query(
            collection(db, `users/${studentId}/quizResults`),
            where("quizId", "==", id)
          );
          const resultsSnapshot = await getDocs(quizResultsQuery);
          
          if (!resultsSnapshot.empty) {
            resultsSnapshot.forEach(doc => {
              allResults.push(doc.data() as QuizResult);
            });
          }
        }

        const totalAttempts = allResults.length;
        const averageScore = totalAttempts > 0 ? allResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalAttempts : 0;
        
        setAnalytics({
          quiz: { ...quizData, teacher: teacherData },
          results: allResults,
          totalAttempts: totalAttempts,
          averageScore: Math.round(averageScore),
        });

      } catch (err: any) {
        console.error("Error fetching quiz analytics:", err);
        setError("Failed to load quiz analytics. " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [id]);
  
  const scoreDistribution = analytics ? analytics.results.reduce((acc, result) => {
    const score = result.percentage || 0;
    if (score >= 90) acc['90-100']++;
    else if (score >= 80) acc['80-89']++;
    else if (score >= 70) acc['70-79']++;
    else if (score >= 60) acc['60-69']++;
    else acc['<60>']++;
    return acc;
  }, {'90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60>': 0}) : {};
  
  const scoreData = Object.entries(scoreDistribution).map(([name, value]) => ({ name, count: value }));


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics || !analytics.quiz) {
    return null;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
       <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Search className="h-8 w-8" /> Global Search
          </CardTitle>
          <CardDescription>
            You are viewing the analytics for the quiz: {analytics.quiz.title}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
