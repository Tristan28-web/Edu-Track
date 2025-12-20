"use client";

import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Target, Zap, List, Award, BookOpenCheck, ListChecks, Loader2, AlertTriangle, Info, CheckCircle, Lightbulb, ExternalLink, GraduationCap, MessageSquare } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { CourseContentItem, AppUser, LessonMaterialDetails, QuizResult } from '@/types';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { mathTopics } from '@/config/topics';
import { formatDistanceToNowStrict } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  
  // Raw data from Firestore listeners
  const [currentUserData, setCurrentUserData] = useState<AppUser | null>(null);
  const [todoItems, setTodoItems] = useState<CourseContentItem[]>([]);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up listeners for real-time data
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // 1. Listen to user document for real-time progress
    const userDocRef = doc(db, "users", user.id);
    unsubscribes.push(onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData({ id: docSnap.id, ...docSnap.data() } as AppUser);
      }
      if (isLoading) setIsLoading(false); // Initial load done
    }, (err) => {
      console.error("Error listening to user data:", err);
      setError("Failed to load user profile in real-time.");
      setIsLoading(false);
    }));

    // 2. Listen to both teacher's quizzes and student's results to compute to-do list
    if (user.teacherId) {
        // Listen to all quizzes from the teacher
        const quizzesQuery = query(
            collection(db, "courseContent"),
            where("teacherId", "==", user.teacherId),
            where("contentType", "==", "quiz"),
            orderBy("createdAt", "desc")
        );

        unsubscribes.push(onSnapshot(quizzesQuery, (quizzesSnapshot) => {
            const allQuizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));

            // Now, within this listener, also listen to results to have the most up-to-date info
            const resultsQuery = query(collection(db, `users/${user.id}/quizResults`));
            const unsubscribeResults = onSnapshot(resultsQuery, (resultsSnapshot) => {
                const completedIds = new Set<string>();
                resultsSnapshot.forEach(doc => {
                    const result = doc.data() as QuizResult;
                    if (result.quizId) {
                        completedIds.add(result.quizId);
                    }
                });

                // Compute the to-do items here, where we have the latest of both lists
                const newTodoItems = allQuizzes
                    .filter(quiz => !completedIds.has(quiz.id)) // Filter out completed
                    .filter(quiz => !quiz.isArchived); // Filter out archived

                setTodoItems(newTodoItems);
                if (isLoading) setIsLoading(false);
            }, (err) => {
                console.error("Error listening to quiz results:", err);
                setError("Failed to load your quiz history.");
                setIsLoading(false);
            });
            
            unsubscribes.push(unsubscribeResults); // Add results listener to the main unsub array

        }, (err) => {
            console.error("Error listening to quizzes:", err);
            setError("Failed to load quizzes. A database index may be required.");
            setIsLoading(false);
        }));
    } else {
        setIsLoading(false); // No teacher, so no quizzes to load
    }
    
    // Cleanup function to unsubscribe from all listeners on component unmount
    return () => unsubscribes.forEach(unsub => unsub());

  }, [user]);


  const getTopicTitle = (slug: string | undefined) => {
    if (!slug) return "Unknown Topic";
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
  };
  
  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-headline font-semibold text-primary">
          Student Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.displayName || 'Student'}! Here's what's new for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <Card className="shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                <ListChecks className="h-6 w-6" />
                To-Do List
              </CardTitle>
              <CardDescription>
                New quizzes from your teacher that you need to complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading your to-do items...</p>
                </div>
              )}
              {!isLoading && error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!isLoading && !error && todoItems.length === 0 && (
                <div className="text-center text-muted-foreground py-8 bg-secondary/20 rounded-lg">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3"/>
                    <h3 className="text-lg font-semibold text-foreground">You're All Caught Up!</h3>
                    <p className="text-sm">There are no new quizzes for you to take.</p>
                </div>
              )}
              {!isLoading && !error && todoItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz</TableHead>
                      <TableHead className="hidden md:table-cell">Topic</TableHead>
                      <TableHead className="hidden sm:table-cell">Assigned</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todoItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="hidden md:table-cell">{getTopicTitle(item.topic)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">{item.createdAt ? formatDistanceToNowStrict(item.createdAt.toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                           <Button asChild size="sm">
                              <Link href={`/student/quizzes/${item.topic}`}>
                                  Take Quiz
                              </Link>
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCard
          title="Quizzes"
          description="View all available quizzes and complete them to test your knowledge."
          icon={<BookOpenCheck className="h-8 w-8" />}
          linkHref="/student/quizzes"
          linkText="Go to Quizzes"
        />

        <DashboardCard
          title="My Progress"
          description="Track your mastery and performance across all topics."
          icon={<Target className="h-8 w-8" />}
          linkHref="/student/my-progress"
          linkText="View My Progress"
        />
      </div>
    </div>
  );
}
