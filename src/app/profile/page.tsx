"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCircle, Edit, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProfilePage() {
  const { user, role, loading, updateUserDisplayName } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  const canEditProfile = role && !['teacher', 'student', 'principal'].includes(role);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      if (user.role === 'student' && user.teacherId) {
        const getTeacherName = async () => {
          try {
            const teacherDocRef = doc(db, "users", user.teacherId!);
            const teacherDocSnap = await getDoc(teacherDocRef);
            if (teacherDocSnap.exists()) {
              const teacherData = teacherDocSnap.data();
              setTeacherName(teacherData.displayName || "N/A");
            } else {
              setTeacherName("N/A");
            }
          } catch (error) {
            console.error("Error fetching teacher's name: ", error);
            setTeacherName("N/A");
          }
        };
        getTeacherName();
      }
    }
  }, [user]);

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleEdit = () => {
    if (canEditProfile && user) {
        setDisplayName(user.displayName || "");
        setIsEditing(true);
    }
  };
  
  const handleCancel = () => {
    if (user) {
        setDisplayName(user.displayName || "");
    }
    setIsEditing(false);
  };
  
  const handleSave = async () => {
    if (!displayName || displayName.trim().length < 2) {
        toast({ title: "Invalid Name", description: "Display name must be at least 2 characters.", variant: "destructive" });
        return;
    }

    const nameChanged = displayName.trim() !== user?.displayName;

    if (!nameChanged) {
        setIsEditing(false);
        return;
    }

    setIsSaving(true);
    try {
        await updateUserDisplayName(displayName.trim());
        setIsEditing(false);
    } catch (error) {
      if (user) {
          setDisplayName(user.displayName || "");
      }
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <UserCircle className="h-8 w-8" /> Your Profile
          </CardTitle>
          <CardDescription>
            View and update your profile picture
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:max-w-2xl md:mx-auto">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col items-center gap-6">
              <Avatar className="h-24 w-24 text-3xl">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || "User"} />
                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div className="w-full max-w-sm space-y-4 text-center">
                <div>
                  <Label htmlFor="displayName" className="text-muted-foreground">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    readOnly={!isEditing}
                    disabled={!canEditProfile || !isEditing || isSaving}
                    className="text-center disabled:opacity-100 disabled:cursor-default" 
                  />
                </div>
                <div>
                  <Label htmlFor="username" className="text-muted-foreground">Username</Label>
                  <Input id="username" value={user.username} readOnly disabled className="text-center" />
                </div>
                <div>
                  <Label htmlFor="role" className="text-muted-foreground">Role</Label>
                  <Input id="role" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} readOnly disabled className="text-center" />
                </div>
                {user.role === 'student' && user.sectionName && (
                  <div>
                    <Label htmlFor="section" className="text-muted-foreground">Section</Label>
                    <Input id="section" value={user.sectionName} readOnly disabled className="text-center" />
                  </div>
                )}
                {user.role === 'student' && teacherName && (
                  <div>
                    <Label htmlFor="teacher" className="text-muted-foreground">Teacher</Label>
                    <Input id="teacher" value={teacherName} readOnly disabled className="text-center" />
                  </div>
                )}
              </div>
            </div>
            {canEditProfile && (
              <div className="flex justify-center pt-4 space-x-2">
                {isEditing ? (
                    <>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    </>
                ) : (
                  <Button onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}