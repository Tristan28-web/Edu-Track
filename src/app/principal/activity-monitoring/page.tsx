
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, TeacherActivity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Activity, Printer, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MAX_ACTIVITIES = 500;
const PAGE_SIZE = 50;

export default function PrincipalActivityMonitoringPage() {
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('24h');
  const [isDownloading, setIsDownloading] = useState(false);

  const { user: authUser } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    const elementToCapture = reportRef.current;
    if (!elementToCapture) return;

    setIsDownloading(true);

    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    captureContainer.style.top = '-9999px';
    captureContainer.style.left = '0';
    document.body.appendChild(captureContainer);
    
    const clonedElement = elementToCapture.cloneNode(true) as HTMLDivElement;
    
    // Remove the filter controls from the clone so they don't appear in the PDF
    const filters = clonedElement.querySelector('#activity-filters');
    if (filters) {
        filters.remove();
    }
    
    // Style the clone for capture
    clonedElement.style.backgroundColor = 'white';
    clonedElement.style.width = '800px'; 
    clonedElement.style.padding = '20px';
    
    captureContainer.appendChild(clonedElement);
    
    try {
        const canvas = await html2canvas(clonedElement, {
            scale: 2,
            useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
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
        
        pdf.save(`activity-report-${new Date().toISOString()}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
        document.body.removeChild(captureContainer);
        setIsDownloading(false);
    }
  };
  
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setActivities(prev => {
        if (prev.length <= MAX_ACTIVITIES) return prev;
        
        const sorted = [...prev].sort((a, b) => 
          b.timestamp?.toMillis() - a.timestamp?.toMillis()
        );
        return sorted.slice(0, MAX_ACTIVITIES);
      });
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"), orderBy("displayName"));
        const snapshot = await getDocs(teachersQuery);
        setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    } catch (err) {
        console.error("Error fetching teachers:", err);
        toast({ 
            title: "Error", 
            description: "Could not load teacher list for filtering.", 
            variant: "destructive" 
        });
    }
  }, []);

  useEffect(() => {
    if (!authUser || authUser.role !== 'principal') {
      setIsLoading(false);
      if (authUser) setError("Accessing this page requires a principal login.");
      return;
    }

    fetchTeachers();
    
    let timeFilter = new Date();
    switch (timeRange) {
      case '1h':
        timeFilter.setHours(timeFilter.getHours() - 1);
        break;
      case '24h':
        timeFilter.setHours(timeFilter.getHours() - 24);
        break;
      case '7d':
        timeFilter.setDate(timeFilter.getDate() - 7);
        break;
      case 'all':
        timeFilter = new Date(0);
        break;
    }

    let activitiesQuery = query(
      collection(db, "teacherActivities"),
      where("timestamp", ">=", timeFilter),
      where('type', '!=', 'teacher_registered'), // Exclude teacher registration activity
      orderBy("timestamp", "desc"),
      limit(MAX_ACTIVITIES)
    );
    
    const unsubscribe = onSnapshot(activitiesQuery, 
      (snapshot) => {
        const fetchedActivities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TeacherActivity));
        
        setActivities(fetchedActivities);
        setIsLoading(false);
      }, 
      (err: any) => {
        console.error("Error listening for activities:", err);
        let detailedError = "Failed to load activity stream in real-time.";
        if (err.code === 'failed-precondition') {
          detailedError += " This might be due to missing Firestore indexes.";
        }
        setError(detailedError);
        toast({ 
            title: "Error Loading Stream", 
            description: detailedError, 
            variant: "destructive", 
            duration: 10000 
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authUser, timeRange, fetchTeachers]);

  const filteredActivities = useMemo(() => {
    if (teacherFilter === "all") {
      return activities;
    }
    return activities.filter(activity => activity.teacherId === teacherFilter);
  }, [activities, teacherFilter]);

  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredActivities.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredActivities, currentPage]);

  const teacherMap = useMemo(() => {
    return teachers.reduce((acc, teacher) => {
        acc[teacher.id] = teacher.displayName || "Unknown Teacher";
        return acc;
    }, {} as Record<string, string>);
  }, [teachers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [teacherFilter, timeRange]);

  const totalPages = Math.ceil(filteredActivities.length / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                <Activity className="h-8 w-8" /> Teacher Activity Monitor
              </CardTitle>
              <CardDescription className="mt-2">
                View a live stream of teacher activities across the platform.
              </CardDescription>
            </div>
            <div className="print-hidden flex justify-center sm:justify-end w-full sm:w-auto">
                <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-[150px]">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="mr-2 h-4 w-4" /><span>Download PDF</span></>}
                </Button>
            </div>
        </CardHeader>
      </Card>
      
      <Card ref={reportRef}>
        <CardHeader>
            <div id="activity-filters" className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pt-2">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                        <SelectTrigger className="w-full md:w-[240px]">
                            <SelectValue placeholder="Filter by teacher..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Teachers</SelectItem>
                            {teachers.map(teacher => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.displayName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={timeRange} onValueChange={(value: '1h' | '24h' | '7d' | 'all') => setTimeRange(value)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1h">Last Hour</SelectItem>
                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="hidden md:table-cell">Teacher</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedActivities.length > 0 ? (
                    paginatedActivities.map((activity) => (
                    <TableRow key={activity.id}>
                        <TableCell>
                          <p className="font-medium">{activity.message}</p>
                          {activity.relatedItemTitle && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.relatedItemTitle}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {teacherMap[activity.teacherId] || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {activity.timestamp ? (
                            <div>
                                <div>{format(activity.timestamp.toDate(), 'PP p')}</div>
                                <div className="opacity-75">
                                  ({formatDistanceToNowStrict(activity.timestamp.toDate(), { addSuffix: true })})
                                </div>
                            </div>
                            ) : 'N/A'}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No activities found for the current filter.
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
