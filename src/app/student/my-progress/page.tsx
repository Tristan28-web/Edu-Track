"use client";

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Star, CheckCircle, History, BarChart3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { mathTopics } from '@/config/topics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { QuizResult, AppUser } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const UNLOCK_MASTERY_THRESHOLD = 75;

// ======= NEW: Unified weighted progress calculation =======
const calculateStudentProgress = (student: AppUser): number => {
  const progress = student.progress || {};

  const topicMasteries: number[] = [];

  Object.values(progress).forEach((data) => {
    const topic = data as {
      totalItems?: number;
      correctItems?: number;
      quizzesAttempted?: number;
    };

    if (!topic.quizzesAttempted || topic.quizzesAttempted === 0) return;

    const totalItems = topic.totalItems || 0;
    const correctItems = topic.correctItems || 0;
    if (totalItems === 0) return;

    const mastery = (correctItems / totalItems) * 100;
    topicMasteries.push(mastery);
  });

  if (topicMasteries.length === 0) return 0;

  const total = topicMasteries.reduce((sum, m) => sum + m, 0);
  return Math.round(total / topicMasteries.length);
};

export default function SimpleProgressPage() {
  const { user, loading: authIsLoading } = useAuth();
  const [topicsProgress, setTopicsProgress] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authIsLoading || !user) {
      if (!authIsLoading) setPageIsLoading(false);
      return;
    }

    let isMounted = true;

    const userDocRef = doc(db, "users", user.id);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (!isMounted) return;
      if (docSnap.exists()) {
        const userData = docSnap.data() as AppUser;
        setTopicsProgress(userData.progress ? Object.entries(userData.progress).map(([topicKey, data]) => {
          const topicData = data as any;
          return {
            topic: topicKey,
            mastery: topicData.mastery || 0,
            quizzesAttempted: topicData.quizzesAttempted || 0,
            totalItems: topicData.totalItems || 0,
            correctItems: topicData.correctItems || 0,
          };
        }) : []);
      } else {
        setError("User data not found.");
      }
    }, (err) => {
      if (!isMounted) return;
      console.error("Error fetching user data:", err);
      setError(`Failed to load user data: ${err.message}`);
    });

    const quizResultsRef = collection(db, `users/${user.id}/quizResults`);
    const unsubscribeQuizzes = onSnapshot(quizResultsRef, (snapshot) => {
      if (!isMounted) return;
      const results = snapshot.docs.map(doc => doc.data() as QuizResult);
      setQuizResults(results.sort((a, b) => (b.submittedAt as Timestamp).toMillis() - (a.submittedAt as Timestamp).toMillis()));
      if (pageIsLoading) setPageIsLoading(false);
    }, (err) => {
      if (!isMounted) return;
      console.error("Error fetching quiz results:", err);
      setError(`Failed to load quiz results: ${err.message}`);
      setPageIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeUser();
      unsubscribeQuizzes();
    };
  }, [user, authIsLoading, pageIsLoading]);

  if (pageIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your progress...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!user && !authIsLoading) {
    return <Alert variant="default"><AlertTitle>Not Logged In</AlertTitle><AlertDescription>Please log in to view your progress.</AlertDescription></Alert>;
  }

  // ===== Compute overall progress using unified function =====
  const overallCompletion = calculateStudentProgress({ progress: topicsProgress } as AppUser);

  const masteredTopics = topicsProgress.filter(tp => tp.mastery >= UNLOCK_MASTERY_THRESHOLD).length;
  const totalTopics = topicsProgress.length;

  const getTopicTitle = (slug: string | undefined) => {
    if (!slug) return "None";
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
  };

  const formatQuizPercentage = (percentage: number | undefined): string => {
    if (percentage === undefined || percentage === null) return "0.0%";
    return `${Math.round(percentage * 10) / 10}%`;
  };

  const formatQuizDate = (submittedAt: any): string => {
    if (!submittedAt) return "Date unavailable";
    try {
      const date = (submittedAt as Timestamp).toDate();
      return format(date, 'MMM dd, yyyy • h:mm a');
    } catch {
      return "Date unavailable";
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "bg-green-100 text-green-800";
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const completedQuizzes = quizResults.length;
  const totalPointsEarned = quizResults.reduce((sum, quiz) => sum + ((quiz as any).score ?? (quiz as any).correct ?? 0), 0);
  const totalPointsPossible = quizResults.reduce((sum, quiz) => sum + ((quiz as any).total ?? 0), 0);
  const averageScore = completedQuizzes > 0 && totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : null;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <BarChart3 className="h-8 w-8" /> Your Progress
            </CardTitle>
            <CardDescription>
              A summary of your performance across all topics.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{completedQuizzes}</p>
            <p className="text-sm text-muted-foreground">Quizzes Taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{averageScore !== null ? `${averageScore}%` : 'N/A'}</p>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{masteredTopics}</p>
            <p className="text-sm text-muted-foreground">Topics Mastered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <History className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalTopics}</p>
            <p className="text-sm text-muted-foreground">Total Topics</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Topic Progress</CardTitle>
            <CardDescription>Your mastery level for each topic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicsProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No topics started yet.</p>
                <p className="text-sm">Your teacher will assign topics to you.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="text-right">Mastery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicsProgress.map((topic, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{getTopicTitle(topic.topic)}</span>
                          <Badge variant={topic.mastery >= UNLOCK_MASTERY_THRESHOLD ? "default" : "secondary"} className="w-fit mt-1">
                            {topic.mastery >= UNLOCK_MASTERY_THRESHOLD ? "Completed" : topic.quizzesAttempted > 0 ? "In Progress" : "Not Started"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{topic.mastery}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
            <CardDescription>Your most recent quiz attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {quizResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No quiz attempts yet.</p>
                <Button asChild className="mt-4">
                  <Link href="/student/quizzes">Take your first quiz!</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {quizResults.slice(0, 5).map((quiz, index) => {
                  const quizPercentage = quiz.percentage || 0;
                  const formattedPercentage = formatQuizPercentage(quizPercentage);
                  const formattedDate = formatQuizDate(quiz.submittedAt);
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium capitalize">{getTopicTitle(quiz.topic)}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formattedDate}</span>
                          {quiz.difficulty && <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">{quiz.difficulty}</Badge>
                          </>}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn("font-semibold text-base px-3 py-1", getScoreColor(quizPercentage, 100))}>
                          {formattedPercentage}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Score: {(quiz as any).score ?? (quiz as any).correct ?? 0}/{(quiz as any).total ?? 0}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {quizResults.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/student/quiz-history">View all {quizResults.length} quizzes</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {topicsProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Overall Completion</span>
                <span className="font-semibold">{overallCompletion}%</span>
              </div>
              <Progress value={overallCompletion} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
