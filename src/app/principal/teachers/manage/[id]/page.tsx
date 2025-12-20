"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUser, CourseContentItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Trash2, Save, User } from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function ManageTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = typeof params.id === 'string' ? params.id : "";

  const [teacher, setTeacher] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');


  useEffect(() => {
    if (!teacherId) {
      setIsLoading(false);
      setError("Teacher ID is missing.");
      return;
    }

    const fetchTeacher = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, "users", teacherId));
        if (teacherDoc.exists() && teacherDoc.data().role === 'teacher') {
          const teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as AppUser;
          setTeacher(teacherData);
          setDisplayName(teacherData.displayName || '');
          setEmail(teacherData.email || '');
        } else {
          setError("Teacher not found.");
        }
      } catch (err) {
        console.error("Error fetching teacher:", err);
        setError("Failed to fetch teacher data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeacher();
  }, [teacherId]);

  const handleUpdate = async () => {
    if (!teacherId) return;
    setIsUpdating(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", teacherId), {
        displayName,
        email,
      });
      // Re-fetch teacher data to confirm update
      const updatedTeacherDoc = await getDoc(doc(db, "users", teacherId));
      if(updatedTeacherDoc.exists()) {
          setTeacher({ id: updatedTeacherDoc.id, ...updatedTeacherDoc.data() } as AppUser)
      }

    } catch (err) {
      console.error("Error updating teacher:", err);
      setError("Failed to update teacher.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!teacherId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "users", teacherId));
      router.push("/principal/teachers");
    } catch (err) {
      console.error("Error deleting teacher:", err);
      setError("Failed to delete teacher.");
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!teacher) return <p>Teacher not found.</p>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                 <Button asChild variant="outline" size="sm" className="mb-4 w-fit">
                    <Link href="/principal/teachers"><ArrowLeft className="mr-2 h-4 w-4" />Back to Teachers</Link>
                </Button>
                <CardTitle className="flex items-center gap-2"><User className="h-6 w-6" />{teacher.displayName}</CardTitle>
                <CardDescription>Manage teacher profile and associated data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Profile Information</h3>
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Full Name</Label>
                        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isUpdating} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isUpdating} />
                    </div>
                    <Button onClick={handleUpdate} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" /> Update Profile
                    </Button>
                </div>

                <div className="space-y-4 pt-6 border-t">
                    <h3 className="font-semibold text-lg text-destructive">Danger Zone</h3>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete Teacher
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the teacher's account and remove all their associated data.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
