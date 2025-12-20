"use client";

import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Target, Zap, List, Award, BookOpenCheck, ListChecks, Loader2, AlertTriangle, Info, CheckCircle, Lightbulb, ExternalLink, GraduationCap, MessageSquare, PlayCircle } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { CourseContentItem, AppUser, LessonMaterialDetails, QuizResult, QuizDetails, QuizQuestion } from '@/types';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, Timestamp, increment, addDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { mathTopics } from '@/config/topics';
import { formatDistanceToNowStrict } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  
  // Raw data from Firestore listeners
  const [currentUserData, setCurrentUserData] = useState<AppUser | null>(null);
  const [todoItems, setTodoItems] = useState<CourseContentItem[]>([]);

  // Quiz modal state
  const [selectedQuiz, setSelectedQuiz] = useState<CourseContentItem | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});
  const [score, setScore] = useState<number | null>(null);

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

  const handleSelectQuiz = async (quiz: CourseContentItem) => {
    try {
      // Prevent opening a quiz whose due date has already passed
      if (quiz.dueDate && quiz.dueDate.toDate().getTime() <= Date.now()) {
        setError("This quiz is no longer available (past its due date).");
        return;
      }

      // Ensure we have the full quiz content. Some newly created quizzes
      // may not include the `content` payload in list snapshots depending
      // on security/replication timing. Fetch the full document if needed.
      let fullQuiz = quiz;
      const maybeQuestions = (quiz.content as any)?.questions;
      if (!maybeQuestions || !Array.isArray(maybeQuestions) || maybeQuestions.length === 0) {
        const quizDocRef = doc(db, 'courseContent', quiz.id);
        const quizSnap = await getDoc(quizDocRef);
        if (quizSnap.exists()) {
          fullQuiz = { id: quizSnap.id, ...quizSnap.data() } as CourseContentItem;
        }
      }

      // Final safety check
      const questions = (fullQuiz.content as QuizDetails)?.questions ?? [];
      if (!questions || questions.length === 0) {
        setError('Quiz content is not yet available. Please try again in a moment.');
        return;
      }

      setSelectedQuiz(fullQuiz);
      setAnswers({});
      setScore(null);
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Failed to load quiz. Please try again.');
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value.split('\n') }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz || !user) return;

    // Prevent submitting a quiz that has expired while open
    if (selectedQuiz.dueDate && selectedQuiz.dueDate.toDate().getTime() <= Date.now()) {
      setError("Cannot submit: the due date has passed and this quiz is closed.");
      return;
    }

    let correctAnswers = 0;
    const quizContent = selectedQuiz.content as QuizDetails;
    quizContent.questions.forEach(question => {
      const studentAnswer = answers[question.id];
      if (question.questionType === 'multipleChoice') {
        const correctOptionIndex = question.correctAnswerIndex ?? -1;
        const correctOption = question.options?.[correctOptionIndex];
        if (studentAnswer && correctOption && (studentAnswer as string).trim().toLowerCase() === correctOption.trim().toLowerCase()) {
          correctAnswers++;
        }
      } else if (question.questionType === 'identification' || question.questionType === 'problem-solving') {
        const correctAnswer = question.answerKey?.[0] || '';
        if (studentAnswer && (studentAnswer as string).trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          correctAnswers++;
        }
      } else if (question.questionType === 'enumeration') {
        const correctAnswersSet = new Set((question.answerKey || []).map(a => a.trim().toLowerCase()));
        const studentAnswersSet = new Set((Array.isArray(studentAnswer) ? studentAnswer : []).map(a => a.trim().toLowerCase()));
        if (correctAnswersSet.size > 0 && Array.from(correctAnswersSet).every(a => studentAnswersSet.has(a))) {
          correctAnswers++;
        }
      }
    });

    const quizScore = (correctAnswers / quizContent.questions.length) * 100;
    setScore(quizScore);

    try {
        const studentRef = doc(db, 'users', user.id);
        const quizTopic = selectedQuiz.topic;

        const quizResultRef = collection(db, 'users', user.id, 'quizResults');
        await addDoc(quizResultRef, {
            quizId: selectedQuiz.id,
            quizTitle: selectedQuiz.title,
            topic: quizTopic || 'N/A',
            submittedAt: Timestamp.now(),
            percentage: quizScore,
            correct: correctAnswers,
            total: quizContent.questions.length,
        });

        if (quizTopic) {
          const updateData = {
            [`progress.${quizTopic}.lastActivity`]: Timestamp.now(),
            [`progress.${quizTopic}.lastQuizScore`]: quizScore,
            [`progress.${quizTopic}.lastQuizCorrect`]: correctAnswers,
            [`progress.${quizTopic}.lastQuizTotal`]: quizContent.questions.length,
            [`progress.${quizTopic}.mastery`]: quizScore,
            [`progress.${quizTopic}.quizzesAttempted`]: increment(1),
          };
          await updateDoc(studentRef, updateData);
        }

        // Update todoItems to remove the completed quiz
        setTodoItems(prev => prev.filter(item => item.id !== selectedQuiz.id));
    } catch(err) {
        console.error("Error submitting quiz result:", err);
        setError("There was an error submitting your quiz. Please try again.");
    }
  };

  const getTopicTitle = (slug: string | undefined) => {
    if (!slug) return "Unknown Topic";
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
  };
  
  const totalQuestions = (selectedQuiz?.content as QuizDetails)?.questions.length ?? 0;
  const timeLimit = (selectedQuiz?.content as QuizDetails)?.timeLimitMinutes;
  
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
                          <Button onClick={() => handleSelectQuiz(item)} size="sm">
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Take Quiz
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

      <Dialog open={!!selectedQuiz} onOpenChange={() => setSelectedQuiz(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedQuiz && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedQuiz.title}</DialogTitle>
                <DialogDescription>
                  {selectedQuiz.description}
                  {timeLimit && timeLimit > 0 && (
                    <span className="block text-sm text-muted-foreground mt-2">
                      Time Limit: {timeLimit} minutes
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-6">
                {score === null ? (
                  <div className="space-y-6 py-4">
                    {(selectedQuiz.content as QuizDetails).questions.map((question, index) => (
                      <div key={question.id} className='my-4 p-4 border rounded-lg bg-muted/20'>
                        <p className='font-semibold mb-3'>
                          {index + 1}. {question.text}
                        </p>
                        {question.questionType === 'multipleChoice' && question.options && (
                          <RadioGroup
                            value={answers[question.id] as string || ''}
                            onValueChange={(value) => handleAnswerChange(question.id, value)}
                          >
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                                <Label htmlFor={`${question.id}-${optionIndex}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        {(question.questionType === 'identification' || question.questionType === 'problem-solving') && (
                          <input
                            type="text"
                            placeholder="Your answer"
                            value={answers[question.id] as string || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        )}
                        {question.questionType === 'enumeration' && (
                          <textarea
                            placeholder="List your answers, one per line"
                            value={Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).join('\n') : ''}
                            onChange={(e) => handleMultiAnswerChange(question.id, e.target.value)}
                            className="w-full p-2 border rounded"
                            rows={4}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <h3 className="text-2xl font-bold mb-4">Quiz Completed!</h3>
                    <p className="text-lg mb-4">Your Score: {score.toFixed(1)}%</p>
                    <p className="text-muted-foreground">
                      You answered {Math.round((score / 100) * totalQuestions)} out of {totalQuestions} questions correctly.
                    </p>
                  </div>
                )}
              </ScrollArea>
              
              {score === null && (
                <DialogFooter>
                  <Button onClick={handleSubmitQuiz} disabled={Object.keys(answers).length < totalQuestions}>
                    Submit Quiz
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}                            
