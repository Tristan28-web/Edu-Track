"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, FileText, Calendar, BookOpen, User, Clock, FileType, Eye, Download } from "lucide-react";
import type { CourseContentItem, AppUser } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface ResourceAnalytics {
  resource: (CourseContentItem & { teacher?: AppUser }) | null;
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
        const resourceDocRef = doc(db, "courseContent", id);
        const resourceDoc = await getDoc(resourceDocRef);

        if (!resourceDoc.exists() || resourceDoc.data().contentType !== 'lessonMaterial') {
          setError("Resource not found.");
          setIsLoading(false);
          return;
        }

        const resourceData = { id: resourceDoc.id, ...resourceDoc.data() } as CourseContentItem;
        
        // Fetch teacher data
        let teacherData: AppUser | undefined = undefined;
        if (resourceData.teacherId) {
          const teacherDoc = await getDoc(doc(db, "users", resourceData.teacherId));
          if (teacherDoc.exists()) {
            teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as AppUser;
          }
        }

        setAnalytics({
          resource: { ...resourceData, teacher: teacherData },
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
        <span className="ml-3 text-muted-foreground">Loading resource details...</span>
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
        <AlertDescription>No data available for this resource.</AlertDescription>
      </Alert>
    );
  }

  // Get file extension for resource type badge
  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'FILE';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Main Resource Information Card */}
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {analytics.resource.title}
                  </CardTitle>
                  <CardDescription className="text-lg mt-1">
                    Resource Details & Analytics
                  </CardDescription>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Teacher Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold">Published By Teacher</h3>
              </div>
              {analytics.resource.teacher ? (
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-semibold">
                        {analytics.resource.teacher.displayName?.charAt(0) || 'T'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{analytics.resource.teacher.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        Username: @{analytics.resource.username || analytics.resource.teacher.username}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground pl-2">Teacher information not available</p>
              )}
            </div>

            {/* Resource Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Publication Timeline
                </h3>
                <div className="space-y-2 pl-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Date Published</p>
                    <p className="font-medium">
                      {analytics.resource.createdAt 
                        ? format(analytics.resource.createdAt.toDate(), 'EEEE, MMMM do, yyyy')
                        : 'Date not available'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Published</p>
                    <p className="font-medium">
                      {analytics.resource.createdAt 
                        ? format(analytics.resource.createdAt.toDate(), 'h:mm a')
                        : 'Time not available'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {analytics.resource.updatedAt 
                        ? format(analytics.resource.updatedAt.toDate(), 'MMM d, yyyy • h:mm a')
                        : analytics.resource.createdAt 
                          ? format(analytics.resource.createdAt.toDate(), 'MMM d, yyyy • h:mm a')
                          : 'Never updated'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Resource Details
                </h3>
                <div className="space-y-2 pl-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Topic / Subject</p>
                    <p className="font-medium">
                      {analytics.resource.topic || 'No topic specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">File Type</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {getFileExtension(analytics.resource.title)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Document</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge 
                      variant={analytics.resource.isArchived ? "secondary" : "default"}
                      className="mt-1"
                    >
                      {analytics.resource.isArchived ? "📁 Archived" : "✅ Active"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Resource Description */}
            {analytics.resource.description && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resource Description
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">
                    {analytics.resource.description}
                  </p>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Resource Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Visibility</p>
                  <p className="font-semibold">
                    {analytics.resource.isArchived ? 'Archived' : 'Public'}
                  </p>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="font-semibold">For Download</p>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">Permanent</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resource Information</CardTitle>
          <CardDescription>
            All details about this educational resource
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Resource ID</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{id}</code>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Content Type</span>
                <Badge variant="outline">Lesson Material</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Teacher ID</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {analytics.resource.teacherId || 'N/A'}
                </code>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">File Name</span>
                <span className="font-medium truncate max-w-[200px]">{analytics.resource.title}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Created At</span>
                <span className="font-medium">
                  {analytics.resource.createdAt 
                    ? format(analytics.resource.createdAt.toDate(), 'MM/dd/yyyy')
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Last Modified</span>
                <span className="font-medium">
                  {analytics.resource.updatedAt 
                    ? format(analytics.resource.updatedAt.toDate(), 'MM/dd/yyyy')
                    : format(analytics.resource.createdAt?.toDate() || new Date(), 'MM/dd/yyyy')
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
