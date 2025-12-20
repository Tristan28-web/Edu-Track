
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, query, orderBy, onSnapshot, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, UserProgressTopic, QuizResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, TrendingUp, CheckCircle, Trophy, Star, Medal, ShieldCheck, TrendingDown, History, ShieldAlert, Award, BarChart2, Printer, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mathTopics } from "@/config/topics";
import { format } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { allAchievementDefinitions, type AchievementDefinition } from "@/config/achievements";
import React from "react";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DisplayStudentProgress extends AppUser {
  overallMastery: number;
  topicsCompleted: number;
  quizzesTaken: number;
  level: { name: string; color: string; icon: React.ReactNode; };
  averageScore: number;
  bestTopic: { title: string; mastery: number } | null;
  worstTopic: { title: string; mastery: number } | null;
  lastActivityDate: Date | null;
  recentQuizResults: QuizResult[];
  recentAchievements: AchievementDefinition[];
  topicsProgress: { topic: string; mastery: number; status: string; }[];
}

const getLevel = (quizCount: number) => {
    if (quizCount >= 10) return { name: "Expert", color: "text-red-500", icon: <Trophy className="h-4 w-4" /> };
    if (quizCount >= 7) return { name: "Advanced", color: "text-orange-500", icon: <Medal className="h-4 w-4" /> };
    if (quizCount >= 4) return { name: "Intermediate", color: "text-yellow-500", icon: <Star className="h-4 w-4" /> };
    return { name: "Beginner", color: "text-green-500", icon: <ShieldCheck className="h-4 w-4" /> };
};

const getScoreColor = (score: number, total: number) => {
  const percentage = (score / total) * 100;
  if (percentage >= 80) return "bg-green-100 text-green-800";
  if (percentage >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

export default function StudentProgressDetailPage() {
  const params = useParams();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const [studentProgress, setStudentProgress] = useState<DisplayStudentProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    const elementToCapture = reportRef.current;
    if (!elementToCapture || !studentProgress) return;
  
    setIsDownloading(true);
  
    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    captureContainer.style.left = '-9999px';
    captureContainer.style.width = '900px'; 
    document.body.appendChild(captureContainer);
    
    const clonedElement = elementToCapture.cloneNode(true) as HTMLDivElement;
    captureContainer.appendChild(clonedElement);
  
    try {
        const canvas = await html2canvas(clonedElement, {
            scale: 2,
            useCORS: true,
            width: 900,
            windowWidth: 900,
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });
  
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0; // Align to top
  
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        pdf.save(`student-progress-report-${studentProgress.username}.pdf`);
  
    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        document.body.removeChild(captureContainer);
        setIsDownloading(false);
    }
  };
  
  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      setError("Student ID not provided.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const studentDocRef = doc(db, "users", studentId);
    
    const unsubscribeStudent = onSnapshot(studentDocRef, async (studentDoc) => {
      try {
        if (!studentDoc.exists() || studentDoc.data().role !== 'student') {
            throw new Error("Student not found.");
        }
        
        const student = { id: studentDoc.id, ...studentDoc.data() } as AppUser;

        const studentProgressData = student.progress as Record<string, UserProgressTopic> | undefined;
        let overallMasteryCalc = 0, topicsCompletedCalc = 0;
        let totalPointsEarned = 0, totalPointsPossible = 0;
        let bestTopic: { title: string; mastery: number } | null = null;
        let worstTopic: { title: string; mastery: number } | null = null;
        let lastActivity: Date | null = null;
        let topicsProgress: { topic: string; mastery: number; status: string; }[] = [];

        if (studentProgressData && Object.keys(studentProgressData).length > 0) {
            const masteries: {slug: string, mastery: number}[] = [];
            Object.entries(studentProgressData).forEach(([slug, p]) => {
                const quizzesAttempted = p.quizzesAttempted || 0;
                const mastery = p.mastery || 0;
                const status = quizzesAttempted > 0 
                  ? (mastery >= 75 ? "Completed" : "In Progress") 
                  : "Not Started";
                topicsProgress.push({
                    topic: mathTopics.find(t => t.slug === slug)?.title || slug,
                    mastery,
                    status,
                });
                if (typeof p.mastery === 'number') masteries.push({slug, mastery: p.mastery});
                if(status === 'Completed') topicsCompletedCalc++;
                if (p.lastActivity) {
                  const activityDate = p.lastActivity.toDate();
                  if (!lastActivity || activityDate > lastActivity) lastActivity = activityDate;
                }
            });
            if (masteries.length > 0) {
              overallMasteryCalc = Math.round(masteries.map(m => m.mastery).reduce((a, b) => a + b, 0) / masteries.length);
              const sortedByMastery = [...masteries].sort((a,b) => b.mastery - a.mastery);
              bestTopic = { title: mathTopics.find(t => t.slug === sortedByMastery[0].slug)?.title || sortedByMastery[0].slug, mastery: sortedByMastery[0].mastery };
              const worst = sortedByMastery[sortedByMastery.length - 1];
              if(worst && worst.mastery < 80) worstTopic = { title: mathTopics.find(t => t.slug === worst.slug)?.title || worst.slug, mastery: worst.mastery };
            }
        }
        
        const quizResultsQuery = query(collection(db, "users", student.id, "quizResults"), orderBy("submittedAt", "desc"), limit(5));
        const quizResultsSnapshot = await getDocs(quizResultsQuery);
        const recentQuizResults = quizResultsSnapshot.docs.map(doc => doc.data() as QuizResult);
        const quizResultsCollectionSnapshot = await getDocs(collection(db, "users", student.id, "quizResults"));
        const quizzesTakenCount = quizResultsCollectionSnapshot.size;
        quizResultsCollectionSnapshot.forEach(doc => {
          const result = doc.data() as QuizResult;
          totalPointsEarned += (result as any).score ?? (result as any).correct ?? 0;
          totalPointsPossible += (result as any).total ?? 0;
        });

        const weightedAverageScore = totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0;

        if (quizResultsCollectionSnapshot.size > 0) {
            const topicAggregates: Record<string, { earned: number; possible: number }> = {};
            quizResultsCollectionSnapshot.forEach(doc => {
              const result = doc.data() as QuizResult;
              if (!result.topic) return;
              if (!topicAggregates[result.topic]) topicAggregates[result.topic] = { earned: 0, possible: 0 };
              topicAggregates[result.topic].earned += (result as any).score ?? (result as any).correct ?? 0;
              topicAggregates[result.topic].possible += (result as any).total ?? 0;
            });

            const aggregatedMasteries = Object.entries(topicAggregates).map(([topicSlug, data]) => ({
              topic: topicSlug,
              mastery: data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
            }));

            if (aggregatedMasteries.length > 0) {
              overallMasteryCalc = Math.round(aggregatedMasteries.reduce((sum, item) => sum + item.mastery, 0) / aggregatedMasteries.length);
              const sortedByMastery = [...aggregatedMasteries].sort((a, b) => b.mastery - a.mastery);
              bestTopic = { title: mathTopics.find(t => t.slug === sortedByMastery[0].topic)?.title || sortedByMastery[0].topic, mastery: sortedByMastery[0].mastery };
              const worst = sortedByMastery[sortedByMastery.length - 1];
              if (worst) worstTopic = { title: mathTopics.find(t => t.slug === worst.topic)?.title || worst.topic, mastery: worst.mastery };
              topicsProgress = aggregatedMasteries.map(item => {
                const quizzesAttempted = studentProgressData?.[item.topic]?.quizzesAttempted || 0;
                const status = quizzesAttempted > 0 || item.mastery > 0
                  ? (item.mastery >= 75 ? "Completed" : "In Progress")
                  : "Not Started";
                return {
                  topic: mathTopics.find(t => t.slug === item.topic)?.title || item.topic,
                  mastery: item.mastery,
                  status,
                };
              });
            }
        }

        const unlockedIds = student.unlockedAchievementIds || [];
        const recentAchievements = allAchievementDefinitions.filter(achDef => unlockedIds.includes(achDef.id)).slice(0, 3);
        
        setStudentProgress({ 
            ...student,
            overallMastery: overallMasteryCalc,
            topicsCompleted: topicsCompletedCalc,
            quizzesTaken: quizzesTakenCount,
            level: getLevel(quizzesTakenCount),
            averageScore: weightedAverageScore,
            bestTopic,
            worstTopic,
            lastActivityDate: lastActivity,
            recentQuizResults,
            recentAchievements,
            topicsProgress,
        });

      } catch(err) {
         console.error("Error processing student data:", err);
         setError("Failed to process student progress data.");
      } finally {
        setIsLoading(false);
      }
    }, (err: any) => {
      console.error("Error listening to student document:", err);
      setError("Failed to load student data in real-time.");
      setIsLoading(false);
    });
    
    return () => unsubscribeStudent();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!studentProgress) {
    return <Alert>No progress data found for this student.</Alert>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg print-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-3xl font-headline text-primary">Progress Report</CardTitle>
            <CardDescription>A detailed look at student performance.</CardDescription>
          </div>
          <div className="flex justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-full sm:w-[150px]">
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Download className="mr-2 h-4 w-4" /><span>Download PDF</span></>}
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      <div ref={reportRef} className="space-y-8">
        <Card className="shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <CardHeader className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                      <CardTitle className="font-headline text-2xl text-primary/90">{studentProgress.displayName || "N/A"}</CardTitle>
                      <CardDescription>Section: {studentProgress.sectionName || "Unassigned"}</CardDescription>
                  </div>
                  <div className={cn("flex items-center gap-2 font-semibold text-sm", studentProgress.level.color)}>
                      {studentProgress.level.icon}
                      {studentProgress.level.name}
                  </div>
              </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6 pt-0 flex-grow">
              <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Overall Mastery</label>
              <div className="flex items-center gap-2">
                  <Progress value={studentProgress.overallMastery} className="h-2.5 flex-1" />
                  <span className="text-lg font-semibold w-12 text-right">{studentProgress.overallMastery}%</span>
              </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <Card className="p-4 rounded-lg bg-secondary/30 flex flex-col items-center justify-center">
                      <h3 className="text-sm font-semibold text-muted-foreground">Average Score</h3>
                      <p className="text-3xl font-bold mt-1 text-primary"><AnimatedCounter value={studentProgress.averageScore} />%</p>
                  </Card>
                  <Card className="p-4 rounded-lg bg-secondary/30 flex flex-col items-center justify-center">
                      <h3 className="text-sm font-semibold text-muted-foreground">Quizzes Taken</h3>
                      <p className="text-3xl font-bold mt-1 text-primary"><AnimatedCounter value={studentProgress.quizzesTaken} /></p>
                  </Card>
                  <Card className="p-4 rounded-lg bg-secondary/30 flex flex-col items-center justify-center">
                      <h3 className="text-sm font-semibold text-muted-foreground">Topics Completed</h3>
                      <p className="text-3xl font-bold mt-1 text-primary"><AnimatedCounter value={studentProgress.topicsCompleted} /></p>
                  </Card>
              </div>
              
              <Separator />

              <div className="grid md:grid-cols-2 gap-6">
              <Card>
                  <CardHeader>
                  <CardTitle>Topic Progress</CardTitle>
                  <CardDescription>Progress across all assigned topics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  {studentProgress.topicsProgress.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                      <p>No topics assigned yet.</p>
                      </div>
                  ) : (
                      studentProgress.topicsProgress.map((topic, index) => (
                      <div key={`${topic.topic}-${index}`} className="space-y-2">
                          <div className="flex justify-between items-center">
                          <span className="font-medium text-sm capitalize">{topic.topic}</span>
                          <div className="flex items-center gap-2">
                              <Badge variant={topic.status === "Completed" ? "default" : "secondary"}>{topic.status}</Badge>
                              <span className="text-sm font-semibold">{topic.mastery}%</span>
                          </div>
                          </div>
                          <Progress value={topic.mastery} className="h-2" />
                      </div>
                      ))
                  )}
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                  <CardTitle>Recent Quizzes</CardTitle>
                  <CardDescription>Latest quiz attempts</CardDescription>
                  </CardHeader>
                  <CardContent>
                  {studentProgress.recentQuizResults.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground"><p>No quiz attempts yet.</p></div>
                  ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                      {studentProgress.recentQuizResults.map((quiz, index) => (
                          <div key={`${quiz.quizId}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                              <p className="font-medium capitalize">{mathTopics.find(t => t.slug === quiz.topic)?.title || quiz.topic}</p>
                              <p className="text-xs text-muted-foreground">{format(quiz.submittedAt.toDate(), 'MMM dd, yyyy â€¢ h:mm a')}</p>
                              {quiz.difficulty && <p className="text-xs text-muted-foreground">Difficulty: {quiz.difficulty}</p>}
                          </div>
                          <Badge className={cn("font-semibold", getScoreColor(quiz.percentage, 100))}>{quiz.percentage}%</Badge>
                          </div>
                      ))}
                      </div>
                  )}
                  </CardContent>
              </Card>
              </div>

              {studentProgress.topicsProgress.length > 0 && (
              <Card>
                  <CardHeader><CardTitle>Progress Summary</CardTitle></CardHeader>
                  <CardContent>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                      <span>Overall Completion</span>
                      <span className="font-semibold">{studentProgress.overallMastery}%</span>
                      </div>
                      <Progress value={studentProgress.overallMastery} className="h-3" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-muted-foreground">Best Topic</p>
                          <p className="font-semibold capitalize">{studentProgress.bestTopic?.title || "None"} ({studentProgress.bestTopic?.mastery ?? 0}%)</p>
                      </div>
                      <div>
                          <p className="text-muted-foreground">Needs Practice</p>
                          <p className="font-semibold capitalize">{studentProgress.worstTopic?.title || "None"} ({studentProgress.worstTopic?.mastery ?? 0}%)</p>
                      </div>
                      </div>
                  </div>
                  </CardContent>
              </Card>
              )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
