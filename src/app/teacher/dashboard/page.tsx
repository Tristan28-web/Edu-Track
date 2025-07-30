
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useAuth } from '@/contexts/AuthContext';
import type { AppUser, TeacherActivity, UserProgressTopic } from '@/types';
import { Users, BookOpenText, ListChecks, Loader2, AlertTriangle, TrendingUp, ShieldAlert, BookOpenCheck, GraduationCap } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { mathTopics } from "@/config/topics";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ClassTopicStats {
  topic: string;
  averageMastery: number;
}

const chartConfig = {
  averageMastery: {
    label: "Avg. Mastery",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function TeacherDashboardPage() {
  const { user } = useAuth();
  
  // State for activities
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  // State for stats and new dashboard sections
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<AppUser[]>([]);
  const [classTopicStats, setClassTopicStats] = useState<ClassTopicStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'teacher') {
      const fetchActivities = async () => {
        setIsLoadingActivities(true);
        setActivitiesError(null);
        try {
          const activitiesRef = collection(db, "teacherActivities");
          const q = query(activitiesRef, where("teacherId", "==", user.id), orderBy("timestamp", "desc"), limit(5));
          const querySnapshot = await getDocs(q);
          setActivities(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherActivity)));
        } catch (err: any) {
          console.error("Error fetching activities:", err);
          setActivitiesError("Failed to load recent activities. Missing Firestore indexes might be the cause.");
        } finally {
          setIsLoadingActivities(false);
        }
      };

      const fetchTeacherStats = async () => {
        setIsLoadingStats(true);
        setStatsError(null);
        try {
          // 1. Fetch all students for the teacher
          const studentsQuery = query(collection(db, "users"), where("teacherId", "==", user.id), where("role", "==", "student"));
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentList: AppUser[] = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
          setTotalStudents(studentList.length);
          
          if (studentList.length === 0) {
              setAtRiskStudents([]);
              setClassTopicStats([]);
              setIsLoadingStats(false);
              return;
          }

          // 2. Identify at-risk students
          const riskThreshold = 40; // Mastery below 40%
          const identifiedAtRisk = studentList.filter(student => {
            const progress = student.progress || {};
            const masteries = Object.values(progress).map(p => p.mastery || 0).filter(m => typeof m === 'number');
            if (masteries.length === 0) return false;
            const overallMastery = masteries.reduce((a, b) => a + b, 0) / masteries.length;
            return overallMastery < riskThreshold;
          });
          setAtRiskStudents(identifiedAtRisk);

          // 3. Calculate class topic performance
          const topicMasteryMap: Record<string, number[]> = {};
          studentList.forEach(student => {
            const progress = student.progress || {};
            Object.entries(progress).forEach(([topicSlug, topicData]) => {
              if (!topicMasteryMap[topicSlug]) {
                topicMasteryMap[topicSlug] = [];
              }
              if (topicData.mastery !== null && typeof topicData.mastery === 'number') {
                topicMasteryMap[topicSlug].push(topicData.mastery);
              }
            });
          });
          
          const calculatedStats = Object.entries(topicMasteryMap).map(([slug, masteries]) => {
            const topicTitle = mathTopics.find(t => t.slug === slug)?.title || slug;
            const average = masteries.length > 0 ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : 0;
            return { topic: topicTitle, averageMastery: average };
          });
          setClassTopicStats(calculatedStats);

        } catch (err: any) {
          console.error("Error fetching stats:", err);
          setStatsError("Failed to load class statistics. This may be due to missing Firestore indexes.");
        } finally {
          setIsLoadingStats(false);
        }
      };

      fetchActivities();
      fetchTeacherStats();
    } else {
      setIsLoadingActivities(false);
      setIsLoadingStats(false);
    }
  }, [user]);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <h1 className="text-3xl font-headline font-semibold text-primary">
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {user?.displayName || 'Teacher'}! This is your command center to manage students, content, and track class progress.
          </p>
        </CardHeader>
      </Card>
      
      { statsError && (
        <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Could not load some statistics</AlertTitle>
            <AlertDescription>{statsError}</AlertDescription>
        </Alert>
      )}

      {/* Main Feature Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Left Column: Quick Stats & At-Risk Students */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Students</h3>
                        <p className="text-2xl font-bold text-primary">{totalStudents ?? '0'}</p>
                    </div>
                     <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                        <h3 className="text-sm font-medium text-muted-foreground">Students At-Risk</h3>
                        <p className="text-2xl font-bold text-destructive">{atRiskStudents.length ?? '0'}</p>
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
                  <CardDescription>Students with overall mastery below 40%.</CardDescription>
              </CardHeader>
              <CardContent>
                  {isLoadingStats ? (
                    <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>
                  ) : atRiskStudents.length > 0 ? (
                      <ul className="space-y-2">
                          {atRiskStudents.map(student => (
                              <li key={student.id} className="text-sm text-foreground/80 border-b pb-2 last:border-0">
                                  {student.displayName || "Unnamed Student"}
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="text-center text-muted-foreground py-4">No students currently flagged as at-risk. Great job!</p>
                  )}
              </CardContent>
          </Card>
        </div>

        {/* Right Column: Class Performance Chart */}
        <div className="lg:col-span-3">
           <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90">Class Topic Performance</CardTitle>
                <CardDescription>Average mastery scores across all topics.</CardDescription>
              </CardHeader>
              <CardContent>
                 {isLoadingStats ? (
                    <div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin"/></div>
                 ) : classTopicStats.length > 0 ? (
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full sm:min-h-[300px]">
                        <BarChart accessibilityLayer data={classTopicStats} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="topic" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 100]} unit="%" />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="averageMastery" fill="var(--color-averageMastery)" radius={4} />
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {/* Navigation Cards */}
        <DashboardCard
          title="Manage Students"
          description="Add, view, and manage student accounts."
          icon={<Users className="h-8 w-8" />}
          linkHref="/teacher/students" 
          linkText="Go to Student Management"
        />
        <DashboardCard
          title="Student Progress Overview"
          description="Monitor individual and class performance in detail."
          icon={<TrendingUp className="h-8 w-8" />}
          linkHref="/teacher/progress-overview" 
          linkText="View Detailed Progress"
        />
        <DashboardCard
          title="Quizzes"
          description="Create, distribute, and track quizzes."
          icon={<BookOpenCheck className="h-8 w-8" />}
          linkHref="/teacher/quizzes" 
          linkText="Manage Quizzes"
        />
        <DashboardCard
          title="Content Library"
          description="Manage reusable lesson materials for your students."
          icon={<ListChecks className="h-8 w-8" />}
          linkHref="/teacher/content"
          linkText="Manage Content"
        />
        <DashboardCard
          title="Submit & Review Grades"
          description="Finalize quarter grades and view student report cards."
          icon={<GraduationCap className="h-8 w-8" />}
          linkHref="/teacher/grades"
          linkText="Finalize Grades"
        />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-primary/90">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin"/></div>
          ) : activitiesError ? (
            <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{activitiesError}</AlertDescription></Alert>
          ) : activities.length > 0 ? (
            <ul className="space-y-3">
              {activities.map((activity) => (
                <li key={activity.id} className="text-sm text-foreground/80 border-b pb-3 last:pb-0 last:border-0">
                  <div className="flex justify-between items-start">
                    <p>
                      {activity.message}
                      {activity.link && <Link href={activity.link} className="text-primary hover:underline ml-1 text-xs font-semibold">(View)</Link>}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 pt-0.5">
                      {activity.timestamp ? formatDistanceToNowStrict(activity.timestamp.toDate(), { addSuffix: true }) : 'N/A'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent activity to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
