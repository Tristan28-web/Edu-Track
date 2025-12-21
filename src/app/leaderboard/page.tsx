"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trophy, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AppUser } from "@/types";
import { getInitials } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TopicProgressData {
  totalItems?: number;
  correctItems?: number;
  quizzesAttempted?: number;
}

interface RankedStudent extends AppUser {
  rank: number;
  overallProgress: number;
  masteryLevel: "Beginner" | "Proficient" | "Advanced" | "Expert";
}

export default function ProgressLeaderboardPage() {
  const { user: currentUser, role } = useAuth();
  const [allStudents, setAllStudents] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student")
    );

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const students = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as AppUser)
        );

        setAllStudents(students);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 🔥 Weighted topic-based mastery calculation (matches Progress page)
  const calculateStudentProgress = (student: AppUser): number => {
    const progress = student.progress || {};

    const topicMasteries: number[] = [];

    Object.values(progress).forEach((data) => {
      const topic = data as TopicProgressData;

      if (!topic.quizzesAttempted || topic.quizzesAttempted === 0) return;

      const totalItems = topic.totalItems || 0;
      const correctItems = topic.correctItems || 0;

      if (totalItems === 0) return;

      const mastery = (correctItems / totalItems) * 100;
      topicMasteries.push(mastery);
    });

    if (topicMasteries.length === 0) return 0;

    const total = topicMasteries.reduce((sum, m) => sum + m, 0);
    return Math.round(total / topicMasteries.length);
  };

  const getMasteryLevel = (score: number): RankedStudent["masteryLevel"] => {
    if (score >= 90) return "Expert";
    if (score >= 70) return "Advanced";
    if (score >= 50) return "Proficient";
    return "Beginner";
  };

  const rankedStudents = useMemo(() => {
    let students = [...allStudents];

    if (gradeFilter !== "all") {
      students = students.filter(
        (s) => s.gradeLevel === gradeFilter
      );
    }

    const withProgress = students.map((student) => {
      const overallProgress = calculateStudentProgress(student);
      return {
        ...student,
        overallProgress,
        masteryLevel: getMasteryLevel(overallProgress),
      };
    });

    return withProgress
      .sort((a, b) => b.overallProgress - a.overallProgress)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));
  }, [allStudents, gradeFilter]);

  const canSeeFullName =
    role === "admin" || role === "teacher" || role === "principal";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            Progress Leaderboard
          </CardTitle>
          <CardDescription>
            Rankings based on overall quiz mastery progress.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class Rankings</CardTitle>

          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="Grade 7">Grade 7</SelectItem>
              <SelectItem value="Grade 8">Grade 8</SelectItem>
              <SelectItem value="Grade 9">Grade 9</SelectItem>
              <SelectItem value="Grade 10">Grade 10</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead className="text-center">Level</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rankedStudents.length > 0 ? (
                rankedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-center font-bold">
                      {student.rank}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={student.avatarUrl} />
                          <AvatarFallback>
                            {getInitials(
                              student.displayName ||
                                student.username ||
                                ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {canSeeFullName
                              ? student.displayName || student.username
                              : student.username}
                          </p>
                          {canSeeFullName && (
                            <p className="text-xs text-muted-foreground">
                              {student.gradeLevel}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <p className="font-bold">
                          {student.overallProgress}%
                        </p>
                        <Progress
                          value={student.overallProgress}
                          className="h-2"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge>{student.masteryLevel}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32">
                    <BookOpen className="mx-auto mb-2 text-muted-foreground" />
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
