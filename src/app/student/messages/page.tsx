
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/types';

export default function StudentMessagesPage() {
    const { user, loading } = useAuth();
    const [teacher, setTeacher] = useState<AppUser | null>(null);
    const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            setError("You must be logged in to send messages.");
            setIsLoadingTeacher(false);
            return;
        }

        if (user.role === 'student' && user.teacherId) {
            const fetchTeacher = async () => {
                try {
                    const teacherDocRef = doc(db, 'users', user.teacherId!);
                    const teacherDocSnap = await getDoc(teacherDocRef);
                    if (teacherDocSnap.exists()) {
                        setTeacher({ id: teacherDocSnap.id, ...teacherDocSnap.data() } as AppUser);
                    } else {
                        setError("Your assigned teacher could not be found.");
                    }
                } catch (err) {
                    console.error("Error fetching teacher:", err);
                    setError("Failed to load teacher information.");
                } finally {
                    setIsLoadingTeacher(false);
                }
            };
            fetchTeacher();
        } else {
             setError("You are not assigned to a teacher, so messaging is unavailable.");
             setIsLoadingTeacher(false);
        }
    }, [user, loading]);

    if (loading || isLoadingTeacher) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                            <MessageSquare className="h-8 w-8" /> Messages
                        </CardTitle>
                        <CardDescription>
                            Communicate directly with your teacher.
                        </CardDescription>
                    </CardHeader>
                </Card>
                <Alert variant="destructive">
                    <AlertTitle>Messaging Unavailable</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
             <Card className="shadow-lg mb-4 flex-shrink-0">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                        <MessageSquare className="h-8 w-8" /> Messages
                    </CardTitle>
                    <CardDescription>
                        Your conversation with your teacher, {teacher?.displayName || 'N/A'}.
                    </CardDescription>
                </CardHeader>
            </Card>
            <div className="flex-grow min-h-0">
                 {user && teacher && (
                    <ChatInterface currentUser={user} otherUser={teacher} />
                )}
            </div>
        </div>
    );
}
