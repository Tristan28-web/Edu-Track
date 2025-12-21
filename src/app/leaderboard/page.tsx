"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, QuizResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, Trophy, Star } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mathTopics } from "@/config/topics";

interface RankedStudent extends AppUser {
  rank: number;
  overallProgress: number;
  masteryLevel: 'Beginner' | 'Proficient' | 'Advanced' | 'Expert';
}

interface Section {
    id: string;
    name: string;
}

export default function LeaderboardPage() {
  const { user: currentUser, role } = useAuth();
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
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
    const resultsQuery = query(collection(db, "quizResults"));
    
    let sectionsQuery;
    if (role === 'teacher' && currentUser) {
      sectionsQuery = query(collection(db, "sections"), where("teacherId", "==", currentUser.id), orderBy("name"));
    } else if (role === 'principal' || role === 'admin') {
      sectionsQuery = query(collection(db, "sections"), orderBy("name"));
    }

    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    }, (err) => {
      console.error("Error fetching students:", err);
      setError("Failed to load student data.");
    });
    
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
        setQuizResults(snapshot.docs.map(doc => doc.data() as QuizResult));
        if (role !== 'principal' && role !== 'admin' && role !== 'teacher') setIsLoading(false);
    }, (err) => {
        console.error("Error fetching quiz results:", err);
        setError("Failed to load quiz results data.");
        setIsLoading(false);
    });
    
    let unsubscribeSections = () => {};
    if (sectionsQuery) {
        unsubscribeSections = onSnapshot(sectionsQuery, (snapshot) => {
            setSections(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
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
        unsubscribeSections();
    };
  }, [role, currentUser]);
  
  const getMasteryLevel = (score: number): RankedStudent['masteryLevel'] => {
      if (score >= 90) return 'Expert';
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
    
    if (role === 'teacher' && currentUser) {
      filteredStudents = filteredStudents.filter(s => s.teacherId === currentUser.id);
    }

    const studentScores = filteredStudents.map(student => {
        const studentResults = quizResults.filter(r => r.studentId === student.id);
        const topicMastery: { [key: string]: number } = {};

        mathTopics.forEach(topic => {
          const topicResults = studentResults.filter(r => r.topic === topic.slug);
          if (topicResults.length > 0) {
            const totalScore = topicResults.reduce((acc, r) => acc + r.score, 0);
            const totalPossible = topicResults.reduce((acc, r) => acc + r.total, 0);
            topicMastery[topic.slug] = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
          } else {
            topicMastery[topic.slug] = 0;
          }
        });

        const totalMastery = Object.values(topicMastery).reduce((acc, val) => acc + val, 0);
        const overallProgress = mathTopics.length > 0 ? Math.round(totalMastery / mathTopics.length) : 0;
        
        return { ...student, overallProgress };
    });

    return studentScores
      .sort((a, b) => b.overallProgress - a.overallProgress)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
        masteryLevel: getMasteryLevel(student.overallProgress),
      }));
  }, [allStudents, quizResults, gradeFilter, role, sectionFilter, currentUser]);
  
  const currentUserRanking = useMemo(() => {
      return rankedStudents.find(s => s.id === currentUser?.id);
  }, [rankedStudents, currentUser]);

  const canSeeFullName = role === 'admin' || role === 'teacher' || role === 'principal';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Trophy className="h-8 w-8" /> Leaderboard
          </CardTitle>
          <CardDescription>
            See how you rank against other students based on overall progress.
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
                        <TableHead className="text-center w-48">Overall Progress</TableHead>
                        <TableHead className="text-center">Mastery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-transparent hover:bg-primary/20">
                            <TableCell className="text-center font-bold text-2xl">{currentUserRanking.rank}</TableCell>
                            <TableCell className="font-semibold">{currentUserRanking.displayName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={currentUserRanking.overallProgress} className="w-full h-3" />
                                <span className="font-bold text-lg">{currentUserRanking.overallProgress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{currentUserRanking.masteryLevel}</TableCell>
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
        <Card>
          <CardHeader>
            <CardTitle>Class Rankings</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 py-4">
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
                {(role === 'principal' || role === 'admin' || role === 'teacher') && (
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
                )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center w-48">Overall Progress</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Mastery</TableHead>
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
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Progress value={student.overallProgress} className="w-full h-3" />
                                <span className="font-bold text-lg">{student.overallProgress}%</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">{student.masteryLevel}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        No students found matching the filters.
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
