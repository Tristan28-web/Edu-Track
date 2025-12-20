
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, getDocs, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, TeacherActivity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Printer, ShieldAlert, Activity, UserPlus, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpenCheck, Library, CheckSquare, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const iconMap: { [key in TeacherActivity['type']]: React.ReactNode } = {
    quiz_created: <BookOpenCheck className="h-5 w-5 text-blue-500" />,
    lesson_material_created: <Library className="h-5 w-5 text-purple-500" />,
    student_registered: <UserPlus className="h-5 w-5 text-green-500" />,
    teacher_registered: <UserPlus className="h-5 w-5 text-green-500" />,
    quiz_completion: <CheckSquare className="h-5 w-5 text-teal-500" />,
    content_viewed: <Eye className="h-5 w-5 text-gray-500" />,
    other: <Activity className="h-5 w-5 text-gray-500" />,
};

const getInitials = (name?: string | null) => {
  if (!name) return "P";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const PAGE_SIZE = 10;

export default function PrincipalProfilePage() {
  const params = useParams();
  const principalId = typeof params.id === 'string' ? params.id : "";
  const reportRef = useRef<HTMLDivElement>(null);

  const [principal, setPrincipal] = useState<AppUser | null>(null);
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  

  const handleDownloadPdf = async () => {
    const elementToCapture = reportRef.current;
    if (!elementToCapture || !principal) return;

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
    
    clonedElement.style.width = '800px'; // Force a consistent width for wrapping
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

        pdf.save(`principal-report-${principal.username}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        document.body.removeChild(captureContainer);
        setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!principalId) {
      setError("Principal ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchPrincipal = async () => {
        try {
            const principalDocRef = doc(db, "users", principalId);
            const principalDoc = await getDoc(principalDocRef);
            if (principalDoc.exists() && principalDoc.data().role === 'principal') {
                setPrincipal({ id: principalDoc.id, ...principalDoc.data() } as AppUser);
            } else {
                throw new Error("Principal not found or user is not a principal.");
            }
        } catch (err: any) {
            console.error("Error fetching principal info", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchPrincipal();

  }, [principalId]);

  useEffect(() => {
    if (!principalId) return;

    let timeFilter = new Date();
    switch (timeRange) {
      case '24h': timeFilter.setHours(timeFilter.getHours() - 24); break;
      case '7d': timeFilter.setDate(timeFilter.getDate() - 7); break;
      case '30d': timeFilter.setDate(timeFilter.getDate() - 30); break;
      case 'all': timeFilter = new Date(0); break;
    }

    const activitiesQuery = query(
        collection(db, "teacherActivities"),
        where("principalId", "==", principalId),
        where("type", "==", "teacher_registered"),
        where("timestamp", ">=", timeFilter),
        orderBy("timestamp", "desc")
    );

    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherActivity)));
    }, (err) => {
        console.error("Error fetching principal's registration logs:", err);
        let detailedError = "Failed to load registration logs.";
        if (err.code === 'failed-precondition') {
            detailedError += " A Firestore index might be missing. Please check the developer console.";
        }
        setError(detailedError);
    });

    return () => unsubscribeActivities();
  }, [principalId, timeRange]);
  
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
        <p className="ml-4 text-lg text-muted-foreground">Loading principal report...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!principal) {
    return <Alert><AlertTitle>Not Found</AlertTitle><AlertDescription>This principal could not be found.</AlertDescription></Alert>;
  }
  
  return (
    <div className="space-y-8">
        <Card className="shadow-lg print-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                      <CardTitle className="text-3xl font-headline text-primary">{principal.displayName}</CardTitle>
                      <CardDescription>@{principal.username} &bull; Registration Activity</CardDescription>
                  </div>
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
                <AvatarImage src={principal.avatarUrl || undefined} alt={principal.displayName || "Principal"} />
                <AvatarFallback className="text-3xl">{getInitials(principal.displayName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
                <h2 className="text-2xl font-bold">{principal.displayName}</h2>
                <p className="text-md text-muted-foreground">@{principal.username} &bull; Registration Activity</p>
            </div>
          </div>
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity /> Teacher Registration Log</CardTitle>
                   <div id="activity-filters" className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pt-2">
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                           <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d' | 'all') => setTimeRange(value)}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Time range" />
                            </SelectTrigger>
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
                              <TableHead className="w-[50px]">Type</TableHead>
                              <TableHead>Activity</TableHead>
                              <TableHead className="text-right">Time</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {paginatedActivities.length > 0 ? paginatedActivities.map(activity => (
                              <TableRow key={activity.id}>
                                  <TableCell>{iconMap[activity.type] || iconMap.other}</TableCell>
                                  <TableCell>
                                      <p className="font-medium">{activity.message}</p>
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground">
                                      {activity.timestamp ? formatDistanceToNowStrict(activity.timestamp.toDate(), {addSuffix: true}) : 'N/A'}
                                  </TableCell>
                              </TableRow>
                          )) : (
                              <TableRow><TableCell colSpan={3} className="text-center h-24">No teacher registration activities recorded for this principal in the selected time range.</TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </div>
    </div>
  );
}
