
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, Timestamp, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Settings,
  Save,
  Loader2,
  DatabaseBackup,
  LayoutDashboard,
  UserCog,
  BarChartHorizontalBig,
  Search,
  Cloud,
  Download,
  Users,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import type { AppUser } from "@/types";
import { Textarea } from "@/components/ui/textarea";

interface PlatformSettings {
  adminEmail: string;
  updatedAt?: Timestamp;
}

const defaultSettings: PlatformSettings = {
  adminEmail: "admin@edu-track.com",
};

export default function SystemSettingsPage() {
  const { user, updateUserPassword } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  
  // State for security settings
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const settingsDocRef = doc(db, "platformSettings", "config");

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedSettings: PlatformSettings = {
            adminEmail: data.adminEmail || defaultSettings.adminEmail,
            updatedAt: data.updatedAt,
          };
          setSettings(loadedSettings);
        } else {
          await setDoc(settingsDocRef, {
            ...defaultSettings,
            updatedAt: Timestamp.now(),
          });
          setSettings(defaultSettings);
        }

        const backupsQuery = query(collection(db, "backups"), orderBy("timestamp", "desc"), limit(1));
        const backupSnap = await getDocs(backupsQuery);
        if (!backupSnap.empty) {
            const lastBackupData = backupSnap.docs[0].data();
            setLastBackup(lastBackupData.timestamp.toDate());
        }

      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({
          title: "Error Loading Settings",
          description: "Could not fetch platform settings. Using defaults.",
          variant: "destructive",
        });
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveGeneralSettings = async () => {
    setIsSavingGeneral(true);
    try {
      await setDoc(
        settingsDocRef,
        { adminEmail: settings.adminEmail, updatedAt: Timestamp.now() },
        { merge: true }
      );
      toast({
        title: "General Settings Saved",
        description: "Administrator email has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving general settings:", error);
      toast({
        title: "Save Failed",
        description: "Could not save general settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleBackupData = async () => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to perform a backup.", variant: "destructive" });
        return;
    }
    setIsBackingUp(true);
    try {
        const backupTimestamp = Timestamp.now();
        await addDoc(collection(db, "backups"), {
            timestamp: backupTimestamp,
            type: "manual",
            triggeredBy: user.id
        });
        setLastBackup(backupTimestamp.toDate());
        toast({
            title: "Backup Initiated",
            description: "A manual backup record has been created in Firestore.",
        });
    } catch (error: any) {
        console.error("Error triggering backup:", error);
        toast({ title: "Backup Failed", description: "Could not create backup record.", variant: "destructive" });
    } finally {
        setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    toast({ title: "Starting Download", description: "Fetching all known collections for backup..." });
    try {
      const collectionsToBackup = [
        'users',
        'sections',
        'courseContent',
        'teacherActivities',
        'backups',
        'platformSettings',
        'conversations'
      ];
      const backupData: Record<string, any[]> = {};

      for (const collectionName of collectionsToBackup) {
        const collectionQuery = query(collection(db, collectionName));
        const querySnapshot = await getDocs(collectionQuery);
        backupData[collectionName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `firestore-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      toast({ title: "Download Complete", description: "All known collections have been downloaded." });

    } catch (error: any) {
      console.error("Error downloading backup:", error);
      toast({ title: "Download Failed", description: `Could not download all collections. Error: ${error.message}`, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };
  
    const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Mismatch",
        description: "The new passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(newPassword);
      // Success toast is handled in auth context
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      // Error is already toasted by the auth context
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-sm border border-muted/30">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-3">
            <Settings className="h-8 w-8" /> System Settings
          </CardTitle>
          <CardDescription>
            Manage platform-wide settings and integrations for Edu-Track.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
              <Settings className="h-6 w-6" /> General Settings
            </CardTitle>
            <CardDescription>Basic platform configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Administrator Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    adminEmail: e.target.value,
                  }))
                }
                disabled={isSavingGeneral}
              />
            </div>
            <Button
              onClick={handleSaveGeneralSettings}
              className="w-full sm:w-auto"
              disabled={isSavingGeneral}
            >
              {isSavingGeneral ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save General Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
              <DatabaseBackup className="h-6 w-6" /> Data Backup
            </CardTitle>
            <CardDescription>
              Manage database safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
               <Button onClick={handleBackupData} disabled={isBackingUp} className="w-full">
                {isBackingUp ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseBackup className="mr-2 h-4 w-4" />
                )}
                {isBackingUp ? "Backing up..." : "Trigger Manual Backup"}
              </Button>
               {lastBackup && (
                  <p className="text-xs text-center text-muted-foreground">
                    Last backup: {lastBackup.toLocaleString()}
                  </p>
               )}
            </div>
             <Separator/>
             <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" onClick={handleDownloadBackup} disabled={isDownloading} className="w-full">
                  {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                  Download All Data
                </Button>
             </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
              <Shield className="h-6 w-6" /> Security Settings
            </CardTitle>
            <CardDescription>
              Manage your administrator password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input 
                      id="newPassword" 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={isUpdatingPassword}
                      className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    disabled={isUpdatingPassword}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      disabled={isUpdatingPassword}
                      className="pr-10"
                  />
                   <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isUpdatingPassword}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
            </div>
             <Button onClick={handlePasswordChange} className="w-full" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
              Change Admin Password
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 pt-4">
        <DashboardCard
          title="Dashboard"
          description="Return to the main admin dashboard."
          icon={<LayoutDashboard className="h-8 w-8" />}
          linkHref="/admin/dashboard"
          linkText="Go to Dashboard"
        />
        <DashboardCard
          title="User Management"
          description="View and manage user accounts."
          icon={<UserCog className="h-8 w-8" />}
          linkHref="/admin/users"
          linkText="Manage Users"
        />
        <DashboardCard
          title="Platform Analytics"
          description="View detailed usage statistics."
          icon={<BarChartHorizontalBig className="h-8 w-8" />}
          linkHref="/admin/analytics"
          linkText="View Analytics"
        />
        <DashboardCard
          title="Global Search"
          description="Search for users, quizzes, and topics."
          icon={<Search className="h-8 w-8" />}
          linkHref="/admin/search"
          linkText="Search Platform"
        />
      </div>
    </div>
  );
}
