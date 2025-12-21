"use client";

import React, { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Star, CheckCircle, History, BarChart3, Printer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { QuizResult, AppUser } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { mathTopics } from '@/config/topics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const UNLOCK_MASTERY_THRESHOLD = 75;

interface TopicProgress {
  topic: string;
  mastery: number;
  status: string;
  quizzesAttempted: number;
}

export default function SimpleProgressPage() {
  const { user, loading: authIsLoading } = useAuth();
  const [topicsProgress, setTopicsProgress] = useState<TopicProgress[]>([]);
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
        const firestoreProgress = userData.progress || {};

        const formattedProgress = Object.entries(firestoreProgress).map(([topicKey, data]) => {
          const quizzesAttempted = data.quizzesAttempted || 0;
          const mastery = data.mastery || 0;
          const status = quizzesAttempted > 0 
            ? (mastery >= UNLOCK_MASTERY_THRESHOLD ? "Completed" : "In Progress") 
            : "Not Started";
          return {
            topic: topicKey, 
            mastery,
            status,
            quizzesAttempted,
          };
        });
        setTopicsProgress(formattedProgress.sort((a, b) => b.mastery - a.mastery));
      } else {
        setError("User data not found.");
      }
    }, (err) => {
      if (!isMounted) return;
      console.error("Error fetching user data:", err);
      setError(`Failed to load user data: ${err.message}`);
    });

    const quizResultsRef = collection(db, `users/${user.id}/quizResults`);
    const unsubscribeQuizzes = onSnapshot(query(quizResultsRef), (snapshot) => {
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
  

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "bg-green-100 text-green-800";
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const completedQuizzes = quizResults.length;

  const totalPointsEarned = quizResults.reduce((sum, quiz) => {
    const raw = (quiz as any).score ?? (quiz as any).correct ?? 0;
    return sum + raw;
  }, 0);
  const totalPointsPossible = quizResults.reduce((sum, quiz) => {
    const rawTotal = (quiz as any).total ?? 0;
    return sum + rawTotal;
  }, 0);
  const averageScore =
    completedQuizzes > 0 && totalPointsPossible > 0
      ? Math.round((totalPointsEarned / totalPointsPossible) * 100)
      : null;
  
  const topicsProgressWithComputedMastery: TopicProgress[] = topicsProgress.map(tp => {
    const topicResults = quizResults.filter(q => q.topic === tp.topic);
    const quizzesAttempted = topicResults.length || tp.quizzesAttempted || 0;

    // Compute mastery from actual quiz results when available, otherwise fall back to stored mastery
    let mastery = tp.mastery || 0;
    if (topicResults.length > 0) {
      const topicPointsEarned = topicResults.reduce((sum, quiz) => {
        const raw = (quiz as any).score ?? (quiz as any).correct ?? 0;
        return sum + raw;
      }, 0);
      const topicPointsPossible = topicResults.reduce((sum, quiz) => {
        const rawTotal = (quiz as any).total ?? 0;
        return sum + rawTotal;
      }, 0);

      mastery = topicPointsPossible > 0 ? Math.round((topicPointsEarned / topicPointsPossible) * 100) : 0;
    }

    const status =
      quizzesAttempted > 0
        ? mastery >= UNLOCK_MASTERY_THRESHOLD
          ? "Completed"
          : "In Progress"
        : "Not Started";

    return {
      ...tp,
      mastery,
      quizzesAttempted,
      status,
    };
  });

  const masteredTopics = topicsProgressWithComputedMastery.filter(topic => topic.mastery >= 80).length;
  const totalTopics = topicsProgressWithComputedMastery.length;
  const overallCompletion =
    totalTopics > 0
      ? Math.round(
          topicsProgressWithComputedMastery.reduce((sum, topic) => sum + topic.mastery, 0) /
            totalTopics
        )
      : 0;

  const getTopicTitle = (slug: string | undefined) => {
    if (!slug) return "None";
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
  };

  // Helper function to format quiz percentage to 1 decimal place
  const formatQuizPercentage = (percentage: number | undefined): string => {
    if (percentage === undefined || percentage === null) return "0.0%";
    return `${Math.round(percentage * 10) / 10}%`;
  };

  // Helper function to format date with proper encoding
  const formatQuizDate = (submittedAt: any): string => {
    if (!submittedAt) return "Date unavailable";
    try {
      const date = (submittedAt as Timestamp).toDate();
      return format(date, 'MMM dd, yyyy • h:mm a');
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date unavailable";
    }
  };

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
                  {topicsProgressWithComputedMastery.map((topic, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{topic.topic}</span>
                          <Badge variant={topic.status === "Completed" ? "default" : "secondary"} className="w-fit mt-1">{topic.status}</Badge>
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

        {/* Fixed Recent Quizzes Section */}
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
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium capitalize">
                          {getTopicTitle(quiz.topic)}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formattedDate}</span>
                          {quiz.difficulty && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {quiz.difficulty}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={cn(
                            "font-semibold text-base px-3 py-1",
                            getScoreColor(quizPercentage, 100)
                          )}
                        >
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
                      <Link href="/student/quiz-history">
                        View all {quizResults.length} quizzes
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {topicsProgressWithComputedMastery.length > 0 && (
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
