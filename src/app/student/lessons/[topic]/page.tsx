
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, collection, query, where, orderBy, addDoc, increment, onSnapshot, limit, writeBatch, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, BookOpen, ListChecks, FileText, Lock, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { CourseContentItem, LessonMaterialDetails, QuizDetails, UserProgressTopic, AppUser, QuizQuestion, QuizResult } from "@/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { mathTopics, type MathTopic } from '@/config/topics';
import { allAchievementDefinitions } from '@/config/achievements';
import { MathKeyboard } from '@/components/common/MathKeyboard';

const UNLOCK_MASTERY_THRESHOLD = 75; // 75% mastery needed to unlock next topic

// Function to shuffle an array
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};


export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicSlug = typeof params.topic === 'string' ? params.topic : "";
  const currentTopicInfo = mathTopics.find(t => t.slug === topicSlug);
  const topicTitle = currentTopicInfo?.title || topicSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const { user, loading: authLoading } = useAuth();
  const [lessonMaterials, setLessonMaterials] = useState<CourseContentItem[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<CourseContentItem | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLimitEnd, setTimeLimitEnd] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [materialsViewed, setMaterialsViewed] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isTopicLocked, setIsTopicLocked] = useState(true);
  
  const [contentError, setContentError] = useState<string | null>(null);
  const answerInputRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setIsLoadingContent(false);
        setIsTopicLocked(true);
        return;
    }

    // Check if topic is locked
    const checkLockStatus = async () => {
        if (!currentTopicInfo) {
            setContentError("Topic not found.");
            setIsTopicLocked(true);
            setIsLoadingContent(false);
            return;
        }

        if (currentTopicInfo.order === 1) {
            setIsTopicLocked(false);
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.id));
        if (!userDoc.exists()) {
            setIsTopicLocked(true);
            return;
        }
        const userData = userDoc.data() as AppUser;
        const previousTopicOrder = currentTopicInfo.order - 1;
        const previousTopic = mathTopics.find(t => t.order === previousTopicOrder);
        
        if (!previousTopic) {
            setIsTopicLocked(true); // Should not happen
            return;
        }

        const progress = userData.progress?.[previousTopic.slug];
        if (progress && (progress.mastery ?? 0) >= UNLOCK_MASTERY_THRESHOLD) {
            setIsTopicLocked(false);
        } else {
            setIsTopicLocked(true);
        }
    };

    checkLockStatus();
  }, [user, authLoading, currentTopicInfo]);


  useEffect(() => {
    if (isTopicLocked || authLoading) {
      if (!authLoading) setIsLoadingContent(false);
      return;
    }
    if (!topicSlug) {
      setContentError("Topic not specified.");
      setIsLoadingContent(false);
      return;
    }
    if (!user || !user.teacherId) {
      setContentError("You must be assigned to a teacher to view content.");
      setIsLoadingContent(false);
      return;
    }

    setIsLoadingContent(true);
    setContentError(null);
    const contentCollectionRef = collection(db, "courseContent");
    const unsubscribes: (() => void)[] = [];

    // Query for all content for the topic
    const contentQuery = query(
      contentCollectionRef,
      where("topic", "==", topicSlug),
      where("teacherId", "==", user.teacherId),
      where("isArchived", "==", false),
      orderBy("createdAt", "desc")
    );

    unsubscribes.push(onSnapshot(contentQuery, (snapshot) => {
        const materials: CourseContentItem[] = [];
        let quiz: CourseContentItem | null = null;
        
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() } as CourseContentItem;
            if (item.contentType === 'quiz') {
                if (!quiz) quiz = item; // Get the latest quiz
            } else if (item.contentType === 'lessonMaterial') {
                materials.push(item);
            }
        });

        setLessonMaterials(materials);
        setCurrentQuiz(quiz);
        setIsLoadingContent(false);
    }, (err) => {
        console.error("Error fetching content:", err);
        setContentError("Could not load content in real-time.");
        setIsLoadingContent(false);
    }));

    // Cleanup function
    return () => unsubscribes.forEach(unsub => unsub());

  }, [topicSlug, user, authLoading, isTopicLocked]);
  
  useEffect(() => {
    const checkProgress = async () => {
        if (user && topicSlug && !authLoading) {
            const userDocRef = doc(db, "users", user.id);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const progressData = userDocSnap.data().progress as Record<string, UserProgressTopic> | undefined;
                if (progressData && progressData[topicSlug]) {
                    setMaterialsViewed(!!progressData[topicSlug].materialsViewed);
                }
            }
        }
    };
    checkProgress();
  }, [user, topicSlug, authLoading]);

  // Handle quiz start and question shuffling
  const handleStartQuiz = () => {
    if (!currentQuiz || !('questions' in currentQuiz.content)) return;
    const quizDetails = currentQuiz.content as QuizDetails;
    let questions = quizDetails.questions || [];
    if (quizDetails.randomizeQuestions) {
      setShuffledQuestions(shuffleArray([...questions]));
    } else {
      setShuffledQuestions(questions);
    }

    if (quizDetails.timeLimitMinutes && quizDetails.timeLimitMinutes > 0) {
      const endTime = Date.now() + quizDetails.timeLimitMinutes * 60 * 1000;
      setTimeLimitEnd(endTime);
      localStorage.setItem(`quiz-${currentQuiz.id}-endTime`, endTime.toString());
    }

    setQuizStarted(true);
  };
  
   // Timer logic
  useEffect(() => {
    if (!quizStarted) return;
    
    // Check for a running timer in localStorage
    if(currentQuiz?.id) {
        const storedEndTime = localStorage.getItem(`quiz-${currentQuiz.id}-endTime`);
        if (storedEndTime && !isNaN(parseInt(storedEndTime, 10))) {
            const endTime = parseInt(storedEndTime, 10);
            if (endTime > Date.now()) {
                 setTimeLimitEnd(endTime);
            }
        }
    }

    if (!timeLimitEnd) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, timeLimitEnd - now);
      setRemainingTime(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
        toast({ title: "Time's Up!", description: "Your quiz has been automatically submitted.", variant: "destructive" });
        handleSubmitQuiz();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeLimitEnd, currentQuiz]);


  const formatTime = (ms: number | null) => {
    if (ms === null) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  const handleMarkAsDownloaded = async () => {
    if (!user || !topicSlug || materialsViewed || lessonMaterials.length === 0) return;

    setIsMarking(true);
    try {
      const userDocRef = doc(db, "users", user.id);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
          throw new Error("User data not found.");
      }
      
      const userData = userDocSnap.data() as AppUser;
      let currentProgress = userData.progress || {};
      
      const topicProgress = (currentProgress as any)[topicSlug] || {};
      const newProgressForTopic: Partial<UserProgressTopic> = {
        status: topicProgress.status === "Completed" ? "Completed" : "In Progress", 
        lastActivity: Timestamp.now(),
        mastery: topicProgress.mastery || 0,
        materialsViewed: true,
      };

      await updateDoc(userDocRef, { [`progress.${topicSlug}`]: { ...topicProgress, ...newProgressForTopic } });
      toast({ title: "Progress Updated", description: `Content for ${topicTitle} marked as viewed.` });
      setMaterialsViewed(true);

      const unlockedAchievementIds = userData.unlockedAchievementIds || [];
      if (!unlockedAchievementIds.includes("topic-starter")) {
        await updateDoc(userDocRef, { unlockedAchievementIds: arrayUnion("topic-starter") });
        toast({ title: "Achievement Unlocked!", description: "You earned 'Topic Starter'!" });
      }
      
      if (userData.teacherId) {
        await addDoc(collection(db, "teacherActivities"), {
          teacherId: userData.teacherId,
          message: `${user.displayName || 'A student'} viewed lesson materials for "${topicTitle}".`,
          timestamp: Timestamp.now(),
          type: 'content_viewed', 
          studentId: user.id,
          studentName: user.displayName,
          relatedItemId: topicSlug,
          relatedItemTitle: topicTitle,
        });
      }

    } catch (err: any) {
      console.error("Error marking content:", err);
      toast({ title: "Error", description: "Could not update progress.", variant: "destructive" });
    } finally {
      setIsMarking(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleKeyboardInsert = (questionId: string, text: string) => {
    const input = answerInputRefs.current[questionId];
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const currentValue = input.value;
        const newValue = currentValue.substring(0, start ?? 0) + text + currentValue.substring(end ?? 0);
        
        handleAnswerChange(questionId, newValue);

        // Focus and set cursor position after insert
        setTimeout(() => {
            input.focus();
            const newCursorPos = (start ?? 0) + text.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }
  };

  const recalculateTopicMastery = async (userId: string, topicSlug: string): Promise<number> => {
    const studentResultsQuery = query(
      collection(db, `users/${userId}/quizResults`),
      where("topic", "==", topicSlug)
    );
    const studentResultsSnapshot = await getDocs(studentResultsQuery);
  
    if (studentResultsSnapshot.empty) {
      return 0;
    }

    let totalCorrect = 0;
    let totalPossible = 0;
    
    studentResultsSnapshot.forEach(doc => {
      const result = doc.data() as QuizResult;
      totalCorrect += result.score;
      totalPossible += result.total;
    });
  
    if (totalPossible === 0) {
      return 0;
    }
  
    const mastery = Math.round((totalCorrect / totalPossible) * 100);
    return mastery;
  };



  const handleSubmitQuiz = async () => {
    if (!user || !user.teacherId || !currentQuiz || !shuffledQuestions || quizSubmitted) return;
    
    setIsSubmittingQuiz(true);
    const questions = shuffledQuestions;
    let correctAnswersCount = 0;
    
    questions.forEach((q) => {
      const question = q as QuizQuestion;
      const studentAnswer = quizAnswers[question.id];
      let isCorrect = false;

      switch (question.questionType) {
        case 'multipleChoice':
          isCorrect = studentAnswer === question.correctAnswerIndex;
          break;
        case 'identification':
          isCorrect = studentAnswer?.trim().toLowerCase() === question.answerKey?.[0]?.trim().toLowerCase();
          break;
        case 'enumeration':
          const correctAnswersSet = new Set(question.answerKey?.map(a => a.trim().toLowerCase()));
          const studentAnswersSet = new Set(studentAnswer?.split('\n').map((a: string) => a.trim().toLowerCase()).filter(Boolean));
          isCorrect = correctAnswersSet.size === studentAnswersSet.size && [...correctAnswersSet].every(item => studentAnswersSet.has(item));
          break;
      }
      if (isCorrect) {
        correctAnswersCount++;
      }
    });

    const scorePercentage = questions.length > 0 ? Math.round((correctAnswersCount / questions.length) * 100) : 0;
    setQuizScore(scorePercentage);
    setQuizSubmitted(true); 

    try {
      const userDocRef = doc(db, "users", user.id);
      
      const quizResultRef = doc(collection(db, `users/${user.id}/quizResults`));
      await setDoc(quizResultRef, {
        quizId: currentQuiz.id,
        topic: topicSlug,
        score: correctAnswersCount,
        total: questions.length,
        percentage: scorePercentage,
        submittedAt: Timestamp.now(),
        gradeLevel: user.gradeLevel, // Save grade level with result
      });

      // Recalculate total points for the student
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error("User data not found.");
      
      const userData = userDocSnap.data() as AppUser;
      const currentTotalPoints = userData.totalPoints || 0;
      const newTotalPoints = currentTotalPoints + correctAnswersCount;

      const newMastery = await recalculateTopicMastery(user.id, topicSlug);
      
      let userProgress = userData.progress || {};

      const topicProgressData: UserProgressTopic = userProgress[topicSlug] || {
        mastery: 0, status: "Not Started", lastActivity: Timestamp.now(), quizzesAttempted: 0,
      };

      topicProgressData.mastery = newMastery;
      topicProgressData.status = newMastery >= UNLOCK_MASTERY_THRESHOLD ? "Completed" : "In Progress";
      topicProgressData.lastActivity = Timestamp.now();
      topicProgressData.quizzesAttempted = (topicProgressData.quizzesAttempted || 0) + 1;
      topicProgressData.lastQuizScore = scorePercentage;
      topicProgressData.lastQuizCorrect = correctAnswersCount;
      topicProgressData.lastQuizTotal = questions.length;
      
      const updateData = { 
          [`progress.${topicSlug}`]: topicProgressData,
          totalPoints: newTotalPoints 
      };
      await updateDoc(userDocRef, updateData);
      
      toast({ title: "Quiz Submitted!", description: `You scored ${correctAnswersCount} out of ${questions.length} (${scorePercentage}%) on this attempt. Your overall topic mastery is now ${newMastery}%.` });

      localStorage.removeItem(`quiz-${currentQuiz.id}-endTime`);
      setTimeLimitEnd(null);

      const unlockedAchievementIds = userData.unlockedAchievementIds || [];
      if (!unlockedAchievementIds.includes("first-quiz-completed")) {
        await updateDoc(userDocRef, { unlockedAchievementIds: arrayUnion("first-quiz-completed") });
        toast({ title: "Achievement Unlocked!", description: "You earned 'Quiz Navigator'!" });
      }

      const topicAchievement = allAchievementDefinitions.find(ach => ach.topicSlug === topicSlug);
      if (topicAchievement && newMastery >= 85 && !unlockedAchievementIds.includes(topicAchievement.id)) {
        await updateDoc(userDocRef, { unlockedAchievementIds: arrayUnion(topicAchievement.id) });
        toast({ title: "Achievement Unlocked!", description: `You earned '${topicAchievement.name}'!` });
      }

       if (userData.teacherId) {
        await addDoc(collection(db, "teacherActivities"), {
          teacherId: userData.teacherId,
          message: `${user.displayName || 'A student'} completed the quiz "${currentQuiz.title}" and scored ${scorePercentage}%.`,
          timestamp: Timestamp.now(),
          type: 'quiz_completion',
          studentId: user.id,
          studentName: user.displayName,
          relatedItemId: currentQuiz.id,
          relatedItemTitle: currentQuiz.title,
        });
      }


    } catch (err: any)      {
      console.error("Error submitting quiz / updating progress:", err);
      toast({ title: "Error", description: "Could not save quiz results.", variant: "destructive" });
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const quizQuestions = shuffledQuestions;

  const checkAllQuestionsAnswered = () => {
    if (!quizQuestions || quizQuestions.length === 0) return false;
    return quizQuestions.every(q => {
        const answer = quizAnswers[q.id];
        return answer !== undefined && answer !== null && answer !== '';
    });
  };

  if (isLoadingContent) {
      return (
          <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg text-muted-foreground">Loading learning path...</p>
          </div>
      );
  }

  if (isTopicLocked) {
      return (
          <div className="space-y-8">
              <Card className="shadow-lg">
                  <CardHeader>
                      <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                          <Lock className="h-8 w-8" /> {topicTitle}
                      </CardTitle>
                      <CardDescription>This topic is currently locked.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-lg text-muted-foreground">
                          Please complete the previous topic with a mastery of {UNLOCK_MASTERY_THRESHOLD}% or higher to unlock this content.
                      </p>
                      <Button asChild className="mt-4">
                          <Link href="/student/quizzes">Go Back to Quizzes</Link>
                      </Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">{topicTitle}</CardTitle>
          <CardDescription>Follow the learning path to master {topicTitle.toLowerCase()}.</CardDescription>
        </CardHeader>
      </Card>
      
      {contentError && (
        <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error Loading Content</AlertTitle><AlertDescription>{contentError}</AlertDescription></Alert>
      )}

      {!contentError && (
        <>
          <Card id="lessons" className="shadow-md">
            <CardHeader>
               <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">1</span>
                  <div>
                    <CardTitle className="text-2xl font-headline text-primary/90">Lesson Materials</CardTitle>
                    <CardDescription>Review these materials from your teacher.</CardDescription>
                  </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lessonMaterials.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No lesson materials uploaded for this topic yet.</p>
              ) : (
                lessonMaterials.map(material => (
                    <Card key={material.id} className="bg-secondary/30">
                        <CardHeader>
                            <CardTitle>{material.title}</CardTitle>
                            {material.description && <CardDescription>{material.description}</CardDescription>}
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: (material.content as LessonMaterialDetails).content.replace(/\n/g, '<br />') }} />
                        </CardContent>
                        <CardFooter>
                           <Button onClick={handleMarkAsDownloaded} disabled={isMarking || materialsViewed}>
                                {isMarking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {materialsViewed ? "Completed" : "Mark as Downloaded"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))
              )}
            </CardContent>
          </Card>


          <Card id="quiz" className="shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-center sm:justify-start items-center gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">2</span>
                  <div>
                    <CardTitle className="text-2xl font-headline text-primary/90">Check Your Understanding</CardTitle>
                    <CardDescription>Test your knowledge with the mastery quiz.</CardDescription>
                  </div>
                </div>
                 {quizStarted && !quizSubmitted && timeLimitEnd && (
                    <div className="ml-auto font-mono text-xl font-semibold text-destructive animate-pulse">
                        {formatTime(remainingTime)}
                    </div>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              {!currentQuiz ? (
                  <div className="text-center text-muted-foreground py-6">No quiz available for {topicTitle} yet. Check back later!</div>
              ) : (
                <>
                  {!quizStarted && !quizSubmitted && (
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-secondary/30 rounded-lg">
                        <CardTitle className="mb-2">{currentQuiz.title}</CardTitle>
                        {currentQuiz.description &&<CardDescription className="mb-4 max-w-prose">{currentQuiz.description}</CardDescription>}
                        <Button size="lg" onClick={handleStartQuiz}>Start Quiz</Button>
                    </div>
                  )}

                  {quizStarted && !quizSubmitted && (
                    <div className="space-y-6">
                        {quizQuestions.map((q, qIndex) => {
                          const question = q as QuizQuestion;
                          return (
                          <div key={question.id || qIndex} className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                            <p className="font-medium text-foreground/90">{qIndex + 1}. {question.text}</p>
                            {question.questionType === 'multipleChoice' && question.options && (
                                <RadioGroup onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))} value={quizAnswers[question.id]?.toString()}>
                                    {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="flex items-center space-x-2">
                                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}o${oIndex}`} />
                                        <Label htmlFor={`q${qIndex}o${oIndex}`} className="font-normal">{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}
                            {question.questionType === 'identification' && (
                                <>
                                <Input 
                                  placeholder="Your answer" 
                                  value={quizAnswers[question.id] || ''} 
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)} 
                                  ref={(el) => { if(el) answerInputRefs.current[question.id] = el; }}
                                />
                                <MathKeyboard topic={topicSlug} onInsert={(text) => handleKeyboardInsert(question.id, text)} />
                                </>
                            )}
                            {question.questionType === 'enumeration' && (
                                <>
                                <Textarea 
                                  placeholder="Enter each item on a new line..." 
                                  rows={Math.max(3, question.answerKey?.length || 3)} 
                                  value={quizAnswers[question.id] || ''} 
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)} 
                                  ref={(el) => { if(el) answerInputRefs.current[question.id] = el; }}
                                />
                                <MathKeyboard topic={topicSlug} onInsert={(text) => handleKeyboardInsert(question.id, text)} />
                                </>
                            )}
                          </div>
                        )})}
                        <Button onClick={handleSubmitQuiz} disabled={isSubmittingQuiz || !checkAllQuestionsAnswered()} size="lg">
                          {isSubmittingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Submit Quiz
                        </Button>
                        {!checkAllQuestionsAnswered() && <p className="text-xs text-muted-foreground text-center">Please answer all questions before submitting.</p>}
                    </div>
                  )}

                  {quizSubmitted && quizScore !== null && (
                    <div className="space-y-6">
                        <Card className="bg-secondary/30">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary/90">Quiz Results: {currentQuiz.title}</CardTitle>
                                <CardDescription>You scored: <span className="font-bold text-primary text-lg">{quizScore}%</span> ({Math.round(quizScore / 100 * quizQuestions.length)} out of {quizQuestions.length} correct)</CardDescription>
                            </CardHeader>
                        </Card>
                        {quizQuestions.map((q, qIndex) => {
                          const question = q as QuizQuestion;
                          const studentAnswer = quizAnswers[question.id];
                          let isCorrect = false;

                          if (question.questionType === 'multipleChoice') {
                            isCorrect = studentAnswer === question.correctAnswerIndex;
                          } else if (question.questionType === 'identification') {
                            isCorrect = studentAnswer?.trim().toLowerCase() === question.answerKey?.[0]?.trim().toLowerCase();
                          } else if (question.questionType === 'enumeration') {
                              const correctAnswersSet = new Set(question.answerKey?.map(a => a.trim().toLowerCase()));
                              const studentAnswersSet = new Set(studentAnswer?.split('\n').map((a: string) => a.trim().toLowerCase()).filter(Boolean));
                              isCorrect = correctAnswersSet.size === studentAnswersSet.size && [...correctAnswersSet].every(item => studentAnswersSet.has(item));
                          }

                          return (
                            <div key={question.id || qIndex} className="space-y-3 p-4 border rounded-md shadow-sm bg-card">
                              <p className="font-medium text-foreground/90 flex items-center">{qIndex + 1}. {question.text}</p>
                              {question.questionType === 'multipleChoice' && question.options && (
                                <ul className="space-y-2">
                                    {question.options.map((option, oIndex) => {
                                    const wasSelectedByStudent = studentAnswer === oIndex;
                                    const isTheCorrectOption = oIndex === question.correctAnswerIndex;
                                    return (
                                        <li key={oIndex} className={cn("flex items-center space-x-2 p-2 rounded-md text-sm", wasSelectedByStudent && !isTheCorrectOption && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700", isTheCorrectOption && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700", wasSelectedByStudent && isTheCorrectOption && "font-bold", !wasSelectedByStudent && !isTheCorrectOption && "bg-muted/30")}>
                                        <span>{option}</span>
                                        </li>
                                    );
                                    })}
                                </ul>
                              )}
                              {question.questionType === 'identification' && (
                                    <div>
                                        <p className="text-sm">Your answer: <span className={cn(isCorrect ? "text-green-700" : "text-red-700")}>"{studentAnswer}"</span></p>
                                        {!isCorrect && <p className="text-sm">Correct answer: <span className="text-green-700">"{question.answerKey?.[0]}"</span></p>}
                                    </div>
                                )}
                                {question.questionType === 'enumeration' && (
                                    <div>
                                        <p className="text-sm">Your answers:</p>
                                        <pre className={cn("p-2 rounded bg-muted text-sm whitespace-pre-wrap font-sans", isCorrect ? "text-green-700" : "text-red-700")}>{studentAnswer}</pre>
                                        {!isCorrect && <div><p className="text-sm mt-2">Correct answers:</p><pre className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-sm text-green-700 whitespace-pre-wrap font-sans">{question.answerKey?.join('\n')}</pre></div>}
                                    </div>
                                )}
                            </div>
                          );
                        })}
                        <Button variant="outline" onClick={() => router.push('/student/quizzes')}>Mark as Done</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
