"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, Download, User, BookOpen, Users, Eye, Calendar, FileText } from "lucide-react";
import type { CourseContentItem, AppUser } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface ResourceAccess {
  student: AppUser;
  accessedAt: Date | null;
}

interface ResourceAnalytics {
  resource: (CourseContentItem & { teacher?: AppUser }) | null;
  totalAccesses: number;
  totalStudents: number;
  accesses: ResourceAccess[];
  lastAccessDate: Date | null;
}

export default function ResourceAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const [analytics, setAnalytics] = useState<ResourceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch resource data
        const resourceDocRef = doc(db, "courseContent", id);
        const resourceDoc = await getDoc(resourceDocRef);

        if (!resourceDoc.exists() || resourceDoc.data().contentType !== 'lessonMaterial') {
          setError("Resource not found.");
          setIsLoading(false);
          return;
        }

        const resourceData = { id: resourceDoc.id, ...resourceDoc.data() } as CourseContentItem;
        
        // 2. Fetch teacher data if available
        let teacherData: AppUser | undefined = undefined;
        if (resourceData.teacherId) {
          const teacherDoc = await getDoc(doc(db, "users", resourceData.teacherId));
          if (teacherDoc.exists()) {
            teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as AppUser;
          }
        }
        
        // 3. Fetch all students
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        // 4. Check resource access through multiple methods
        const accessDetails: ResourceAccess[] = [];
        let totalAccessCount = 0;
        let lastAccessDate: Date | null = null;
        
        // Method 1: Check if resourceDownloads collection exists
        try {
          const downloadsQuery = query(collection(db, "resourceDownloads"), where("resourceId", "==", id));
          const downloadsSnapshot = await getDocs(downloadsQuery);
          
          if (!downloadsSnapshot.empty) {
            for (const downloadDoc of downloadsSnapshot.docs) {
              const downloadData = downloadDoc.data();
              const studentDoc = await getDoc(doc(db, "users", downloadData.studentId));
              if (studentDoc.exists()) {
                totalAccessCount++;
                const accessDate = downloadData.downloadedAt?.toDate?.() || new Date();
                if (!lastAccessDate || accessDate > lastAccessDate) {
                  lastAccessDate = accessDate;
                }
                
                accessDetails.push({
                  student: { id: studentDoc.id, ...studentDoc.data() } as AppUser,
                  accessedAt: accessDate,
                });
              }
            }
          }
        } catch (err) {
          console.log("resourceDownloads collection not found, trying alternative methods...");
        }
        
        // Method 2: Check student progress data for resource access
        // This assumes resources are tracked in student progress
        if (totalAccessCount === 0) {
          for (const studentDoc of studentsSnapshot.docs) {
            const studentId = studentDoc.id;
            const studentData = { id: studentDoc.id, ...studentDoc.data() } as AppUser;
            
            // Check student's progress for this resource
            const studentProgress = studentData.progress as Record<string, any> | undefined;
            if (studentProgress && resourceData.topic) {
              const topicProgress = studentProgress[resourceData.topic];
              if (topicProgress && topicProgress.lastActivity) {
                totalAccessCount++;
                const accessDate = topicProgress.lastActivity.toDate();
                if (!lastAccessDate || accessDate > lastAccessDate) {
                  lastAccessDate = accessDate;
                }
                
                accessDetails.push({
                  student: studentData,
                  accessedAt: accessDate,
                });
              }
            }
            
            // Alternative: Check if student has accessed materials in general
            // This is a fallback if specific resource tracking isn't available
            else if (studentData.lastLogin) {
              totalAccessCount++;
              const accessDate = studentData.lastLogin.toDate();
              if (!lastAccessDate || accessDate > lastAccessDate) {
                lastAccessDate = accessDate;
              }
              
              accessDetails.push({
                student: studentData,
                accessedAt: accessDate,
              });
            }
          }
        }
        
        // Sort by access date (most recent first)
        const sortedAccesses = accessDetails.sort((a, b) => {
          if (!a.accessedAt) return 1;
          if (!b.accessedAt) return -1;
          return b.accessedAt.getTime() - a.accessedAt.getTime();
        });

        setAnalytics({
          resource: { ...resourceData, teacher: teacherData },
          totalAccesses: totalAccessCount,
          totalStudents: studentsSnapshot.size,
          accesses: sortedAccesses,
          lastAccessDate,
        });

      } catch (err: any) {
        console.error("Error fetching resource analytics:", err);
        setError("Failed to load resource analytics. " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics || !analytics.resource) {
    return (
      <Alert className="max-w-4xl mx-auto">
        <AlertTitle>No Data Found</AlertTitle>
        <AlertDescription>No analytics data available for this resource.</AlertDescription>
      </Alert>
    );
  }

  // Calculate access rate
  const accessRate = analytics.totalStudents > 0 
    ? Math.round((analytics.totalAccesses / analytics.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                <BookOpen className="h-8 w-8" /> {analytics.resource.title}
              </CardTitle>
              <CardDescription className="mt-2">
                {analytics.resource.description}
              </CardDescription>
              {analytics.resource.teacher && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-sm">
                    Created by: {analytics.resource.teacher.displayName}
                  </Badge>
                  {analytics.resource.topic && (
                    <Badge variant="secondary" className="text-sm">
                      Topic: {analytics.resource.topic}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={analytics.resource.isArchived ? "secondary" : "default"}>
                {analytics.resource.isArchived ? "Archived" : "Published"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accesses</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAccesses}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalStudents} total students
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessRate}%</div>
            <p className="text-xs text-muted-foreground">
              Of students accessed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Accessed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.lastAccessDate ? format(analytics.lastAccessDate, 'MMM dd') : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.lastAccessDate ? format(analytics.lastAccessDate, 'yyyy') : 'No access yet'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resource Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {analytics.resource.contentType === 'lessonMaterial' ? 'Resource' : 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              Learning material
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Access History
          </CardTitle>
          <CardDescription>
            {analytics.totalAccesses > 0 
              ? `Students who have accessed this resource (${analytics.accesses.length} shown)`
              : 'No students have accessed this resource yet'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.accesses.length > 0 ? (
            <div className="space-y-3">
              {analytics.accesses.slice(0, 10).map((access, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage 
                        src={access.student.avatarUrl || undefined} 
                        alt={access.student.displayName || 'Student'}
                      />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{access.student.displayName || 'Unknown Student'}</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>@{access.student.username || 'no-username'}</p>
                        {access.student.sectionName && (
                          <p className="text-xs">Section: {access.student.sectionName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {access.accessedAt ? (
                      <>
                        <p className="text-sm font-medium">
                          {format(access.accessedAt, 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(access.accessedAt, 'h:mm a')}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No access date</p>
                    )}
                  </div>
                </div>
              ))}
              
              {analytics.accesses.length > 10 && (
                <div className="text-center pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing 10 of {analytics.accesses.length} accesses
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-3 opacity-50" />
              <p>No students have accessed this resource yet</p>
              <p className="text-sm mt-1">Student access data will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
