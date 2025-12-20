'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { collection, query, where, doc, updateDoc, Timestamp, increment, addDoc, getDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { CourseContentItem, QuizDetails, QuizQuestion } from '@/types';
import { BookOpenCheck, Loader2, AlertTriangle, ListChecks, PlayCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Quiz extends CourseContentItem {}

const QuizzesPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});
  const [score, setScore] = useState<number | null>(null);
  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !user.sectionId) {
      setIsLoading(false);
      return;
    }

    let unsubscribeQuizzes: (() => void) | undefined;
    let isMounted = true;

    const initializeData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const contentCollection = collection(db, 'courseContent');
        const q = query(
          contentCollection,
          where('sectionId', '==', user.sectionId),
          where('contentType', '==', 'quiz'),
          where('isArchived', '==', false)
        );

        unsubscribeQuizzes = onSnapshot(
          q,
          async (quizSnapshot) => {
            if (!isMounted) return;

            const quizList = quizSnapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }) as Quiz);

            setQuizzes(quizList);

            try {
              const quizResultsRef = collection(db, `users/${user.id}/quizResults`);
              const resultsSnapshot = await getDocs(quizResultsRef);
              const completedIds = new Set<string>();
              
              resultsSnapshot.docs.forEach(doc => {
                const result = doc.data();
                if (result.quizId) {
                  completedIds.add(result.quizId);
                }
              });

              setCompletedQuizIds(completedIds);

              const availableQuizzesList = quizList.filter(quiz => {
                // Exclude quizzes already completed by the student
                if (completedIds.has(quiz.id)) return false;
                // Exclude quizzes that have passed their due date
                if (quiz.dueDate && quiz.dueDate.toDate().getTime() <= Date.now()) return false;
                return true;
              });
              setAvailableQuizzes(availableQuizzesList);
            } catch (progressError) {
              console.error("Error checking quiz completion:", progressError);
              setAvailableQuizzes(quizList);
            }

            setIsLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error("Error in quizzes listener:", err);
            setError("Failed to load quizzes. Please try again later.");
            setIsLoading(false);
          }
        );

      } catch (err) {
        if (!isMounted) return;
        console.error("Error setting up quizzes listener:", err);
        setError("Failed to load quizzes. Please try again later.");
        setIsLoading(false);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
      if (unsubscribeQuizzes) {
        unsubscribeQuizzes();
      }
    };
  }, [user]);

  const handleRefresh = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contentCollection = collection(db, 'courseContent');
      const q = query(
        contentCollection,
        where('sectionId', '==', user.sectionId),
        where('contentType', '==', 'quiz'),
        where('isArchived', '==', false)
      );
      
      const quizSnapshot = await getDocs(q);
      const quizList = quizSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as Quiz);

      setQuizzes(quizList);

      const quizResultsRef = collection(db, `users/${user.id}/quizResults`);
      const resultsSnapshot = await getDocs(quizResultsRef);
      const completedIds = new Set<string>();
      
      resultsSnapshot.docs.forEach(doc => {
        const result = doc.data();
        if (result.quizId) {
          completedIds.add(result.quizId);
        }
      });

      setCompletedQuizIds(completedIds);
      const availableQuizzesList = quizList.filter(quiz => {
        if (completedIds.has(quiz.id)) return false;
        if (quiz.dueDate && quiz.dueDate.toDate().getTime() <= Date.now()) return false;
        return true;
      });
      setAvailableQuizzes(availableQuizzesList);
    } catch (err) {
      console.error("Error refreshing quizzes:", err);
      setError("Failed to refresh quizzes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuiz = (quiz: Quiz) => {
    // Prevent opening a quiz whose due date has already passed
    if (quiz.dueDate && quiz.dueDate.toDate().getTime() <= Date.now()) {
      setError("This quiz is no longer available (past its due date).");
      return;
    }

    setSelectedQuiz(quiz);
    setAnswers({});
    setScore(null);
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

        setCompletedQuizIds(prev => new Set(prev.add(selectedQuiz.id)));
        setAvailableQuizzes(prev => prev.filter(quiz => quiz.id !== selectedQuiz.id));
    } catch(err) {
        console.error("Error submitting quiz result:", err);
        setError("There was an error submitting your quiz. Please try again.");
    }
  };

  const totalQuestions = (selectedQuiz?.content as QuizDetails)?.questions.length ?? 0;
  const timeLimit = (selectedQuiz?.content as QuizDetails)?.timeLimitMinutes;

  return (
    <div className='space-y-8'>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <BookOpenCheck className="h-8 w-8" /> Quizzes
            </CardTitle>
            <CardDescription>
              Test your knowledge by taking a quiz. Select a quiz to begin.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading quizzes...</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 mt-2"
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && availableQuizzes.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {quizzes.length === 0 ? (
              <div className="space-y-4">
                <p>No quizzes available for your section at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-green-600 text-lg font-semibold">
                  🎉 All Quizzes Completed! 🎉
                </div>
                <p>You have successfully completed all available quizzes for your section.</p>
                <p className="text-sm">Great work! Check back later for new quizzes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && availableQuizzes.length > 0 && (
        <Card>
          <CardHeader>
              <CardTitle>Quiz List</CardTitle>
              <CardDescription>Showing {availableQuizzes.length} available quiz{availableQuizzes.length !== 1 ? 'zes' : ''}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Topic</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableQuizzes.map(quiz => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell className="hidden md:table-cell">{quiz.topic || "N/A"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{quiz.dueDate ? format(quiz.dueDate.toDate(), "PP") : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {quiz.dueDate && quiz.dueDate.toDate().getTime() <= Date.now() ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="destructive">Closed</Badge>
                          <Button disabled size="sm" variant="ghost">
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Closed
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={() => handleSelectQuiz(quiz)} size="sm">
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Take Quiz
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                          <RadioGroup onValueChange={value => handleAnswerChange(question.id, value)} className="space-y-2">
                            {question.options.map((option: string, i: number) => (
                              <div key={i} className='flex items-center space-x-3 p-3 rounded-md transition-colors hover:bg-background'>
                                <RadioGroupItem value={option} id={`q${index}o${i}`} />
                                <Label htmlFor={`q${index}o${i}`} className="cursor-pointer flex-1">{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        {(question.questionType === 'identification' || question.questionType === 'problem-solving') && (
                          <input type="text" onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-sm shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
                        )}
                        {question.questionType === 'enumeration' && (
                          <textarea onChange={(e) => handleMultiAnswerChange(question.id, e.target.value)} className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-sm shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" rows={4} placeholder="Enter each answer on a new line"/>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <h2 className='text-3xl font-bold'>Your Score: {score.toFixed(2)}%</h2>
                    <p className="text-muted-foreground mt-2">
                      You answered {Math.round(score / 100 * totalQuestions)} out of {totalQuestions} questions correctly.
                    </p>
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-medium">✅ Quiz completed! This quiz has been removed from your available quizzes.</p>
                    </div>
                  </div>
                )}
              </ScrollArea>

              <DialogFooter>
                {score === null ? (
                   <Button onClick={handleSubmitQuiz} className="w-full">Submit Quiz</Button>
                ) : (
                  <Button onClick={() => setSelectedQuiz(null)} className="w-full">Close</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizzesPage;
