"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, QuizResult, CourseContentItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Trophy, Star, BookOpen, Target } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedbackColumn } from "@/components/leaderboard/FeedbackColumn";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface RankedStudent extends AppUser {
  rank: number;
  score: number;
  quizCount: number;
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

    const topicsQuery = query(
      collection(db, "courseContent")
    );

    const unsubscribes: Array<() => void> = [];

    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setAllStudents(students);
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
    
    // Set loading to false after initial load
    setTimeout(() => setIsLoading(false), 1000);

    return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [role, currentUser]);
  
  const getMasteryLevel = (score: number): RankedStudent['masteryLevel'] => {
      if (score >= 95) return 'Expert';
      if (score >= 75) return 'Advanced';
      if (score >= 50) return 'Proficient';
      return 'Beginner';
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

    const studentScores = filteredStudents.map(student => {
        // Get ALL quiz results for this student
        const allStudentResults = quizResults.filter(r => r.studentId === student.id);
        
        // FILTER OUT QUIZZES WITH 0% SCORE OR 0 CORRECT ANSWERS
        const validResults = allStudentResults.filter(r => {
          // Check if quiz has a valid score (greater than 0%)
          const percentage = (r.score || 0) / (r.total || 1) * 100;
          return percentage > 0;
        });
        
        // If topic filter is not "all", filter by topic
        const relevantResults = topicFilter === "all" 
          ? validResults  // Use validResults instead of allStudentResults
          : validResults.filter(r => r.topic === topicFilter);
        
        let score = 0;
        let quizCount = relevantResults.length;
        
        if (relevantResults.length > 0) {
            const totalScore = relevantResults.reduce((acc, r) => acc + (r.score || 0), 0);
            const totalPossible = relevantResults.reduce((acc, r) => acc + (r.total || 1), 0);
            score = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
        }
        
        return { 
          ...student, 
          score, 
          quizCount,
          totalQuizzes: allStudentResults.length, // Total including 0% ones
        };
    });

    // Sort by score descending, then by name for tie-breaking
    const sortedStudents = studentScores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.displayName || a.username || "").localeCompare(b.displayName || b.username || "");
    });

    // Assign ranks
    return sortedStudents.map((student, index) => ({
        ...student,
        rank: index + 1,
        masteryLevel: getMasteryLevel(student.score),
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
            <Trophy className="h-8 w-8" /> Leaderboard
          </CardTitle>
          <CardDescription>
            See how you rank against other students based on quiz performance. 
            <span className="block text-sm text-muted-foreground mt-1">
              <Target className="inline h-3 w-3 mr-1" />
              Note: Quizzes with 0% score are excluded from calculations.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {currentUserRanking && (
        <Card className="bg-primary/10 border-primary shadow-lg ring-2 ring-primary/50">
            <CardHeader>
                 <CardTitle className="text-xl text-primary/90 flex items-center gap-2">
                    <Star className="h-6 w-6"/> Your Rank
                 </CardTitle>
                 <CardDescription>
                   {currentUserRanking.totalQuizzes > currentUserRanking.quizCount ? (
                     <span className="text-sm">
                       {currentUserRanking.totalQuizzes - currentUserRanking.quizCount} quiz(zes) excluded (0% score)
                     </span>
                   ) : null}
                 </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Mastery</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-transparent hover:bg-primary/20">
                            <TableCell className="text-center font-bold text-2xl">{currentUserRanking.rank}</TableCell>
                            <TableCell className="font-semibold">{currentUserRanking.displayName}</TableCell>
                            <TableCell className="text-center">
                              <div className="font-bold text-lg">{currentUserRanking.score}%</div>
                              {currentUserRanking.quizCount > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Based on {currentUserRanking.quizCount} valid quiz{currentUserRanking.quizCount !== 1 ? 'zes' : ''}
                                </div>
                              )}
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
                            <TableCell><FeedbackColumn score={currentUserRanking.score} /></TableCell>
                        </TableRow>
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading leaderboard...</span>
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
                    ? "Showing all topics" 
                    : `Showing results for: ${topicFilter}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={topicFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setTopicFilter("all")}
                  >
                    All Topics
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
              <CardTitle>Class Rankings</CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {rankedStudents.length} student{rankedStudents.length !== 1 ? 's' : ''} showing
                  {topicFilter !== "all" && ` for topic "${topicFilter}"`}
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
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Valid Quizzes</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Mastery</TableHead>
                      <TableHead className="hidden lg:table-cell">Progress</TableHead>
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
                            <div className="font-bold text-lg">{student.score}%</div>
                            {student.quizCount > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                {student.quizCount} valid quiz{student.quizCount !== 1 ? 'zes' : ''}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                No valid quizzes
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant={student.quizCount > 0 ? "outline" : "secondary"}>
                              {student.quizCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant={
                              student.masteryLevel === 'Expert' ? 'default' :
                              student.masteryLevel === 'Advanced' ? 'secondary' :
                              student.masteryLevel === 'Proficient' ? 'outline' : 'secondary'
                            }>
                              {student.masteryLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="space-y-1">
                              <Progress value={student.score} className="h-2" />
                              <FeedbackColumn score={student.score} compact />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32">
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
