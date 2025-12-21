"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Trophy, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AppUser } from '@/types';
import { getInitials } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const UNLOCK_MASTERY_THRESHOLD = 75;

interface TopicProgressData {
  mastery: number;
  status: string;
  quizzesAttempted: number;
  [key: string]: any;
}

interface RankedStudent extends AppUser {
  rank: number;
  overallProgress: number;
  masteryLevel: 'Beginner' | 'Proficient' | 'Advanced' | 'Expert';
}

export default function ProgressLeaderboardPage() {
  const { user: currentUser, role } = useAuth();
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    setIsLoading(true);
    
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Query all students
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student")
    );

    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      if (!isMounted) return;
      
      const students = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as AppUser));
      
      setAllStudents(students);
      setIsLoading(false);
    }, (err) => {
      if (!isMounted) return;
      console.error("Error fetching students:", err);
      setError(`Failed to load student data: ${err.message}`);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeStudents();
    };
  }, [currentUser]);

  // Calculate overall progress for each student - EXACT SAME as My Progress page
  const calculateStudentProgress = (student: AppUser) => {
    const firestoreProgress = student.progress || {};
    
    // Convert progress data to array format (EXACT SAME as My Progress page)
    const topicsProgress = Object.entries(firestoreProgress).map(([topicKey, data]) => {
      const topicData = data as TopicProgressData;
      const quizzesAttempted = topicData.quizzesAttempted || 0;
      const mastery = topicData.mastery || 0;
      
      return {
        topic: topicKey, 
        mastery,
        quizzesAttempted,
      };
    });

    // CALCULATE OVERALL COMPLETION - EXACT SAME FORMULA AS MY PROGRESS PAGE
    let overallCompletion = 0;
    const totalTopics = topicsProgress.length;
    
    if (totalTopics > 0) {
      overallCompletion = Math.round(
        topicsProgress.reduce((sum, topic) => sum + topic.mastery, 0) /
          totalTopics
      );
    }
    
    return overallCompletion;
  };

  // Get mastery level based on overall progress
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
    if (rank <= 10) return "🏅";
    return null;
  };

  // Calculate ranked students
  const rankedStudents = useMemo(() => {
    let filteredStudents = [...allStudents];

    // Apply grade filter
    if (gradeFilter !== "all") {
      filteredStudents = filteredStudents.filter(s => s.gradeLevel === gradeFilter);
    }

    // Calculate progress for each student and add rank
    const studentsWithProgress = filteredStudents.map(student => {
      const overallProgress = calculateStudentProgress(student);
      
      return {
        ...student,
        overallProgress,
        masteryLevel: getMasteryLevel(overallProgress),
      };
    });

    // Sort by overall progress descending
    const sortedStudents = studentsWithProgress.sort((a, b) => {
      if (b.overallProgress !== a.overallProgress) return b.overallProgress - a.overallProgress;
      return (a.displayName || a.username || "").localeCompare(b.displayName || b.username || "");
    });

    // Assign ranks
    return sortedStudents.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
  }, [allStudents, gradeFilter]);

  const canSeeFullName = role === 'admin' || role === 'teacher' || role === 'principal';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Class Progress Rankings</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Grade 7" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grade Levels</SelectItem>
                <SelectItem value="Grade 7">Grade 7</SelectItem>
                <SelectItem value="Grade 8">Grade 8</SelectItem>
                <SelectItem value="Grade 9">Grade 9</SelectItem>
                <SelectItem value="Grade 10">Grade 10</SelectItem>
              </SelectContent>
            </Select>
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
                          Try changing the grade level filter
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
    </div>
  );
}
