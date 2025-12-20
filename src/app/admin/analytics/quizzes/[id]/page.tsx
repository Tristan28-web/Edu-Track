"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertTriangle, FileText, Users, TrendingUp, Target, CheckCircle, XCircle } from "lucide-react";
import type { CourseContentItem, AppUser, QuizResult } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface QuizAnalytics {
  quiz: (CourseContentItem & { teacher?: AppUser }) | null;
  results: QuizResult[];
  averageScore: number;
  totalAttempts: number;
  totalStudents: number;
  completionRate: number;
  passRate: number;
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
        // 1. Fetch quiz data
        const quizDocRef = doc(db, "courseContent", id);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists() || quizDoc.data().contentType !== 'quiz') {
          setError("Quiz not found.");
          setIsLoading(false);
          return;
        }

        const quizData = { id: quizDoc.id, ...quizDoc.data() } as CourseContentItem;
        
        // 2. Fetch teacher data if available
        let teacherData: AppUser | undefined = undefined;
        if (quizData.teacherId) {
          const teacherDoc = await getDoc(doc(db, "users", quizData.teacherId));
          if (teacherDoc.exists()) {
            teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as AppUser;
          }
        }

        // 3. Fetch all students
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const totalStudents = studentsSnapshot.size;
        
        // 4. Fetch quiz results from each student's subcollection
        const allResults: QuizResult[] = [];
        const studentAttempts = new Set<string>(); // Track unique students
        
        for (const studentDoc of studentsSnapshot.docs) {
          const studentId = studentDoc.id;
          const quizResultsQuery = query(
            collection(db, `users/${studentId}/quizResults`),
            where("quizId", "==", id)
          );
          const resultsSnapshot = await getDocs(quizResultsQuery);
          
          if (!resultsSnapshot.empty) {
            studentAttempts.add(studentId);
            resultsSnapshot.forEach(doc => {
              allResults.push({ id: doc.id, ...doc.data() } as QuizResult);
            });
          }
        }

        const totalAttempts = allResults.length;
        const totalStudentsAttempted = studentAttempts.size;
        
        // 5. Calculate average score
        let averageScore = 0;
        if (totalAttempts > 0) {
          const totalScore = allResults.reduce((sum, result) => sum + (result.percentage || 0), 0);
          averageScore = Math.round(totalScore / totalAttempts);
        }

        // 6. Calculate completion rate
        const completionRate = totalStudents > 0 ? Math.round((totalStudentsAttempted / totalStudents) * 100) : 0;

        // 7. Calculate pass rate (70% or higher)
        let passRate = 0;
        if (totalAttempts > 0) {
          const passedAttempts = allResults.filter(result => (result.percentage || 0) >= 70).length;
          passRate = Math.round((passedAttempts / totalAttempts) * 100);
        }

        setAnalytics({
          quiz: { ...quizData, teacher: teacherData },
          results: allResults,
          totalAttempts,
          averageScore,
          totalStudents: totalStudentsAttempted,
          completionRate,
          passRate,
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading analytics...</span>
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
    return (
      <Alert className="max-w-4xl mx-auto">
        <AlertTitle>No Data Found</AlertTitle>
        <AlertDescription>No analytics data available for this quiz.</AlertDescription>
      </Alert>
    );
  }

  // Prepare score distribution data
  const scoreDistribution = analytics.results.reduce((acc, result) => {
    const score = result.percentage || 0;
    if (score >= 90) acc['90-100']++;
    else if (score >= 80) acc['80-89']++;
    else if (score >= 70) acc['70-79']++;
    else if (score >= 60) acc['60-69']++;
    else acc['<60']++;
    return acc;
  }, { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 });

  const scoreData = Object.entries(scoreDistribution)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({ name, count }));

  // Prepare pass/fail data for pie chart
  const passFailData = [
    { name: 'Passed', value: analytics.results.filter(r => (r.percentage || 0) >= 70).length, color: '#10b981' },
    { name: 'Failed', value: analytics.results.filter(r => (r.percentage || 0) < 70).length, color: '#ef4444' }
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                <FileText className="h-8 w-8" /> {analytics.quiz.title}
              </CardTitle>
              <CardDescription className="mt-2">
                {analytics.quiz.description}
              </CardDescription>
              {analytics.quiz.teacher && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-sm">
                    Created by: {analytics.quiz.teacher.displayName}
                  </Badge>
                  {analytics.quiz.topic && (
                    <Badge variant="secondary" className="text-sm">
                      Topic: {analytics.quiz.topic}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={analytics.quiz.isArchived ? "secondary" : "default"}>
                {analytics.quiz.isArchived ? "Archived" : "Active"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalStudents} unique students
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Across all attempts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Of total students attempted
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.passRate}%</div>
            <p className="text-xs text-muted-foreground">
              Score ≥ 70%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Score Distribution
            </CardTitle>
            <CardDescription>
              How students performed on this quiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#666' }}
                    axisLine={{ stroke: '#ddd' }}
                  />
                  <YAxis 
                    tick={{ fill: '#666' }}
                    axisLine={{ stroke: '#ddd' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #ddd',
                      borderRadius: '6px'
                    }}
                    formatter={(value) => [`${value} students`, 'Count']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8884d8" 
                    radius={[4, 4, 0, 0]}
                    name="Number of Students"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p>No score data available yet</p>
                <p className="text-sm">Students need to attempt the quiz first</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Pass/Fail Ratio
            </CardTitle>
            <CardDescription>
              Overall performance outcome
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.results.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} attempts`, 'Count']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #ddd',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <PieChart className="h-12 w-12 mb-3 opacity-50" />
                <p>No pass/fail data available</p>
                <p className="text-sm">Students need to attempt the quiz first</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Attempts
            </CardTitle>
            <CardDescription>
              Latest {Math.min(5, analytics.results.length)} quiz attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.results
                .sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0))
                .slice(0, 5)
                .map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium">Attempt #{index + 1}</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Score: <span className="font-semibold">{result.percentage || 0}%</span></p>
                        <p>Correct: {result.correct || 0}/{result.total || 0}</p>
                        {result.submittedAt && (
                          <p className="text-xs">
                            Submitted: {format(result.submittedAt.toDate(), 'MMM dd, yyyy • h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={result.percentage >= 70 ? "default" : "secondary"}
                      className={result.percentage >= 70 ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
                    >
                      {result.percentage >= 70 ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Passed</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Needs Review</>
                      )}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
