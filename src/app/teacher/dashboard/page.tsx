
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useAuth } from '@/contexts/AuthContext';
import type { AppUser, QuizResult } from '@/types';
import { Users, Loader2, AlertTriangle, TrendingUp, BookOpenCheck, Bookmark, PieChart, CheckCircle, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PerformanceStats {
    averageScore: number;
    passingCount: number;
    strugglingCount: number;
    atRiskCount: number;
}

const chartConfig = {
    students: {
        label: "Students",
    },
    passing: {
        label: "Passing",
        color: "hsl(var(--chart-2))",
    },
    struggling: {
        label: "Struggling",
        color: "hsl(var(--chart-4))",
    },
    atRisk: {
        label: "At Risk",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;


export default function TeacherDashboardPage() {
  const { user } = useAuth();
  
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<{ id: string; name: string; average: number }[]>([]);

  useEffect(() => {
    if (user && user.role === 'teacher') {
        const fetchDashboardData = async () => {
          setIsLoading(true);
          setError(null);
          try {
            // 1. Fetch all students for the teacher
            const studentsQuery = query(collection(db, "users"), where("teacherId", "==", user.id), where("role", "==", "student"));
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentList: AppUser[] = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
            setTotalStudents(studentList.length);

            if (studentList.length === 0) {
              setPerformanceStats({ averageScore: 0, passingCount: 0, strugglingCount: 0, atRiskCount: 0 });
              setIsLoading(false);
              return;
            }

            // 2. Fetch all quiz results for those students and calculate averages
            const studentAverages: { studentId: string, average: number }[] = [];
            
            const atRisk: { id: string; name: string; average: number }[] = [];
            for (const student of studentList) {
                const resultsQuery = query(collection(db, `users/${student.id}/quizResults`));
                const resultsSnapshot = await getDocs(resultsQuery);
                
                if (resultsSnapshot.empty) {
                    continue; 
                }

                let studentTotalScore = 0;
                resultsSnapshot.forEach(doc => {
                    const result = doc.data() as QuizResult;
                    studentTotalScore += result.percentage;
                });
                
                const studentAverage = studentTotalScore / resultsSnapshot.size;
                studentAverages.push({ studentId: student.id, average: studentAverage });

                if (studentAverage < 40) {
                  atRisk.push({ id: student.id, name: student.displayName || 'Unnamed Student', average: Math.round(studentAverage) });
                }
            }

            // 3. Calculate stats only on students who have taken quizzes
            const overallAverage = studentAverages.length > 0
              ? Math.round(studentAverages.reduce((sum, s) => sum + s.average, 0) / studentAverages.length)
              : 0;
              
            let passingCount = 0;
            let strugglingCount = 0;
            let atRiskCount = 0;

            studentAverages.forEach(({ average }) => {
                if (average >= 75) passingCount++;
                else if (average >= 40) strugglingCount++;
                else atRiskCount++;
            });
            
            setPerformanceStats({
                averageScore: overallAverage,
                passingCount,
                strugglingCount,
                atRiskCount,
            });
            setAtRiskStudents(atRisk);

          } catch (err: any) {
            console.error("Error fetching stats:", err);
            setError("Failed to load class statistics.");
          } finally {
            setIsLoading(false);
          }
        };

        fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const chartData = useMemo(() => {
    if (!performanceStats) return [];
    return [
      {
        status: "passing",
        students: performanceStats.passingCount,
        fill: "var(--color-passing)",
      },
      {
        status: "struggling",
        students: performanceStats.strugglingCount,
        fill: "var(--color-struggling)",
      },
      {
        status: "atRisk",
        students: performanceStats.atRiskCount,
        fill: "var(--color-atRisk)",
      },
    ];
  }, [performanceStats]);

  return (
    <div className="space-y-8">
      <Card className="shadow-sm">
        <CardHeader>
          <h1 className="text-3xl font-headline font-semibold text-primary">
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {user?.displayName || 'Teacher'}! This is your command center.
          </p>
        </CardHeader>
      </Card>
      
      { error && (
        <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Could not load statistics</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Students</h3>
                        <p className="text-2xl font-bold text-primary">{totalStudents !== null ? <AnimatedCounter value={totalStudents} /> : '0'}</p>
                    </div>
                     <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Class Average</h3>
                        <p className="text-2xl font-bold text-primary">{performanceStats?.averageScore !== null ? <AnimatedCounter value={performanceStats?.averageScore || 0} /> : '0'}%</p>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-destructive"/> Students to Watch
                </CardTitle>
                <CardDescription>Students with an average score below 40%.</CardDescription>
            </CardHeader>
            <CardContent>
                {atRiskStudents && atRiskStudents.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead className="text-right">Avg</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {atRiskStudents.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="destructive">{s.average}%</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-muted-foreground py-4">No students currently flagged as at-risk. Great job!</p>
                )}
            </CardContent>
          </Card>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl font-headline font-semibold text-primary">Student Performance Summary</CardTitle>
            <CardDescription>A quick snapshot of overall class performance based on quiz scores.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : error ? (
              <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            ) : performanceStats && (
              <>
                 <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Passing (75%+)</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{performanceStats.passingCount}</p>
                    </div>
                     <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Struggling (40-74%)</p>
                        <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{performanceStats.strugglingCount}</p>
                    </div>
                     <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">At Risk (&lt;40%)</p>
                        <p className="text-2xl font-bold text-red-800 dark:text-red-200">{performanceStats.atRiskCount}</p>
                    </div>
                 </div>
                 <ChartContainer config={chartConfig} className="w-full h-40">
                    <ResponsiveContainer>
                        <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="status"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                width={80}
                                tickFormatter={(value) =>
                                    chartConfig[value as keyof typeof chartConfig]
                                        ?.label || ""
                                }
                                className="text-xs"
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" hideLabel />} />
                            <Bar dataKey="students" radius={5}>
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Manage Students"
          description="Add, view, and manage student accounts."
          icon={<Users className="h-8 w-8" />}
          linkHref="/teacher/students" 
          linkText="Go to Student Management"
        />
        <DashboardCard
          title="Progress Overview"
          description="Monitor individual and class performance in detail."
          icon={<TrendingUp className="h-8 w-8" />}
          linkHref="/teacher/progress-overview" 
          linkText="View Detailed Progress"
        />
        <DashboardCard
          title="Section Management"
          description="Organize your students into class sections."
          icon={<Bookmark className="h-8 w-8" />}
          linkHref="/teacher/sections"
          linkText="Manage Sections"
        />
        <DashboardCard
          title="Manage Quizzes"
          description="Create and manage quizzes for your students."
          icon={<BookOpenCheck className="h-8 w-8" />}
          linkHref="/teacher/quizzes"
          linkText="Manage Quizzes"
        />
      </div>
    </div>
  );
}

