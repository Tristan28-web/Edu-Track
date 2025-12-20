
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, File, FileText, FileBarChart2, Download } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { CourseContentItem, LessonMaterialDetails } from "@/types";
import { format } from "date-fns";
import { mathTopics } from "@/config/topics";

export const ResourceClient = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<CourseContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.teacherId) {
        setError("You must be assigned to a teacher to view resources.");
        setIsLoading(false);
        return;
    }

    const resourcesRef = collection(db, "courseContent");
    const q = query(
        resourcesRef,
        where("teacherId", "==", user.teacherId),
        where("contentType", "==", "lessonMaterial"),
        where("isArchived", "==", false),
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));
      setResources(files);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching resources:", err);
      setError("Could not fetch resources. Please try again later.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-5 w-5 text-muted-foreground" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes("presentation") || fileType.includes("pptx")) return <FileBarChart2 className="h-5 w-5 text-orange-500" />;
    if (fileType.includes("document") || fileType.includes("docx")) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Materials</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading && (
                <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            )}
            {error && (
                <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {!isLoading && !error && resources.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Your teacher has not uploaded any resources yet.</p>
            )}
            {!isLoading && !error && resources.length > 0 && (
                 <div className="max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead className="hidden md:table-cell">Topic</TableHead>
                                <TableHead className="hidden sm:table-cell">Date Uploaded</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resources.map(item => {
                                const content = item.content as LessonMaterialDetails;
                                if (!content.fileUrl) return null;

                                return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {getFileIcon(content.fileType)}
                                        {content.fileName}
                                    </TableCell>
                                     <TableCell className="hidden md:table-cell">{mathTopics.find(t => t.slug === item.topic)?.title || item.topic}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-xs">{item.createdAt ? format(item.createdAt.toDate(), "PP") : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild size="sm">
                                            <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="mr-2 h-4 w-4"/>
                                                Download
                                            </a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
