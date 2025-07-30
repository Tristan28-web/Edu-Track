
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, UserProgressTopic } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, TrendingUp, CheckCircle, PieChart, BarChart3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface DisplayStudentProgress extends AppUser {
  overallMastery: number;
  topicsCompleted: number;
}

const chartConfig = {
  mastery: {
    label: "Mastery (%)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function PrincipalProgressOverviewPage() {
  const [studentsProgress, setStudentsProgress] = useState<DisplayStudentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!authUser || authUser.role !== 'principal') {
        setIsLoading(false);
        if (authUser) setError("Accessing this page requires a principal login.");
        return;
    }
    
    const fetchStudentsProgress = async () => {
        setIsLoading(true);
        setError(null);
        try {
        const studentsCollectionRef = collection(db, "users");
        const q = query(
            studentsCollectionRef,
            where("role", "==", "student"),
            orderBy("displayName", "asc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedStudents: DisplayStudentProgress[] = [];
        querySnapshot.forEach((docInstance) => {
            const data = docInstance.data();
            
            const studentProgressData = data.progress as Record<string, UserProgressTopic> | undefined;
            let overallMasteryCalc = 0;
            let topicsCompletedCalc = 0;

            if (studentProgressData && Object.keys(studentProgressData).length > 0) {
            const masteries = Object.values(studentProgressData)
                .map(p => p.mastery || 0)
                .filter(m => typeof m === 'number');
            if (masteries.length > 0) {
                overallMasteryCalc = Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length);
            }
            topicsCompletedCalc = Object.values(studentProgressData).filter(p => p.status === 'Completed').length;
            }
            
            fetchedStudents.push({ 
            id: docInstance.id, 
            ...data,
            overallMastery: overallMasteryCalc,
            topicsCompleted: topicsCompletedCalc,
            } as DisplayStudentProgress);
        });
        setStudentsProgress(fetchedStudents);
        } catch (err: any) {
        console.error("Error fetching students' progress:", err);
        let detailedError = "Failed to load students' progress. Please try again.";
        if (err.code === 'failed-precondition') {
            detailedError += " This might be due to missing Firestore indexes.";
        } else {
            detailedError += ` Error: ${err.message}`;
        }
        setError(detailedError);
        toast({ title: "Error Loading Progress", description: detailedError, variant: "destructive", duration: 10000 });
        } finally {
        setIsLoading(false);
        }
    };

    fetchStudentsProgress();
  }, [authUser]);

  const chartData = studentsProgress.map(s => ({ 
    name: s.displayName || s.id.substring(0, 8),
    mastery: s.overallMastery 
  }));

  const hasMeaningfulChartData = studentsProgress.length > 0 && chartData.some(student => student.mastery > 0);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <TrendingUp className="h-8 w-8" /> School-Wide Progress Overview
          </CardTitle>
          <CardDescription>
            Track overall school performance and individual student mastery across all classes.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading progress data...</p>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isLoading && !error && authUser && (
        <>
          {studentsProgress.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                    <PieChart className="h-6 w-6" /> Overall Mastery Distribution
                  </CardTitle>
                  <CardDescription>Overall mastery levels of all students in the school.</CardDescription>
                </CardHeader>
                <CardContent>
                  {hasMeaningfulChartData ? (
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full sm:min-h-[300px] md:min-h-[350px] aspect-auto">
                      <BarChart 
                        accessibilityLayer 
                        data={chartData} 
                        margin={{ top: 5, right: 10, left: -20, bottom: chartData.length > 5 ? 60 : 20 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tickLine={false} 
                          tickMargin={10} 
                          angle={chartData.length > 7 ? -40 : 0} 
                          textAnchor={chartData.length > 7 ? "end" : "middle"}
                          interval={0} 
                          height={chartData.length > 7 ? 70 : 30}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                        <ChartTooltip 
                          cursor={{fill: 'hsl(var(--muted))', radius: 4}}
                          content={<ChartTooltipContent indicator="dot" hideLabel />} 
                        />
                        <Bar dataKey="mastery" fill="var(--color-mastery)" radius={4} barSize={Math.max(15, 60 / chartData.length)} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="text-center text-muted-foreground py-8 space-y-2">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-primary/50" />
                      <p className="font-semibold text-lg">No Chartable Progress Yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Individual Student Progress</CardTitle>
                  <CardDescription>Detailed progress for each student.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="w-[200px]">Overall Mastery</TableHead>
                        <TableHead className="w-[150px] text-center">Topics Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsProgress.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.displayName || "N/A"}</TableCell>
                          <TableCell className="hidden sm:table-cell">{student.email || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={student.overallMastery} className="h-2.5 flex-1" aria-label={`Mastery ${student.overallMastery}%`} />
                              <span className="text-xs font-semibold w-10 text-right">{student.overallMastery}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-semibold">{student.topicsCompleted}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                No students found in the system.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
