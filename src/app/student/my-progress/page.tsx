
"use client";

import React, { useEffect, useState, useRef } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Award, ExternalLink, FileDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { allAchievementDefinitions, type AchievementDefinition } from '@/config/achievements.tsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface TopicProgressData {
  topic: string;
  mastery: number;
  status: string;
  lastActivity: string;
}

const chartConfig = {
  mastery: {
    label: "Mastery (%)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function MyProgressPage() {
  const { user, loading: authIsLoading } = useAuth();
  const [progressData, setProgressData] = useState<TopicProgressData[]>([]);
  const [overallMastery, setOverallMastery] = useState<number>(0);
  const [unlockedAchievementCount, setUnlockedAchievementCount] = useState<number>(0);
  const [recentAchievements, setRecentAchievements] = useState<AchievementDefinition[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const progressReportRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    let isMounted = true;
    setPageIsLoading(true);

    if (authIsLoading) {
      return;
    }

    if (!user) {
      if (isMounted) {
        setError("Please log in to view your progress.");
        setProgressData([]);
        setUnlockedAchievementCount(0);
        setRecentAchievements([]);
        setPageIsLoading(false);
      }
      return;
    }

    const fetchData = async () => {
      if (isMounted) setError(null);

      try {
        const userDocRef = doc(db, "users", user.id);
        const userDocSnap = await getDoc(userDocRef);

        if (!isMounted) return;

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const firestoreProgress = userData.progress as Record<string, { mastery: number, status: string, lastActivity: Timestamp | string }> | undefined;

          if (firestoreProgress) {
            const topicProgress = Object.entries(firestoreProgress);
            
            const localFormattedProgress = topicProgress.map(([topicKey, data]) => {
              let lastActivityStr = "N/A";
              if (data.lastActivity) {
                  if (typeof data.lastActivity === 'string') {
                      lastActivityStr = data.lastActivity;
                  } else if (data.lastActivity && typeof (data.lastActivity as Timestamp).toDate === 'function') {
                      lastActivityStr = (data.lastActivity as Timestamp).toDate().toLocaleDateString();
                  }
              }
              const formattedTopicName = topicKey
                                          .split('-')
                                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                          .join(' ');
              return {
                topic: formattedTopicName,
                mastery: data.mastery || 0,
                status: data.status || "Not Started",
                lastActivity: lastActivityStr,
              };
            });
            
            if (isMounted) setProgressData(localFormattedProgress);

            const masteries = Object.values(firestoreProgress)
                .map(p => p.mastery || 0)
                .filter(m => typeof m === 'number');

            if (masteries.length > 0) {
              const averageMastery = Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length);
              if (isMounted) setOverallMastery(averageMastery);
            }
          }
          
          const unlockedIds = userData.unlockedAchievementIds as string[] || [];
          if (isMounted) {
            setUnlockedAchievementCount(unlockedIds.length);
            setRecentAchievements(
              allAchievementDefinitions
                .filter(achDef => unlockedIds.includes(achDef.id))
                .slice(0, 3) 
            );
          }

        } else {
          if (isMounted) {
            setError("User data not found. Start using the app to see your progress here!");
            setProgressData([]);
            setUnlockedAchievementCount(0);
            setRecentAchievements([]);
          }
        }
      } catch (e: any) {
        if (isMounted) {
          console.error("Error fetching student data:", e);
          setError(`Failed to load student data: ${e.message}`);
          setProgressData([]);
          setUnlockedAchievementCount(0);
          setRecentAchievements([]);
        }
      } finally {
        if (isMounted) {
          setPageIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user, authIsLoading]);

  const handleExport = async () => {
    if (!progressReportRef.current) {
        toast({
            title: "Export Error",
            description: "Could not find the content to export.",
            variant: "destructive",
        });
        return;
    }

    setIsExporting(true);
    toast({ title: "Exporting...", description: "Your progress report is being generated." });

    try {
        const canvas = await html2canvas(progressReportRef.current, {
            scale: 2, // Increase scale for better resolution
            useCORS: true,
            onclone: (document) => {
              // Hide the export button in the cloned document so it's not in the PDF
              const exportButton = document.getElementById('export-pdf-button');
              if (exportButton) {
                exportButton.style.display = 'none';
              }
            }
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;

        let imgWidth = pdfWidth - 40; // with some margin
        let imgHeight = imgWidth / ratio;
        
        if (imgHeight > pdfHeight - 40) {
            imgHeight = pdfHeight - 40;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = 20;
        
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save('Edu-Track_Progress_Report.pdf');

    } catch (error) {
        console.error("Error exporting to PDF:", error);
        toast({
            title: "Export Failed",
            description: "An unexpected error occurred while generating the PDF.",
            variant: "destructive",
        });
    } finally {
        setIsExporting(false);
    }
  };


  if (pageIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading progress data...</p>
      </div>
    );
  }

  if (error && !progressData.length && unlockedAchievementCount === 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!user && !authIsLoading) {
     return (
      <Alert variant="default">
        <AlertTitle>Not Logged In</AlertTitle>
        <AlertDescription>Please log in to view your progress and achievements.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8" ref={progressReportRef}>
      {error && (progressData.length > 0 || unlockedAchievementCount > 0) && (
         <Alert variant="destructive" className="mb-4">
           <AlertTitle>Notice</AlertTitle>
           <AlertDescription>{error} Some data might be incomplete.</AlertDescription>
         </Alert>
      )}
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary">Your Progress</CardTitle>
            <CardDescription>See how you&apos;re doing in Grade 10 Math and review your achievements.</CardDescription>
          </div>
           <Button 
              id="export-pdf-button"
              onClick={handleExport} 
              disabled={isExporting || pageIsLoading || progressData.length === 0} 
              className="mt-4 sm:mt-0"
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Export as PDF
            </Button>
        </CardHeader>
        {progressData.length > 0 && (
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground/90 mb-2">Overall Curriculum Mastery</h2>
              <div className="flex items-center gap-4">
                <Progress value={overallMastery} className="w-full h-4" />
                <span className="font-bold text-primary text-lg">{overallMastery}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">This is your average mastery across all topics.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {progressData.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90">Topic Mastery Overview</CardTitle>
            <CardDescription>Your mastery level for each Grade 10 Math topic.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full sm:min-h-[300px] md:min-h-[350px]">
              <BarChart 
                accessibilityLayer 
                data={progressData.map(p => ({ topic: p.topic, mastery: p.mastery }))} 
                margin={{ top: 5, right: 5, left: -25, bottom: progressData.length > 4 ? 70 : 20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="topic" 
                  tickLine={false} 
                  tickMargin={10} 
                  angle={progressData.length > 4 ? -45 : 0} 
                  textAnchor={progressData.length > 4 ? "end" : "middle"}
                  interval={0} 
                  height={progressData.length > 4 ? 80 : 30}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="mastery" fill="var(--color-mastery)" radius={4} barSize={30} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {progressData.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {progressData.map((item) => (
            <Card key={item.topic} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90">{item.topic}</CardTitle>
                <Badge
                  variant={item.mastery > 75 ? "default" : item.mastery > 50 ? "secondary" : "destructive"}
                  className="absolute top-4 right-4"
                >
                  {item.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mastery Level:</span>
                  <span className="font-semibold text-foreground">{item.mastery}%</span>
                </div>
                <Progress value={item.mastery} className="h-2.5" />
                <p className="text-xs text-muted-foreground">Last activity: {item.lastActivity}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !pageIsLoading && !error && (
          <Card className="shadow-md">
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[250px] bg-secondary/20 rounded-lg">
              <Activity className="h-16 w-16 text-primary/60" />
              <h3 className="text-2xl font-headline text-primary/90">Ready to Track Your Journey?</h3>
              <p className="text-muted-foreground max-w-md">
                It looks like you haven&apos;t dived into any topics yet.
                Complete lessons and quizzes to see your progress beautifully displayed here!
              </p>
              <Button asChild size="lg" className="font-semibold">
                <Link href="/student/lessons">Explore Lessons</Link>
              </Button>
            </CardContent>
          </Card>
        )
      )}

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-headline text-primary flex items-center gap-2">
              <Award className="h-6 w-6" /> Recent Achievements
            </CardTitle>
            <CardDescription>{unlockedAchievementCount} unlocked so far. Keep it up!</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/student/achievements">
              View All Achievements <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAchievements.length > 0 ? (
            <div className="space-y-3">
              {recentAchievements.map(ach => (
                <div key={ach.id} className="p-3 rounded-md border bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 flex items-center gap-3">
                  {React.cloneElement(ach.icon as React.ReactElement, { className: "h-6 w-6" })}
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-300">{ach.name}</h4>
                    <p className="text-xs text-green-600 dark:text-green-400">{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             !error && <p className="text-muted-foreground text-center pt-4">No achievements unlocked yet. Start learning to earn your first badge!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
