
"use client";

import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Target, Brain, Zap, List, Award, BookOpenCheck, ListChecks, Loader2, AlertTriangle, Info, CheckCircle, Lightbulb, ExternalLink, GraduationCap, MessageSquare } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { CourseContentItem, AssignmentDetails, AppUser, LessonMaterialDetails } from '@/types';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { mathTopics } from '@/config/topics';
import { formatDistanceToNowStrict } from 'date-fns';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  
  // Raw data from Firestore listeners
  const [currentUserData, setCurrentUserData] = useState<AppUser | null>(null);
  const [allQuizzes, setAllQuizzes] = useState<CourseContentItem[]>([]);
  const [allMaterials, setAllMaterials] = useState<CourseContentItem[]>([]);

  // Loading and error states for each data source
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up listeners for real-time data
  useEffect(() => {
    if (!user) {
      setIsLoadingUser(false);
      setIsLoadingQuizzes(false);
      setIsLoadingMaterials(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // 1. Listen to user document for real-time progress and weaknesses
    const userDocRef = doc(db, "users", user.id);
    unsubscribes.push(onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData({ id: docSnap.id, ...docSnap.data() } as AppUser);
      }
      setIsLoadingUser(false);
    }, (err) => {
      console.error("Error listening to user data:", err);
      setError("Failed to load user profile in real-time.");
      setIsLoadingUser(false);
    }));

    // 2. Listen to teacher's content if teacherId exists
    if (user.teacherId) {
      // Quizzes listener
      const quizzesQuery = query(
        collection(db, "courseContent"),
        where("teacherId", "==", user.teacherId),
        where("contentType", "==", "quiz"),
        where("isArchived", "==", false),
        orderBy("createdAt", "desc")
      );
      unsubscribes.push(onSnapshot(quizzesQuery, (snapshot) => {
        setAllQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem)));
        setIsLoadingQuizzes(false);
      }, (err) => {
        console.error("Error listening to quizzes:", err);
        setError("Failed to load quizzes in real-time. A database index may be required.");
        setIsLoadingQuizzes(false);
      }));

      // Materials listener
      const materialsQuery = query(
        collection(db, "courseContent"),
        where("teacherId", "==", user.teacherId),
        where("contentType", "==", "lessonMaterial"),
        where("isArchived", "==", false)
      );
      unsubscribes.push(onSnapshot(materialsQuery, (snapshot) => {
        setAllMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem)));
        setIsLoadingMaterials(false);
      }, (err) => {
        console.error("Error listening to learning materials:", err);
        setError("Failed to load learning materials in real-time.");
        setIsLoadingMaterials(false);
      }));

    } else {
      setIsLoadingQuizzes(false);
      setIsLoadingMaterials(false);
    }
    
    // Cleanup function to unsubscribe from all listeners on component unmount
    return () => unsubscribes.forEach(unsub => unsub());

  }, [user]);

  // Derived state using useMemo to avoid re-computation on every render
  const todoItems = useMemo(() => {
    if (!currentUserData || !allQuizzes) return [];
    return allQuizzes.filter(item => {
      const progress = currentUserData.progress?.[item.topic];
      return !progress || progress.status !== 'Completed';
    });
  }, [currentUserData, allQuizzes]);

  const isLoading = isLoadingUser || isLoadingQuizzes || isLoadingMaterials;

  const getTopicTitle = (slug: string) => {
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
  };
  
  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-headline font-semibold text-primary">
          Student Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user?.displayName || 'Student'}! Ready to conquer Grade 10 Math? Let's get started!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <Card className="shadow-md h-full">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                <ListChecks className="h-6 w-6" />
                Your To-Do List
              </CardTitle>
              <CardDescription>
                New quizzes from your teacher will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading to-do items...</p>
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
                    <h3 className="text-lg font-semibold text-foreground">You're all caught up!</h3>
                    <p className="text-sm">There are no new quizzes at the moment.</p>
                </div>
              )}
              {!isLoading && !error && todoItems.length > 0 && (
                <Accordion type="multiple" className="w-full space-y-3">
                  {todoItems.map(item => (
                    <Card key={item.id} className="bg-secondary/30">
                      <AccordionItem value={item.id} className="border-b-0">
                        <AccordionTrigger className="p-4 hover:no-underline">
                          <div className="flex items-center gap-4 text-left w-full">
                            <div className="p-2 bg-background rounded-full">
                              <ListChecks className="h-5 w-5 text-primary"/>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Topic: {getTopicTitle(item.topic)} &bull; Assigned {item.createdAt ? formatDistanceToNowStrict(item.createdAt.toDate(), { addSuffix: true }) : ''}
                              </p>
                            </div>
                            <Badge variant='secondary' className="hidden sm:inline-flex">
                                Quiz
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                            <div className="border-t pt-4 space-y-4">
                                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                <div>
                                    <p className="text-sm text-muted-foreground mb-3">This is a quiz to test your knowledge on {getTopicTitle(item.topic)}. Click the button to start.</p>
                                    <Button asChild>
                                        <Link href={`/student/lessons/${item.topic}`}>
                                            Go to Quiz
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Interactive Lessons"
          description="Dive into key Grade 10 math topics and concepts."
          icon={<BookOpen className="h-8 w-8" />}
          linkHref="/student/lessons"
          linkText="Start Learning"
        />

        <DashboardCard
          title="Progress Tracker"
          description="Monitor your mastery in each topic."
          icon={<Target className="h-8 w-8" />}
          linkHref="/student/my-progress"
          linkText="View Progress"
        />

         <DashboardCard
          title="Grades"
          description="View your official quiz scores and GPA."
          icon={<GraduationCap className="h-8 w-8" />}
          linkHref="/student/grades"
          linkText="View Grades"
        />
        
        <DashboardCard
          title="AI Math Assistant"
          description="Get instant help with math problems."
          icon={<Brain className="h-8 w-8" />}
          linkHref="/student/assistant"
          linkText="Ask AI"
        />

        <DashboardCard
          title="Challenge Problems"
          description="Test your skills and knowledge."
          icon={<Zap className="h-8 w-8" />}
          linkHref="/student/challenges"
          linkText="Take a Challenge"
        />

        <DashboardCard
          title="Learning Resources"
          description="Find helpful videos and websites."
          icon={<List className="h-8 w-8" />}
          linkHref="/student/resources"
          linkText="Explore Resources"
        />
        
        <DashboardCard
          title="Achievements"
          description="Track your accomplishments and milestones."
          icon={<Award className="h-8 w-8" />}
          linkHref="/student/achievements"
          linkText="View Achievements"
        />
      </div>
    </div>
  );
}
