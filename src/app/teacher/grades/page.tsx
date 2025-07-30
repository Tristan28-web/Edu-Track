
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import type { AppUser, CourseContentItem, GradeResult, UserProgressTopic } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, GraduationCap, RefreshCw, CheckSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { mathTopics } from '@/config/topics';

const GRADING_PERIODS = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"] as const;
type GradingPeriod = typeof GRADING_PERIODS[number];
const QUARTER_KEYS = {
    "1st Quarter": 'q1',
    "2nd Quarter": 'q2',
    "3rd Quarter": 'q3',
    "4th Quarter": 'q4',
} as const;

const gpaScale = [
    { range: [97, 100], gpa: 4.0 }, { range: [93, 96], gpa: 3.7 }, { range: [90, 92], gpa: 3.3 },
    { range: [87, 89], gpa: 3.0 }, { range: [83, 86], gpa: 2.7 }, { range: [80, 82], gpa: 2.3 },
    { range: [77, 79], gpa: 2.0 }, { range: [73, 76], gpa: 1.7 }, { range: [70, 72], gpa: 1.3 },
    { range: [67, 69], gpa: 1.0 }, { range: [0, 66], gpa: 0.0 },
];

const convertToGpa = (percentage: number | null) => {
    if (percentage === null) return 0;
    const scale = gpaScale.find(s => percentage >= s.range[0] && percentage <= s.range[1]);
    return scale ? scale.gpa : 0.0;
};

interface StudentGradeSummary {
    id: string;
    name: string;
    finalPercentage: number | null;
    gpa: number | null;
    isEnded: boolean;
}

export default function TeacherGradesPage() {
    const { user: teacher, loading: authLoading } = useAuth();
    const [allStudents, setAllStudents] = useState<AppUser[]>([]);
    const [allQuizzes, setAllQuizzes] = useState<CourseContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading || !teacher) return;

        const studentsQuery = query(collection(db, 'users'), where('teacherId', '==', teacher.id), where('role', '==', 'student'));
        const quizzesQuery = query(collection(db, 'courseContent'), where('teacherId', '==', teacher.id), where('contentType', '==', 'quiz'));

        const unSubStudents = onSnapshot(studentsQuery, (snapshot) => {
            setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
            if (isLoading) setIsLoading(false);
        }, (err) => {
            console.error("Error fetching students:", err);
            setError("Could not load student data.");
            setIsLoading(false);
        });

        const unSubQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
            setAllQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem)));
        }, (err) => {
            console.error("Error fetching quizzes:", err);
            setError("Could not load quiz data.");
        });

        return () => {
            unSubStudents();
            unSubQuizzes();
        };

    }, [teacher, authLoading, isLoading]);

    const studentSummariesByQuarter: Record<GradingPeriod, StudentGradeSummary[]> = useMemo(() => {
        const summaries: Record<string, StudentGradeSummary[]> = {};
        for (const period of GRADING_PERIODS) {
            summaries[period] = allStudents.map(student => {
                const quarterKey = QUARTER_KEYS[period];
                const quizzesForPeriod = allQuizzes.filter(q => q.gradingPeriod === period);
                
                let totalCorrect = 0;
                let totalPossible = 0;
                
                quizzesForPeriod.forEach(quiz => {
                    const progress = student.progress?.[quiz.topic];
                    if (progress?.status === 'Completed' && progress.lastQuizTotal) {
                        totalCorrect += progress.lastQuizCorrect ?? 0;
                        totalPossible += progress.lastQuizTotal;
                    }
                });

                const finalPercentage = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : null;
                const gpa = convertToGpa(finalPercentage);
                const isEnded = student.quarterStatus?.[quarterKey] || false;

                return { id: student.id, name: student.displayName || "Unnamed Student", finalPercentage, gpa, isEnded };
            });
        }
        return summaries as Record<GradingPeriod, StudentGradeSummary[]>;
    }, [allStudents, allQuizzes]);

    const handleBulkQuarterAction = async (period: GradingPeriod, action: 'end' | 'reopen') => {
        if (allStudents.length === 0) return;
        setIsUpdating(true);
        const quarterKey = QUARTER_KEYS[period];
        const newStatus = action === 'end';
        const actionText = newStatus ? 'ended' : 'reopened';
        
        try {
            const batch = writeBatch(db);
            allStudents.forEach(student => {
                const studentRef = doc(db, 'users', student.id);
                batch.update(studentRef, { [`quarterStatus.${quarterKey}`]: newStatus });
            });
            await batch.commit();
            toast({ title: "Success", description: `The ${period} has been ${actionText} for all students.` });
        } catch (err: any) {
            console.error("Bulk action failed:", err);
            toast({ title: "Error", description: `Could not ${action} the quarter.`, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    return (
        <div className="space-y-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                        <GraduationCap className="h-8 w-8" /> Finalize Grades
                    </CardTitle>
                    <CardDescription>
                        Review and finalize grades for each quarter. Ending a quarter will calculate and display the final GPA for students.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="1st Quarter" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    {GRADING_PERIODS.map(period => <TabsTrigger key={period} value={period}>{period}</TabsTrigger>)}
                </TabsList>
                {GRADING_PERIODS.map(period => {
                    const summaries = studentSummariesByQuarter[period];
                    const isAnyStudentEnded = summaries.some(s => s.isEnded);
                    return (
                        <TabsContent key={period} value={period}>
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <CardTitle>{period} Summary</CardTitle>
                                            <CardDescription>Final grades for all students in this quarter.</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleBulkQuarterAction(period, 'reopen')} disabled={isUpdating || !isAnyStudentEnded} variant="outline">
                                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />} Reopen All
                                            </Button>
                                            <Button onClick={() => handleBulkQuarterAction(period, 'end')} disabled={isUpdating}>
                                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckSquare className="mr-2 h-4 w-4" />} End Quarter for All
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead className="text-right">Final Average (%)</TableHead>
                                                <TableHead className="text-right">Final GPA</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {summaries.length > 0 ? summaries.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell className="text-right font-semibold">{student.finalPercentage !== null ? `${student.finalPercentage}%` : 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-semibold">{student.gpa !== null ? student.gpa.toFixed(2) : 'N/A'}</TableCell>
                                                    <TableCell className="text-center font-semibold">
                                                        {student.isEnded ? 
                                                            <span className="text-green-600">Ended</span> : 
                                                            <span className="text-yellow-600">Ongoing</span>
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No students found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div>
    );
}

