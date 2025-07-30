
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, Bell, Loader2, DatabaseBackup } from "lucide-react";

interface PlatformSettings {
  adminEmail: string;
  notifications: {
    sendWelcomeEmail: boolean;
    notifyTeacherSubmissions: boolean;
  };
  updatedAt?: Timestamp;
}

const defaultSettings: PlatformSettings = {
  adminEmail: "admin@edu-track.com",
  notifications: {
    sendWelcomeEmail: true,
    notifyTeacherSubmissions: true,
  },
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const settingsDocRef = doc(db, "platformSettings", "config");

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Ensure only relevant fields are set to state
          const loadedSettings: PlatformSettings = {
            adminEmail: data.adminEmail || defaultSettings.adminEmail,
            notifications: data.notifications || defaultSettings.notifications,
            updatedAt: data.updatedAt,
          };
          setSettings(loadedSettings);
        } else {
          await setDoc(settingsDocRef, { ...defaultSettings, updatedAt: Timestamp.now() });
          setSettings(defaultSettings);
          toast({
            title: "Settings Initialized",
            description: "Default platform settings have been configured.",
          });
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
  
  const handleSwitchChange = (category: keyof PlatformSettings, field: string, checked: boolean) => {
     setSettings(prev => {
      if (category === "notifications") {
        return {
          ...prev,
          [category]: {
            ...(prev[category] as any), 
            [field]: checked,
          },
        };
      }
      return { ...prev, [field]: checked } as PlatformSettings;
    });
  };


  const handleSaveGeneralSettings = async () => {
    setIsSavingGeneral(true);
    try {
      await setDoc(settingsDocRef, { adminEmail: settings.adminEmail, updatedAt: Timestamp.now() }, { merge: true });
      toast({
        title: "General Settings Saved",
        description: "Administrator email has been updated.",
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

  const handleSaveNotificationSettings = async () => {
    setIsSavingNotifications(true);
    try {
      await setDoc(settingsDocRef, { notifications: settings.notifications, updatedAt: Timestamp.now() }, { merge: true });
      toast({
        title: "Notification Settings Saved",
        description: "Notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Save Failed",
        description: "Could not save notification settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };
  
  const handleBackupData = () => {
    setIsBackingUp(true);
    // This is a placeholder for a backend operation.
    // In a real app, this would trigger a Cloud Function.
    setTimeout(() => {
        toast({
            title: "Backup Initiated",
            description: "The system data backup has started. This may take some time. You will be notified upon completion.",
        });
        setIsBackingUp(false);
    }, 2000);
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Settings className="h-8 w-8" /> System Settings
          </CardTitle>
          <CardDescription>
            Configure platform-wide settings and integrations for Edu-Track.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        {/* General Settings Card */}
        <Card>
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
                onChange={(e) => setSettings(prev => ({...prev, adminEmail: e.target.value}))}
                disabled={isSavingGeneral}
              />
            </div>
            <Button onClick={handleSaveGeneralSettings} className="w-full sm:w-auto" disabled={isSavingGeneral}>
              {isSavingGeneral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save General Settings
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
              <Bell className="h-6 w-6" /> Notification Settings
            </CardTitle>
            <CardDescription>Manage email notifications for users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="newUserNotifications" className="flex-grow">Send welcome email to new users</Label>
              <Switch 
                id="newUserNotifications" 
                checked={settings.notifications.sendWelcomeEmail}
                onCheckedChange={(checked) => handleSwitchChange('notifications', 'sendWelcomeEmail', checked)}
                disabled={isSavingNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="assignmentNotifications" className="flex-grow">Notify teachers of student submissions</Label>
              <Switch 
                id="assignmentNotifications" 
                checked={settings.notifications.notifyTeacherSubmissions}
                onCheckedChange={(checked) => handleSwitchChange('notifications', 'notifyTeacherSubmissions', checked)}
                disabled={isSavingNotifications}
              />
            </div>
            <Button onClick={handleSaveNotificationSettings} className="w-full sm:w-auto" disabled={isSavingNotifications}>
              {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
              <DatabaseBackup className="h-6 w-6" /> Data Backup & Restore
            </CardTitle>
            <CardDescription>Manage system data backups and restoration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
                <Label>Backup System Data</Label>
                <p className="text-xs text-muted-foreground mb-2">This will trigger a full backup of the Firestore database. This operation runs in the background.</p>
                <Button onClick={handleBackupData} disabled={isBackingUp}>
                    {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
                    {isBackingUp ? 'Backup in Progress...' : 'Backup All Data'}
                </Button>
            </div>
            <div>
                <Label>Restore System Data</Label>
                 <p className="text-xs text-muted-foreground mb-2">Restoring from a backup is a sensitive operation and will overwrite existing data. This is typically done through a secure, backend process.</p>
                <Button variant="destructive" disabled>
                    Restore from Backup
                </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
