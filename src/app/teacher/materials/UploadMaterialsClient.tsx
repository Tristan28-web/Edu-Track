"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, AlertTriangle, File, Eye, FileText, FileBarChart2, Archive, ArchiveRestore, Trash2, Tag } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import type { CourseContentItem, LessonMaterialDetails } from "@/types";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CLOUDINARY_CLOUD_NAME = "dxnwulhow";
const CLOUDINARY_UPLOAD_PRESET = "edutrack_uploads";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];

const FILE_SIZE_LIMITS_MB = {
  pdf: 15,
  docx: 10,
  pptx: 25,
};

export function UploadMaterialsClient() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  
  const [uploadedFiles, setUploadedFiles] = useState<CourseContentItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  const [topicInput, setTopicInput] = useState<string>("");
  const [recentTopics, setRecentTopics] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const sectionsRef = collection(db, "sections");
    const q = query(sectionsRef, where("teacherId", "==", user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; name: string }));
      setSections(sectionsData);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
        setIsLoadingFiles(false);
        return;
    }
    const contentRef = collection(db, "courseContent");
    const q = query(
        contentRef, 
        where("teacherId", "==", user.id),
        where("contentType", "==", "lessonMaterial"), 
        where("isArchived", "==", showArchived),
        orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));
      setUploadedFiles(files);
      setIsLoadingFiles(false);
      
      // Extract recent unique topics from uploaded files
      const topics = Array.from(new Set(
        files
          .map(file => file.topic)
          .filter((topic): topic is string => !!topic)
      )).slice(0, 5); // Show only 5 most recent topics
      setRecentTopics(topics);
    }, (err) => {
      console.error("Error fetching resources:", err);
      setError("Could not fetch the list of uploaded resources. You may need to create a Firestore index.");
      setIsLoadingFiles(false);
    });

    return () => unsubscribe();
  }, [user, showArchived]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (!ext || !ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
        setError(`Invalid file type. Please select one of: ${ALLOWED_EXTENSIONS.join(', ')}`);
        setSelectedFile(null);
        event.target.value = "";
        return;
      }
      
      const fileTypeLimits = FILE_SIZE_LIMITS_MB as Record<string, number>;
      const maxSize = (fileTypeLimits[ext] || 10) * 1024 * 1024;
      
      if (file.size > maxSize) {
          toast({
              title: "File Too Large",
              description: `Please upload a ${ext.toUpperCase()} file under ${fileTypeLimits[ext]} MB.`,
              variant: "destructive",
          });
          setSelectedFile(null);
          event.target.value = "";
          return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !selectedSection || !topicInput.trim()) {
      setError("Please select a file, enter a topic, and select a section.");
      return;
    }
    
    const trimmedTopic = topicInput.trim();
    
    if (uploadedFiles.some(file => file.title === selectedFile.name && !file.isArchived)) {
        toast({
            title: "Duplicate File",
            description: "A file with this name already exists for this section.",
            variant: "destructive"
        });
        return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(progress);
        },
      });

      const { secure_url, resource_type, format, public_id } = response.data;
      
      const contentPayload: LessonMaterialDetails = {
          content: `File resource: ${selectedFile.name}`,
          fileUrl: secure_url,
          fileName: selectedFile.name,
          fileType: format || resource_type,
      };

      await addDoc(collection(db, "courseContent"), {
        teacherId: user.id,
        title: selectedFile.name,
        description: `Uploaded file: ${selectedFile.name}`,
        sectionId: selectedSection,
        topic: trimmedTopic,
        gradingPeriod: "1st Quarter",
        contentType: "lessonMaterial",
        content: contentPayload,
        isArchived: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Upload Successful",
        description: `"${selectedFile.name}" has been uploaded to "${trimmedTopic}".`,
      });

      // Clear the topic input after successful upload
      setTopicInput("");

    } catch (err: any) {
      console.error("Error uploading:", err);
      setError(err.response?.data?.error?.message || "An unexpected error occurred during upload.");
      toast({
        title: "Upload Failed",
        description: err.response?.data?.error?.message || "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = "";
    }
  };
  
  const handleArchiveToggle = async (fileId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const docRef = doc(db, 'courseContent', fileId);
    try {
        await updateDoc(docRef, { isArchived: newStatus });
        toast({
            title: `Resource ${newStatus ? 'Archived' : 'Restored'}`,
            description: `The file has been successfully ${newStatus ? 'archived' : 'restored'}.`
        });
    } catch(err) {
        console.error("Error updating resource status", err);
        toast({ title: 'Error', description: 'Could not update the resource status.', variant: 'destructive'});
    }
  }
  
  const handleDelete = async (fileId: string) => {
      const docRef = doc(db, 'courseContent', fileId);
      try {
          await deleteDoc(docRef);
          toast({
              title: "Resource Deleted",
              description: "The file has been permanently deleted."
          });
      } catch (err) {
          console.error("Error deleting resource:", err);
          toast({ title: 'Error', description: 'Could not delete the resource.', variant: 'destructive' });
      }
  }

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-5 w-5 text-muted-foreground" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes("presentation") || fileType.includes("pptx")) return <FileBarChart2 className="h-5 w-5 text-orange-500" />;
    if (fileType.includes("document") || fileType.includes("docx")) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  // Quick select recent topic
  const selectRecentTopic = (topic: string) => {
    setTopicInput(topic);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload a New Resource</CardTitle>
          <CardDescription>Select a file and assign it to any topic and section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input id="file-upload" type="file" onChange={handleFileChange} accept={ALLOWED_EXTENSIONS.join(',')} disabled={isUploading} />
              <p className="text-xs text-muted-foreground mt-2">Allowed types: PDF (max 15MB), DOCX (max 10MB), PPTX (max 25MB).</p>
            </div>
             <div>
              <Label htmlFor="topic-input">Assign to Topic</Label>
              <div className="space-y-2">
                <Input 
                  id="topic-input" 
                  placeholder="e.g., Grade 7 Algebra, Linear Equations, Geometry Basics" 
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  disabled={isUploading}
                />
                
                {recentTopics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <p className="text-xs text-muted-foreground w-full">Recent topics:</p>
                    {recentTopics.map((topic, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => selectRecentTopic(topic)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
             <div>
              <Label htmlFor="section-select">Assign to Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection} disabled={isUploading}>
                <SelectTrigger id="section-select"><SelectValue placeholder="Select a section" /></SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading: {selectedFile?.name}</p>
              <Progress value={uploadProgress} />
              <p className="text-sm text-center">{uploadProgress}%</p>
            </div>
          )}
          
          {error && <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        
        </CardContent>
         <CardFooter>
           <Button onClick={handleUpload} disabled={!selectedFile || isUploading || !selectedSection || !topicInput.trim()}>
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Uploaded Resources</CardTitle>
              <CardDescription>List of {showArchived ? 'archived' : 'active'} learning materials.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowArchived(prev => !prev)}>
                {showArchived ? <Eye className="mr-2 h-4 w-4"/> : <Archive className="mr-2 h-4 w-4" />}
                {showArchived ? 'View Active' : 'View Archived'}
            </Button>
        </CardHeader>
        <CardContent>
            {isLoadingFiles ? (
                <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : uploadedFiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No {showArchived ? 'archived' : 'active'} resources found.</p>
            ) : (
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead className="hidden md:table-cell">Topic</TableHead>
                                <TableHead className="hidden md:table-cell">Section</TableHead>
                                <TableHead className="hidden sm:table-cell">Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {uploadedFiles.map(file => {
                                const content = file.content as LessonMaterialDetails;
                                return (
                                <TableRow key={file.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                    {getFileIcon(content.fileType)}
                                    {content.fileName}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      <Badge variant="outline" className="font-normal">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {file.topic}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{file.sectionId ? sections.find(s => s.id === file.sectionId)?.name : 'N/A'}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-xs">{file.createdAt ? format(file.createdAt.toDate(), "PP") : 'N/A'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleArchiveToggle(file.id, file.isArchived || false)}>
                                            {showArchived ? <ArchiveRestore className="mr-2 h-4 w-4"/> : <Archive className="mr-2 h-4 w-4" />}
                                            {showArchived ? 'Restore' : 'Archive'}
                                        </Button>
                                        {showArchived && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the resource.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(file.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        )}
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
}
