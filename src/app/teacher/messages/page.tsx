
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TeacherMessagesPage() {
    const { user: teacher, loading } = useAuth();
    const [students, setStudents] = useState<AppUser[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<AppUser | null>(null);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (loading) return;
        if (!teacher) {
            setError("You must be logged in to send messages.");
            setIsLoadingStudents(false);
            return;
        }

        if (teacher.role === 'teacher') {
            const fetchStudents = async () => {
                try {
                    const studentsQuery = query(
                        collection(db, 'users'),
                        where('teacherId', '==', teacher.id),
                        where('role', '==', 'student'),
                        orderBy('displayName', 'asc')
                    );
                    const studentsSnapshot = await getDocs(studentsQuery);
                    const studentList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
                    setStudents(studentList);
                    if (studentList.length > 0) {
                        setSelectedStudent(studentList[0]);
                    }
                } catch (err) {
                    console.error("Error fetching students:", err);
                    setError("Failed to load your student list.");
                } finally {
                    setIsLoadingStudents(false);
                }
            };
            fetchStudents();
        } else {
             setError("You must be a teacher to access this page.");
             setIsLoadingStudents(false);
        }
    }, [teacher, loading]);

    if (loading || isLoadingStudents) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-[calc(100vh-5rem)]">
             <Card className="shadow-lg mb-4 flex-shrink-0">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                        <MessageSquare className="h-8 w-8" /> Messages
                    </CardTitle>
                    <CardDescription>
                        Communicate directly with your students. Select a student to start a conversation.
                    </CardDescription>
                </CardHeader>
            </Card>
            <div className="flex-grow min-h-0 md:grid md:grid-cols-4 gap-6">
                <Card className="md:col-span-1 flex flex-col mb-4 md:mb-0">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5"/> Your Students</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-grow">
                         <CardContent className="pt-0">
                            {students.length > 0 ? (
                                <div className="space-y-1">
                                    {students.map(student => (
                                        <Button
                                            key={student.id}
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start text-left h-auto py-2",
                                                selectedStudent?.id === student.id && "bg-accent text-accent-foreground"
                                            )}
                                            onClick={() => setSelectedStudent(student)}
                                        >
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4" />
                                              <div className="flex flex-col">
                                                <span>{student.displayName}</span>
                                                <span className="text-xs text-muted-foreground">{student.sectionName}</span>
                                              </div>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 text-center">No students assigned to you.</p>
                            )}
                        </CardContent>
                    </ScrollArea>
                </Card>
                <div className="md:col-span-3">
                    {teacher && selectedStudent ? (
                        <ChatInterface currentUser={teacher} otherUser={selectedStudent} />
                    ) : (
                         <div className="h-full flex flex-col items-center justify-center bg-card rounded-lg min-h-64">
                            <MessageSquare className="h-16 w-16 text-muted-foreground/50"/>
                            <p className="mt-4 text-muted-foreground">
                                {students.length > 0 ? "Select a student to view messages" : "No students to message"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
