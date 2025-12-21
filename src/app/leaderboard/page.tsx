"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Trophy, BookOpen } from "lucide-react";
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
  masteryLevel: 'Beginner' | 'Proficient' | 'Advanced' | 'Expert';
}

interface Section {
    id: string;
    name: string;
}

interface TopicProgressData {
  mastery: number;
  status: string;
  quizzesAttempted: number;
  [key: string]: any;
}

export default function LeaderboardPage() {
  const { user: currentUser, role } = useAuth();
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  useEffect(() => {
    setIsLoading(true);
    
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    
    let sectionsQuery;
    if (role === 'teacher' && currentUser) {
      sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", currentUser.id), orderBy("name"));
    } else if (role === 'principal' || role === 'admin') {
      sectionsQuery = query(collection(db, "sections"), orderBy("name"));
    }

    const unsubscribes: Array<() => void> = [];

    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setAllStudents(students);
    }, (err) => {
      console.error("Error fetching students:", err);
      setError("Failed to load student data.");
    });
    unsubscribes.push(unsubscribeStudents);
    
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

  // Medal emojis for top ranks
  const getRankMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= 10) return "🏅"; // Medal for ranks 4-10
    return null;
  };

  // Calculate student progress - USING EXACT SAME PROGRESS.MASTERY VALUES AS MY PROGRESS PAGE
  const calculateStudentProgress = (student: AppUser) => {
    // Get student's progress data - EXACT SAME DATA AS MY PROGRESS PAGE
    const firestoreProgress = student.progress || {};
    
    // Convert progress data to array format (EXACT SAME as My Progress page)
    const topicsProgress = Object.entries(firestoreProgress).map(([topicKey, data]) => {
      const topicData = data as TopicProgressData;
      // USE THE EXACT mastery VALUE FROM USER.PROGRESS (same as My Progress page)
      const mastery = topicData.mastery || 0;
      
      return {
        topic: topicKey,
        mastery,
      };
    });
    
    // CALCULATE OVERALL PROGRESS - EXACT SAME FORMULA AS MY PROGRESS PAGE
    let overallProgress = 0;
    const totalTopics = topicsProgress.length;
    
    if (totalTopics > 0) {
      // Sum all mastery values and divide by number of topics
      const totalMastery = topicsProgress.reduce((sum, topic) => sum + topic.mastery, 0);
      overallProgress = Math.round(totalMastery / totalTopics);
    }
    
    return {
      overallProgress,
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

    // Calculate progress for each student USING EXACT SAME PROGRESS DATA
    const studentScores = filteredStudents.map(student => {
      const progress = calculateStudentProgress(student);
      
      return { 
        ...student, 
        ...progress,
        masteryLevel: getMasteryLevel(progress.overallProgress),
      };
    });

    // Sort by overall progress descending
    const sortedStudents = studentScores.sort((a, b) => {
      if (b.overallProgress !== a.overallProgress) return b.overallProgress - a.overallProgress;
      return (a.displayName || a.username || "").localeCompare(b.displayName || b.username || "");
    });

    // Assign ranks
    return sortedStudents.map((student, index) => ({
        ...student,
        rank: index + 1,
    }));
  }, [allStudents, gradeFilter, role, sectionFilter, currentUser]);

  const canSeeFullName = role === 'admin' || role === 'teacher' || role === 'principal';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Trophy className="h-8 w-8" /> Progress Leaderboard
          </CardTitle>
          <CardDescription>
            Rankings based on the exact same overall progress calculation as My Progress page.
          </CardDescription>
        </CardHeader>
      </Card>

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
        <Card>
          <CardHeader>
            <CardTitle>Class Progress Rankings</CardTitle>
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
            <div className="text-sm text-muted-foreground mt-2">
              {rankedStudents.length} student{rankedStudents.length !== 1 ? 's' : ''} showing overall progress
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
                    <TableHead className="text-center">Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedStudents.length > 0 ? (
                    rankedStudents.map((student) => (
                      <TableRow key={student.id} className={student.id === currentUser?.id ? "bg-primary/5" : "hover:bg-muted/50"}>
                        <TableCell className="text-center font-bold text-lg">
                          <div className="flex items-center justify-center">
                            {getRankMedal(student.rank) || student.rank}
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
                      <TableCell colSpan={4} className="text-center h-32">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No students found matching the filters</p>
                          <p className="text-sm text-muted-foreground">
                            Try changing grade or section filters
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
      )}
    </div>
  );
}
