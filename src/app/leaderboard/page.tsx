"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, QuizResult, CourseContentItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Trophy, Star, BookOpen, BarChart3, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface RankedStudent extends AppUser {
  rank: number;
  overallProgress: number;
  quizCount: number;
  averageScore: number;
  topicsMastered: number;
  totalTopics: number;
  masteryLevel: 'Beginner' | 'Proficient' | 'Advanced' | 'Expert';
}

interface Section {
    id: string;
    name: string;
}

interface TeacherTopic {
  id: string;
  topic: string;
  teacherId: string;
  teacherName?: string;
}

interface TopicProgressData {
  mastery: number;
  status: string;
  quizzesAttempted: number;
  [key: string]: any;
}

const UNLOCK_MASTERY_THRESHOLD = 75;

export default function LeaderboardPage() {
  const { user: currentUser, role } = useAuth();
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teacherTopics, setTeacherTopics] = useState<TeacherTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  useEffect(() => {
    setIsLoading(true);
    
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    
    const resultsQuery = query(collection(db, "quizResults"));
    
    let sectionsQuery;
    if (role === 'teacher' && currentUser) {
      sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", currentUser.id), orderBy("name"));
    } else if (role === 'principal' || role === 'admin') {
      sectionsQuery = query(collection(db, "sections"), orderBy("name"));
    }

    const topicsQuery = query(collection(db, "courseContent"));

    const unsubscribes: Array<() => void> = [];

    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setAllStudents(students);
      console.log("Loaded students with progress data:", students.map(s => ({
        name: s.displayName,
        hasProgress: !!s.progress,
        progressKeys: s.progress ? Object.keys(s.progress) : []
      })));
    }, (err) => {
      console.error("Error fetching students:", err);
      setError("Failed to load student data.");
    });
    unsubscribes.push(unsubscribeStudents);
    
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
        const results = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as QuizResult));
        setQuizResults(results);
        console.log("Loaded quiz results:", results.length);
    }, (err) => {
        console.error("Error fetching quiz results:", err);
        setError("Failed to load quiz results data.");
    });
    unsubscribes.push(unsubscribeResults);
    
    const unsubscribeTopics = onSnapshot(topicsQuery, (snapshot) => {
      const topicsData: TeacherTopic[] = [];
      const uniqueTopics = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const content = doc.data() as CourseContentItem;
        if (content.topic && !uniqueTopics.has(content.topic)) {
          uniqueTopics.add(content.topic);
          topicsData.push({
            id: doc.id,
            topic: content.topic,
            teacherId: content.teacherId || "",
            teacherName: "Teacher"
          });
        }
      });
      
      topicsData.sort((a, b) => a.topic.localeCompare(b.topic));
      setTeacherTopics(topicsData);
    }, (err) => {
      console.error("Error fetching topics:", err);
    });
    unsubscribes.push(unsubscribeTopics);
    
    if (sectionsQuery) {
        const unsubscribeSections = onSnapshot(sectionsQuery, (snapshot) => {
            setSections(snapshot.docs.map(doc => ({ 
              id: doc.id, 
              name: doc.data().name 
            })));
        }, (err) => {
            console.error("Error fetching sections:", err);
            setError("Failed to load sections data.");
        });
        unsubscribes.push(unsubscribeSections);
    }
    
    setTimeout(() => setIsLoading(false), 1000);

    return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [role, currentUser]);
  
  const getMasteryLevel = (score: number): RankedStudent['masteryLevel'] => {
      if (score >= 90) return 'Expert';
      if (score >= 70) return 'Advanced';
      if (score >= 50) return 'Proficient';
      return 'Beginner';
  };

  // Calculate student progress using the SAME LOGIC as the progress page
  const calculateStudentProgress = (student: AppUser) => {
    // Get student's quiz results
    const studentQuizResults = quizResults.filter(r => r.studentId === student.id);
    const completedQuizzes = studentQuizResults.length;
    
    // Calculate average score from quiz results
    let averageScore = 0;
    if (completedQuizzes > 0) {
      const totalPointsEarned = studentQuizResults.reduce((sum, quiz) => {
        const raw = (quiz as any).score ?? (quiz as any).correct ?? 0;
        return sum + raw;
      }, 0);
      const totalPointsPossible = studentQuizResults.reduce((sum, quiz) => {
        const rawTotal = (quiz as any).total ?? 0;
        return sum + rawTotal;
      }, 0);
      
      averageScore = totalPointsPossible > 0 
        ? Math.round((totalPointsEarned / totalPointsPossible) * 100) 
        : 0;
    }
    
    // Calculate topics from student progress data (same as your progress page)
    const firestoreProgress = student.progress || {};
    const topicsProgress = Object.entries(firestoreProgress).map(([topicKey, data]) => {
      const topicData = data as TopicProgressData;
      const quizzesAttempted = topicData.quizzesAttempted || 0;
      const mastery = topicData.mastery || 0;
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
    
    // Calculate mastery from actual quiz results when available (same as progress page)
    const topicsProgressWithComputedMastery = topicsProgress.map(tp => {
      const topicResults = studentQuizResults.filter(q => q.topic === tp.topic);
      const quizzesAttempted = topicResults.length || tp.quizzesAttempted || 0;

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

      const status = quizzesAttempted > 0
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
    
    // Calculate metrics (same as progress page)
    const totalTopics = topicsProgressWithComputedMastery.length;
    const masteredTopics = topicsProgressWithComputedMastery.filter(topic => topic.mastery >= 80).length;
    
    // Calculate overall completion (same as progress page)
    let overallProgress = 0;
    if (totalTopics > 0) {
      const totalMastery = topicsProgressWithComputedMastery.reduce((sum, topic) => sum + topic.mastery, 0);
      overallProgress = Math.round(totalMastery / totalTopics);
    } else if (averageScore > 0) {
      overallProgress = averageScore;
    }
    
    // Apply topic filter if needed
    if (topicFilter !== "all") {
      const filteredTopic = topicsProgressWithComputedMastery.find(t => t.topic === topicFilter);
      if (filteredTopic) {
        overallProgress = filteredTopic.mastery;
      } else {
        overallProgress = 0;
      }
    }
    
    return {
      overallProgress,
      quizCount: completedQuizzes,
      averageScore,
      topicsMastered: masteredTopics,
      totalTopics
    };
  };

  const rankedStudents = useMemo(() => {
    let filteredStudents = [...allStudents];

    // Apply grade filter
    if (gradeFilter !== "all") {
        filteredStudents = filteredStudents.filter(s => s.gradeLevel === gradeFilter);
    }

    // Apply section filter
    if ((role === 'principal' || role === 'admin' || role === 'teacher') && sectionFilter !== "all") {
        filteredStudents = filteredStudents.filter(s => s.sectionId === sectionFilter);
    }
    
    // Apply teacher filter
    if (role === 'teacher' && currentUser) {
      filteredStudents = filteredStudents.filter(s => s.teacherId === currentUser.id);
    }

    // Calculate progress for each student
    const studentScores = filteredStudents.map(student => {
      const progress = calculateStudentProgress(student);
      
      console.log("Student progress:", {
        name: student.displayName,
        overallProgress: progress.overallProgress,
        quizCount: progress.quizCount,
        topicsMastered: progress.topicsMastered,
        totalTopics: progress.totalTopics,
        hasProgressData: !!student.progress
      });
      
      return { 
        ...student, 
        ...progress,
        masteryLevel: getMasteryLevel(progress.overallProgress),
      };
    });

    // Sort by overall progress descending
    const sortedStudents = studentScores.sort((a, b) => {
      if (b.overallProgress !== a.overallProgress) return b.overallProgress - a.overallProgress;
      if (b.topicsMastered !== a.topicsMastered) return b.topicsMastered - a.topicsMastered;
      if (b.quizCount !== a.quizCount) return b.quizCount - a.quizCount;
      return (a.displayName || a.username || "").localeCompare(b.displayName || b.username || "");
    });

    // Assign ranks
    return sortedStudents.map((student, index) => ({
        ...student,
        rank: index + 1,
    }));
  }, [allStudents, quizResults, gradeFilter, topicFilter, role, sectionFilter, currentUser]);
  
  const currentUserRanking = useMemo(() => {
      return rankedStudents.find(s => s.id === currentUser?.id);
  }, [rankedStudents, currentUser]);

  const canSeeFullName = role === 'admin' || role === 'teacher' || role === 'principal';

  const getTopicColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
      "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
      "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Trophy className="h-8 w-8" /> Progress Leaderboard
          </CardTitle>
          <CardDescription>
            See overall progress rankings based on the same calculations as your Progress page.
            <span className="block text-sm text-muted-foreground mt-1">
              <BarChart3 className="inline h-3 w-3 mr-1" />
              Rankings use the same "Overall Completion" calculation from My Progress page.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {currentUserRanking && (
        <Card className="bg-primary/10 border-primary shadow-lg ring-2 ring-primary/50">
            <CardHeader>
                 <CardTitle className="text-xl text-primary/90 flex items-center gap-2">
                    <Star className="h-6 w-6"/> Your Progress Ranking
                 </CardTitle>
                 <CardDescription>
                   Your overall progress: {currentUserRanking.overallProgress}% (same as My Progress page)
                 </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Overall Progress</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Quizzes</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Avg Score</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Topics</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-transparent hover:bg-primary/20">
                            <TableCell className="text-center font-bold text-2xl">{currentUserRanking.rank}</TableCell>
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={currentUserRanking.avatarUrl || undefined} alt={currentUserRanking.displayName || "Student"} />
                                  <AvatarFallback>{getInitials(currentUserRanking.displayName || currentUserRanking.username || "")}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p>{currentUserRanking.displayName}</p>
                                  {currentUserRanking.gradeLevel && (
                                    <p className="text-xs text-muted-foreground">{currentUserRanking.gradeLevel}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="space-y-1">
                                <div className="font-bold text-lg">{currentUserRanking.overallProgress}%</div>
                                <Progress value={currentUserRanking.overallProgress} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell">
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-medium">{currentUserRanking.quizCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell">
                              <div className="font-medium">
                                {currentUserRanking.averageScore}%
                              </div>
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell">
                              <div className="flex items-center justify-center gap-1">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{currentUserRanking.topicsMastered}/{currentUserRanking.totalTopics}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={
                                currentUserRanking.masteryLevel === 'Expert' ? 'default' :
                                currentUserRanking.masteryLevel === 'Advanced' ? 'secondary' :
                                currentUserRanking.masteryLevel === 'Proficient' ? 'outline' : 'secondary'
                              }>
                                {currentUserRanking.masteryLevel}
                              </Badge>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading progress rankings...</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Leaderboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          {/* Topics Display Section */}
          {teacherTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Filter by Topic
                </CardTitle>
                <CardDescription>
                  {topicFilter === "all" 
                    ? "Showing overall progress across all topics" 
                    : `Showing progress for topic: ${topicFilter}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={topicFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setTopicFilter("all")}
                  >
                    All Topics (Overall Progress)
                  </Badge>
                  {teacherTopics.map((topicItem, index) => (
                    <Badge 
                      key={topicItem.id}
                      variant={topicFilter === topicItem.topic ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${topicFilter === topicItem.topic ? '' : getTopicColor(index)}`}
                      onClick={() => setTopicFilter(topicItem.topic)}
                    >
                      {topicItem.topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard Section */}
          <Card>
            <CardHeader>
              <CardTitle>Class Progress Rankings</CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {rankedStudents.length} student{rankedStudents.length !== 1 ? 's' : ''} 
                  {topicFilter !== "all" ? ` showing progress for "${topicFilter}"` : ' showing overall progress'}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Filter by grade..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          <SelectItem value="Grade 7">Grade 7</SelectItem>
                          <SelectItem value="Grade 8">Grade 8</SelectItem>
                          <SelectItem value="Grade 9">Grade 9</SelectItem>
                          <SelectItem value="Grade 10">Grade 10</SelectItem>
                      </SelectContent>
                  </Select>
                  {(role === 'principal' || role === 'admin' || role === 'teacher') ? (
                      <Select value={sectionFilter} onValueChange={setSectionFilter}>
                          <SelectTrigger className="w-full sm:w-[240px]">
                              <SelectValue placeholder="Filter by section..." />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">All Sections</SelectItem>
                              {sections.map(section => (
                                  <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  ) : null}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Quizzes</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Avg Score</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Topics</TableHead>
                      <TableHead className="text-center">Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedStudents.length > 0 ? (
                      rankedStudents.map((student) => (
                        <TableRow key={student.id} className={student.id === currentUser?.id ? "bg-primary/5" : "hover:bg-muted/50"}>
                          <TableCell className="text-center font-bold text-lg">
                            <div className="flex items-center justify-center">
                              {student.rank <= 3 ? (
                                <span className="text-2xl">
                                  {student.rank === 1 ? "🥇" : student.rank === 2 ? "🥈" : "🥉"}
                                </span>
                              ) : (
                                <span>{student.rank}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={student.avatarUrl || undefined} alt={student.displayName || "Student"} />
                                <AvatarFallback>{getInitials(student.displayName || student.username || "")}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{canSeeFullName ? (student.displayName || student.username) : student.username}</p>
                                {canSeeFullName && student.gradeLevel && (
                                  <p className="text-xs text-muted-foreground">{student.gradeLevel}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="font-bold text-lg">{student.overallProgress}%</div>
                              <Progress value={student.overallProgress} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant={student.quizCount > 0 ? "outline" : "secondary"}>
                              {student.quizCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <div className="font-medium">
                              {student.averageScore}%
                            </div>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <div className="text-sm">
                              {student.topicsMastered}/{student.totalTopics}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              student.masteryLevel === 'Expert' ? 'default' :
                              student.masteryLevel === 'Advanced' ? 'secondary' :
                              student.masteryLevel === 'Proficient' ? 'outline' : 'secondary'
                            }>
                              {student.masteryLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-32">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No students found matching the filters</p>
                            <p className="text-sm text-muted-foreground">
                              Try changing grade, section, or topic filters
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
