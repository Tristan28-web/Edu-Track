
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from '@/contexts/AuthContext';
import { UserCog, Users, GraduationCap, Loader2, AlertTriangle, TrendingUp, Activity, Bookmark, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { AppUser, UserProgressTopic } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { mathTopics } from "@/config/topics";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface SectionStats {
    id: string;
    name: string;
    studentCount: number;
    teacherNames: string[];
    averageMastery: number;
}

interface ClassTopicStats {
  topic: string;
  averageMastery: number;
}

interface PrincipalDashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalSections: number;
  sections: SectionStats[];
  classTopicStats: ClassTopicStats[];
  atRiskSections: SectionStats[];
}

const chartConfig = {
  averageMastery: {
    label: "Avg. Mastery",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function PrincipalDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<PrincipalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'principal') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");
        
        const teachersQuery = query(usersCollectionRef, where("role", "==", "teacher"));
        const studentsQuery = query(usersCollectionRef, where("role", "==", "student"));
        
        const [teachersSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(teachersQuery),
            getDocs(studentsQuery)
        ]);

        const totalTeachers = teachersSnapshot.size;
        const totalStudents = studentsSnapshot.size;
        const allStudents: AppUser[] = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
        
        const teacherMap: Record<string, string> = {};
        teachersSnapshot.docs.forEach(doc => {
            teacherMap[doc.id] = doc.data().displayName || "Unknown Teacher";
        });

        const sectionsMap: Record<string, { students: AppUser[], teacherIds: Set<string> }> = {};

        allStudents.forEach(student => {
            const sectionId = student.sectionId || 'unassigned';
            
            if (!sectionsMap[sectionId]) {
                sectionsMap[sectionId] = { students: [], teacherIds: new Set() };
            }
            sectionsMap[sectionId].students.push(student);
            if (student.teacherId) {
                sectionsMap[sectionId].teacherIds.add(student.teacherId);
            }
        });
        
        const schoolTopicMasteryMap: Record<string, number[]> = {};

        const sectionsData = Object.entries(sectionsMap).map(([id, data]) => {
            const studentCount = data.students.length;
            const teacherNames = Array.from(data.teacherIds).map(tId => teacherMap[tId] || "Unknown Teacher");
            
            let totalMasterySum = 0;
            let masteryDataPoints = 0;

            data.students.forEach(s => {
                const progress = s.progress || {};
                Object.entries(progress).forEach(([topicSlug, topicProgress]) => {
                   if (topicProgress.mastery !== null && typeof topicProgress.mastery === 'number') {
                       totalMasterySum += topicProgress.mastery;
                       masteryDataPoints++;

                       if (!schoolTopicMasteryMap[topicSlug]) {
                           schoolTopicMasteryMap[topicSlug] = [];
                       }
                       schoolTopicMasteryMap[topicSlug].push(topicProgress.mastery);
                   }
                });
            });

            const averageMastery = masteryDataPoints > 0 ? Math.round(totalMasterySum / masteryDataPoints) : 0;
            const sectionName = data.students[0]?.sectionName || 'Unassigned';

            return { id, name: sectionName, studentCount, teacherNames, averageMastery };
        });
        
        const classTopicStats = Object.entries(schoolTopicMasteryMap).map(([slug, masteries]) => ({
            topic: mathTopics.find(t => t.slug === slug)?.title || slug,
            averageMastery: masteries.length > 0 ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : 0,
        }));
        
        const atRiskSections = sectionsData.filter(s => s.averageMastery < 75 && s.studentCount > 0);

        setDashboardData({
          totalStudents,
          totalTeachers,
          totalSections: Object.keys(sectionsMap).length,
          sections: sectionsData.sort((a,b) => a.name.localeCompare(b.name)),
          classTopicStats,
          atRiskSections,
        });

      } catch (err: any) {
        console.error("Error fetching principal dashboard data:", err);
        setError("Failed to load dashboard data. Please check your connection and permissions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-headline font-semibold text-primary">
          Principal Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user?.displayName || 'Principal'}! This is your high-level overview of the Edu-Track platform.
        </p>
      </div>

      {error && (
         <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-headline text-primary/90">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Students</h3>
                        <p className="text-2xl font-bold text-primary">{dashboardData?.totalStudents !== undefined ? <AnimatedCounter value={dashboardData.totalStudents} /> : '...'}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Teachers</h3>
                        <p className="text-2xl font-bold text-primary">{dashboardData?.totalTeachers !== undefined ? <AnimatedCounter value={dashboardData.totalTeachers} /> : '...'}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Sections</h3>
                        <p className="text-2xl font-bold text-primary">{dashboardData?.totalSections !== undefined ? <AnimatedCounter value={dashboardData.totalSections} /> : '...'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-destructive"/> Sections to Watch
                    </CardTitle>
                    <CardDescription>Sections with an average mastery below 75%.</CardDescription>
                </CardHeader>
                <CardContent>
                    {dashboardData?.atRiskSections && dashboardData.atRiskSections.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Section Name</TableHead>
                                    <TableHead className="text-right">Avg. Mastery</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dashboardData.atRiskSections.map(section => (
                                    <TableRow key={section.id}>
                                        <TableCell>{section.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="destructive">{section.averageMastery}%</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No sections currently flagged as at-risk. Great job!</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-3">
             <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90">School-Wide Topic Performance</CardTitle>
                <CardDescription>Average mastery scores across all topics and sections.</CardDescription>
              </CardHeader>
              <CardContent>
                 {dashboardData?.classTopicStats && dashboardData.classTopicStats.length > 0 ? (
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full sm:min-h-[300px]">
                        <BarChart accessibilityLayer data={dashboardData.classTopicStats} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="topic" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 100]} unit="%" />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="averageMastery" fill="var(--color-averageMastery)" radius={8} />
                        </BarChart>
                    </ChartContainer>
                 ) : (
                    <div className="flex items-center justify-center h-[300px]">
                        <p className="text-center text-muted-foreground">No student progress data available to generate chart.</p>
                    </div>
                 )}
              </CardContent>
            </Card>
        </div>
      </div>

       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
              title="Progress Overview"
              description="View school-wide academic performance in detail."
              icon={<TrendingUp className="h-8 w-8" />}
              linkHref="/principal/progress-overview"
              linkText="View Detailed Progress"
          />
          <DashboardCard
              title="Teacher & Student Activity"
              description="Monitor platform engagement and content creation."
              icon={<Activity className="h-8 w-8" />}
              linkHref="/principal/activity-monitoring"
              linkText="View Activity"
          />
          <DashboardCard
              title="Manage Teachers"
              description="Add, view, and manage teacher accounts."
              icon={<UserCog className="h-8 w-8" />}
              linkHref="/principal/teachers"
              linkText="Go to Teacher Management"
          />
          <DashboardCard
              title="View Students"
              description="View a roster of all students."
              icon={<Users className="h-8 w-8" />}
              linkHref="/principal/students"
              linkText="View Students"
          />
      </div>

    </div>
  );
}
