"use client";

import { useAuth } from '@/contexts/AuthContext';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare, User, Mail, Phone, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StudentMessagesPage() {
    const { user: student, loading } = useAuth();
    const [teacher, setTeacher] = useState<AppUser | null>(null);
    const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).join("").toUpperCase();
    };

    useEffect(() => {
        if (loading) return;
        if (!student) {
            setError("You must be logged in to view messages.");
            setIsLoadingTeacher(false);
            return;
        }

        if (student.role === 'student' && student.teacherId) {
            const fetchTeacher = async () => {
                try {
                    const teacherDocRef = doc(db, 'users', student.teacherId!);
                    const teacherDocSnap = await getDoc(teacherDocRef);
                    if (teacherDocSnap.exists()) {
                        setTeacher({ id: teacherDocSnap.id, ...teacherDocSnap.data() } as AppUser);
                    } else {
                        setError("Your assigned teacher could not be found.");
                    }
                } catch (err) {
                    console.error("Error fetching teacher:", err);
                    setError("Failed to load your teacher's information.");
                } finally {
                    setIsLoadingTeacher(false);
                }
            };
            fetchTeacher();
        } else {
            setError("You are not assigned to a teacher and cannot send messages.");
            setIsLoadingTeacher(false);
        }
    }, [student, loading]);

    if (loading || isLoadingTeacher) {
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
                        Communicate directly with your teacher: {teacher?.displayName || '...'}
                    </CardDescription>
                </CardHeader>
            </Card>
            <div className="flex-grow min-h-0 md:grid md:grid-cols-4 gap-6">
                <div className="md:col-span-1 flex flex-col gap-6 mb-4 md:mb-0">
                  <Card className="flex flex-col">
                      <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5"/> Teacher's Profile</CardTitle>
                      </CardHeader>
                      <ScrollArea className="flex-grow">
                          <CardContent className="pt-0">
                              {teacher ? (
                                <div className="flex flex-col items-center text-center gap-4">
                                      <Avatar className="h-20 w-20 text-2xl">
                                          <AvatarImage src={teacher.displayName || undefined} alt={teacher.displayName || 'Teacher'} />
                                          <AvatarFallback>{getInitials(teacher.displayName)}</AvatarFallback>
                                      </Avatar>
                                      <div className="space-y-1">
                                          <p className="font-semibold text-xl">{teacher.displayName}</p>
                                          <p className="text-sm text-muted-foreground">@{teacher.username}</p>
                                      </div>
                                      <div className="space-y-2 text-left w-full pt-4 border-t">
                                          <div className="flex items-center gap-2 text-sm">
                                              <Mail className="h-4 w-4 text-muted-foreground"/>
                                              <span>{teacher.email}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm">
                                              <Phone className="h-4 w-4 text-muted-foreground"/>
                                              <span>{teacher.contactNumber || 'Not available'}</span>
                                          </div>
                                      </div>
                                </div>
                              ) : (
                                  <p className="text-sm text-muted-foreground p-4 text-center">No teacher assigned to you.</p>
                              )}
                          </CardContent>
                      </ScrollArea>
                  </Card>
                </div>
                <div className="md:col-span-3">
                    {student && teacher ? (
                        <ChatInterface currentUser={student} otherUser={teacher} />
                    ) : (
                         <div className="h-full flex flex-col items-center justify-center bg-card rounded-lg min-h-64">
                            <MessageSquare className="h-16 w-16 text-muted-foreground/50"/>
                            <p className="mt-4 text-muted-foreground">
                                {error ? "Could not load conversation" : "No teacher assigned"}
                            </p>
                            {error && (
                                <Alert variant="destructive" className="mt-4">
                                   <AlertTitle>Error</AlertTitle>
                                   <AlertDescription>{error}</AlertDescription>
                               </Alert>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
