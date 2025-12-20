"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, Download, User, Search, BookOpen } from "lucide-react";
import type { CourseContentItem, AppUser, ResourceDownload } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DownloadDetail {
  student: AppUser;
  downloadedAt: Date;
}

interface ResourceAnalytics {
  resource: (CourseContentItem & { teacher?: AppUser }) | null;
  totalDownloads: number;
  downloads: DownloadDetail[];
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
        
        let teacherData: AppUser | undefined = undefined;
        if (resourceData.teacherId) {
          const teacherDoc = await getDoc(doc(db, "users", resourceData.teacherId));
          if (teacherDoc.exists()) {
            teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as AppUser;
          }
        }
        
        const downloadsQuery = query(collection(db, "resourceDownloads"), where("resourceId", "==", id));
        const downloadsSnapshot = await getDocs(downloadsQuery);
        const totalDownloads = downloadsSnapshot.size;

        const downloadDetails: DownloadDetail[] = [];
        for (const downloadDoc of downloadsSnapshot.docs) {
          const downloadData = downloadDoc.data() as ResourceDownload;
          const studentDoc = await getDoc(doc(db, "users", downloadData.studentId));
          if (studentDoc.exists()) {
            downloadDetails.push({
              student: studentDoc.data() as AppUser,
              downloadedAt: downloadData.downloadedAt.toDate(),
            });
          }
        }

        setAnalytics({
          resource: { ...resourceData, teacher: teacherData },
          totalDownloads,
          downloads: downloadDetails.sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime()),
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
    return null;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Search className="h-8 w-8" /> Global Search
          </CardTitle>
          <CardDescription>
            You are viewing the usage details for the resource: {analytics.resource.title}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDownloads}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students Who Downloaded</CardTitle>
          <CardDescription>A list of students who have downloaded this resource.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.downloads.length > 0 ? (
            <ul className="space-y-4">
              {analytics.downloads.map((download, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={download.student.avatarUrl || undefined} />
                      <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{download.student.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{download.student.username}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {download.downloadedAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No students have downloaded this resource yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
