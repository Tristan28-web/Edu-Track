"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, QuizResult, CourseContentItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Trophy, Star, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedbackColumn } from "@/components/leaderboard/FeedbackColumn";
import { Badge } from "@/components/ui/badge";

interface RankedStudent extends AppUser {
  rank: number;
  score: number;
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
      where("role", "==", "student"),
      orderBy("totalPoints", "desc")
    );
    
    // Real-time listener for all quiz results (for all users)
    const resultsQuery = query(collection(db, "quizResults"));
    
    let sectionsQuery;
    if (role === 'teacher' && currentUser) {
      sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", currentUser.id), orderBy("name"));
    } else if (role === 'principal' || role === 'admin') {
      sectionsQuery = query(collection(db, "sections"), orderBy("name"));
    }

    // Real-time listener for course content to get teacher topics
    const topicsQuery = query(
      collection(db, "courseContent"),
      where("contentType", "in", ["quiz", "lessonMaterial"])
    );

    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    }, (err) => {
      console.error("Error fetching students:", err);
      setError("Failed to load student data.");
    });
    
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
        setQuizResults(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as QuizResult)));
    }, (err) => {
        console.error("Error fetching quiz results:", err);
        setError("Failed to load quiz results data.");
    });
    
    const unsubscribeTopics = onSnapshot(topicsQuery, async (snapshot) => {
      const topicsData: TeacherTopic[] = [];
      const uniqueTopics = new Set<string>();
      
      for (const doc of snapshot.docs) {
        const content = doc.data() as CourseContentItem;
        if (content.topic) {
          // Add topic if it's not already in the set
          if (!uniqueTopics.has(content.topic)) {
            uniqueTopics.add(content.topic);
            
            // Get teacher info for each topic
            let teacherName = "Unknown Teacher";
            if (content.teacherId) {
              try {
                const teacherDoc = await getDoc(doc(db, "users", content.teacherId));
                if (teacherDoc.exists()) {
                  const teacherData = teacherDoc.data() as AppUser;
                  teacherName = teacherData.displayName || teacherData.username || "Unknown Teacher";
                }
              } catch (err) {
                console.error("Error fetching teacher data:", err);
              }
            }
            
            topicsData.push({
              id: doc.id,
              topic: content.topic,
              teacherId: content.teacherId || "",
              teacherName
            });
          }
        }
      }
      
      // Sort topics alphabetically
      topicsData.sort((a, b) => a.topic.localeCompare(b.topic));
      setTeacherTopics(topicsData);
    }, (err) => {
      console.error("Error fetching topics:", err);
    });
    
    let unsubscribeSections = () => {};
    if (sectionsQuery) {
        unsubscribeSections = onSnapshot(sectionsQuery, (snapshot) => {
            setSections(snapshot.docs.map(doc => ({ 
              id: doc.id, 
              name: doc.data().name 
            })));
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching sections:", err);
            setError("Failed to load sections data.");
            setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
        unsubscribeStudents();
        unsubscribeResults();
        unsubscribeTopics();
        unsubscribeSections();
    };
  }, [role, currentUser]);
  
  const getMasteryLevel = (score: number): RankedStudent['masteryLevel'] => {
      if (score >= 95) return 'Expert';
      if (score >= 75) return 'Advanced';
      if (score >= 50) return 'Proficient';
      return 'Beginner';
  };

  const rankedStudents = useMemo(() => {
    let filteredStudents = allStudents;

    if (gradeFilter !== "all") {
        filteredStudents = filteredStudents.filter(s => s.gradeLevel === gradeFilter);
    }

    if ((role === 'principal' || role === 'admin' || role === 'teacher') && sectionFilter !== "all") {
        filteredStudents = filteredStudents.filter(s => s.sectionId === sectionFilter);
    }
    
    // Only filter by teacher if role is teacher
    if (role === 'teacher' && currentUser) {
      filteredStudents = filteredStudents.filter(s => s.teacherId === currentUser.id);
    }

    const studentScores = filteredStudents.map(student => {
        const relevantResults = quizResults.filter(r => 
            r.studentId === student.id &&
            (topicFilter === "all" || r.topic === topicFilter)
        );
        
        if(relevantResults.length === 0) {
            return { ...student, score: 0 };
        }
        
        const totalScore = relevantResults.reduce((acc, r) => acc + r.score, 0);
        const totalPossible = relevantResults.reduce((acc, r) => acc + r.total, 0);
        const averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
        
        return { ...student, score: averageScore };
    });

    return studentScores
      .sort((a, b) => b.score - a.score)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
        masteryLevel: getMasteryLevel(student.score),
      }));
  }, [allStudents, quizResults, gradeFilter, topicFilter, role, sectionFilter, currentUser]);
  
  const currentUserRanking = useMemo(() => {
      return rankedStudents.find(s => s.id === currentUser?.id);
  }, [rankedStudents, currentUser]);

  const canSeeFullName = role === 'admin' || role === 'teacher' || role === 'principal';

  // Helper function to get a color based on topic index
  const getTopicColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-green-100 text-green-800 border-green-200",
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
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
            See how you rank against other students based on overall quiz performance.
          </CardDescription>
        </CardHeader>
      </Card>

      {currentUserRanking && (
        <Card className="bg-primary/10 border-primary shadow-lg ring-2 ring-primary/50">
            <CardHeader>
                 <CardTitle className="text-xl text-primary/90 flex items-center gap-2">
                    <Star className="h-6 w-6"/> Your Rank
                 </CardTitle>
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
                            <TableCell className="text-center font-bold text-lg">{currentUserRanking.score}%</TableCell>
                            <TableCell className="text-center font-semibold">{currentUserRanking.masteryLevel}</TableCell>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Available Topics
              </CardTitle>
              <CardDescription>
                Topics created by teachers. Select a topic to filter leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teacherTopics.length > 0 ? (
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
                      className={`cursor-pointer hover:opacity-80 transition-all ${topicFilter === topicItem.topic ? '' : getTopicColor(index)}`}
                      onClick={() => setTopicFilter(topicItem.topic)}
                    >
                      {topicItem.topic}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No topics available yet. Teachers need to create content first.</p>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard Section */}
          <Card>
            <CardHeader>
              <CardTitle>Class Rankings</CardTitle>
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
                      <TableHead className="text-center hidden md:table-cell">Mastery</TableHead>
                      <TableHead className="hidden lg:table-cell">Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedStudents.length > 0 ? (
                      rankedStudents.map((student) => (
                        <TableRow key={student.id} className={student.id === currentUser?.id ? "hidden" : ""}>
                          <TableCell className="text-center font-bold text-lg">{student.rank}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={student.avatarUrl || undefined} alt={student.displayName || "Student"} />
                                <AvatarFallback>{getInitials(student.displayName || "")}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{canSeeFullName ? student.displayName : student.username}</p>
                                {canSeeFullName && student.gradeLevel && (
                                  <p className="text-xs text-muted-foreground">{student.gradeLevel}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-lg">{student.score}%</TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant={
                              student.masteryLevel === 'Expert' ? 'default' :
                              student.masteryLevel === 'Advanced' ? 'secondary' :
                              student.masteryLevel === 'Proficient' ? 'outline' : 'secondary'
                            }>
                              {student.masteryLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell"><FeedbackColumn score={student.score} /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          No students found matching the filters.
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
