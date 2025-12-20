
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, query, where, orderBy, onSnapshot, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { AppUser, CourseContentItem, TeacherActivity, QuizDetails } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, User, BookOpenCheck, Library, Activity, ArrowLeft, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { mathTopics } from '@/config/topics';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const getTopicTitle = (slug: string | undefined): string => {
    if (!slug) return "N/A";
    const topic = mathTopics.find(t => t.slug === slug);
    return topic?.title || slug;
};

const PAGE_SIZE = 10;

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = typeof params.id === 'string' ? params.id : "";
  const reportRef = useRef<HTMLDivElement>(null);

  const [teacher, setTeacher] = useState<AppUser | null>(null);
  const [quizzes, setQuizzes] = useState<CourseContentItem[]>([]);
  const [resources, setResources] = useState<CourseContentItem[]>([]);
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const handleDownloadPdf = async () => {
    const elementToCapture = reportRef.current;
    if (!elementToCapture || !teacher) return;

    setIsDownloading(true);
    
    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    captureContainer.style.top = '-9999px';
    captureContainer.style.left = '0';
    document.body.appendChild(captureContainer);

    const clonedElement = elementToCapture.cloneNode(true) as HTMLDivElement;
    clonedElement.style.backgroundColor = 'white';
    
    // Remove filters from clone
    const filters = clonedElement.querySelector('#activity-filters');
    if (filters) {
        filters.remove();
    }
    
    clonedElement.style.width = '800px'; 
    captureContainer.appendChild(clonedElement);

    try {
        const canvas = await html2canvas(clonedElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps= pdf.getImageProperties(imgData);
        const imgRatio = imgProps.height / imgProps.width;
        const imgHeightInPdf = pdfWidth * imgRatio;

        let position = 0;
        let heightLeft = imgHeightInPdf;
        
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;
        
        while (heightLeft > 0) {
            position = -heightLeft;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
            heightLeft -= pdfHeight;
        }

        pdf.save(`teacher-report-${teacher.username}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        document.body.removeChild(captureContainer);
        setIsDownloading(false);
    }
  };
  
  useEffect(() => {
    if (!teacherId) {
      setError("Teacher ID is missing.");
      setIsLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const contentCollection = collection(db, "courseContent");

    const fetchTeacher = async () => {
      try {
        const teacherDocRef = doc(db, "users", teacherId);
        const teacherDoc = await getDoc(teacherDocRef);
        if (teacherDoc.exists() && teacherDoc.data().role === 'teacher') {
          setTeacher({ id: teacherDoc.id, ...teacherDoc.data() } as AppUser);
        } else {
          throw new Error("Teacher not found or user is not a teacher.");
        }
      } catch (err: any) {
        throw new Error(`Failed to fetch teacher data: ${err.message}`);
      }
    };
    
    const quizzesQuery = query(contentCollection, where("teacherId", "==", teacherId), where("contentType", "==", "quiz"), orderBy("createdAt", "desc"));
    unsubscribes.push(onSnapshot(quizzesQuery, (snapshot) => {
        setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem)));
    }));

    const resourcesQuery = query(contentCollection, where("teacherId", "==", teacherId), where("contentType", "==", "lessonMaterial"), orderBy("createdAt", "desc"));
    unsubscribes.push(onSnapshot(resourcesQuery, (snapshot) => {
        setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem)));
    }));

    fetchTeacher()
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => unsubscribes.forEach(unsub => unsub());

  }, [teacherId]);

  useEffect(() => {
    if (!teacherId) return;

    let timeFilter = new Date();
    switch (timeRange) {
      case '24h': timeFilter.setHours(timeFilter.getHours() - 24); break;
      case '7d': timeFilter.setDate(timeFilter.getDate() - 7); break;
      case '30d': timeFilter.setDate(timeFilter.getDate() - 30); break;
      case 'all': timeFilter = new Date(0); break;
    }

    const activitiesQuery = query(
      collection(db, "teacherActivities"), 
      where("teacherId", "==", teacherId),
      where("type", "in", ["quiz_created", "lesson_material_created", "student_registered"]),
      where("timestamp", ">=", timeFilter),
      orderBy("timestamp", "desc")
    );
     const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherActivity)));
    });

    return () => unsubscribeActivities();
  }, [teacherId, timeRange]);

  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return activities.slice(startIndex, startIndex + PAGE_SIZE);
  }, [activities, currentPage]);

  const totalPages = Math.ceil(activities.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeRange]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading teacher profile...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!teacher) {
    return <Alert><AlertTitle>Not Found</AlertTitle><AlertDescription>This teacher could not be found.</AlertDescription></Alert>
  }
  
  return (
    <div className="space-y-8">
        <Card className="shadow-lg print-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <CardTitle className="text-3xl font-headline text-primary">{teacher.displayName}</CardTitle>
                    <CardDescription>@{teacher.username}</CardDescription>
                </div>
                 <div className="flex justify-center sm:justify-end gap-2 w-full sm:w-auto">
                    <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-full sm:w-[150px]">
                      {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Download className="mr-2 h-4 w-4" /><span>Download PDF</span></>}
                    </Button>
                </div>
            </CardHeader>
        </Card>

        <div ref={reportRef} className="bg-background p-4 rounded-lg">
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="h-24 w-24 border">
                  <AvatarImage src={teacher.avatarUrl || undefined} alt={teacher.displayName || "Teacher"} />
                  <AvatarFallback className="text-3xl">{getInitials(teacher.displayName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                  <h2 className="text-2xl font-bold">{teacher.displayName}</h2>
                  <p className="text-md text-muted-foreground">@{teacher.username}</p>
              </div>
            </div>
            <Tabs defaultValue="quizzes" className="w-full">
                <TabsList className="grid w-full grid-cols-3 print-hidden">
                    <TabsTrigger value="quizzes">Quizzes ({quizzes.length})</TabsTrigger>
                    <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
                    <TabsTrigger value="reports">Activity ({activities.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="quizzes" className="mt-6">
                    <Card>
                        <CardHeader><CardTitle>Quizzes Created</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Questions</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quizzes.length > 0 ? quizzes.map(quiz => (
                                        <TableRow key={quiz.id}>
                                            <TableCell className="font-medium">{quiz.title}</TableCell>
                                            <TableCell>{getTopicTitle(quiz.topic)}</TableCell>
                                            <TableCell>{(quiz.content as QuizDetails)?.questions?.length || 0}</TableCell>
                                            <TableCell>{format(quiz.createdAt.toDate(), 'PP')}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24">No quizzes created by this teacher.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resources" className="mt-6">
                    <Card>
                        <CardHeader><CardTitle>Resources Uploaded</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>File Name</TableHead>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {resources.length > 0 ? resources.map(res => (
                                        <TableRow key={res.id}>
                                            <TableCell className="font-medium">{res.title}</TableCell>
                                            <TableCell>{getTopicTitle(res.topic)}</TableCell>
                                            <TableCell>{format(res.createdAt.toDate(), 'PP')}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={3} className="text-center h-24">No resources uploaded by this teacher.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity Log</CardTitle>
                            <div id="activity-filters" className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pt-2">
                                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                    <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d' | 'all') => setTimeRange(value)}>
                                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Time range" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                                            <SelectItem value="7d">Last 7 Days</SelectItem>
                                            <SelectItem value="30d">Last 30 Days</SelectItem>
                                            <SelectItem value="all">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                                        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Activity</TableHead>
                                        <TableHead className="text-right">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedActivities.length > 0 ? paginatedActivities.map(activity => (
                                        <TableRow key={activity.id}>
                                            <TableCell className="font-medium">{activity.message}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">{formatDistanceToNowStrict(activity.timestamp.toDate(), {addSuffix: true})}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={2} className="text-center h-24">No recent activity from this teacher in the selected time range.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
