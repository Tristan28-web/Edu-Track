
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, UserPlus, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

interface AnalyticsData {
  totalUsers: number;
  activeUsersLast7Days: number;
  newRegistrationsThisMonth: number;
}

export default function PlatformAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");

        // Total Users
        const allUsersSnapshot = await getDocs(usersCollectionRef);
        const totalUsers = allUsersSnapshot.size;

        // Active Users (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);
        
        const activeUsersQuery = query(usersCollectionRef, where("lastLogin", ">=", sevenDaysAgoTimestamp));
        const activeUsersSnapshot = await getDocs(activeUsersQuery);
        const activeUsersLast7Days = activeUsersSnapshot.size;

        // New Registrations (This Month)
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);

        const newRegistrationsQuery = query(usersCollectionRef, where("createdAt", ">=", startOfMonthTimestamp));
        const newRegistrationsSnapshot = await getDocs(newRegistrationsQuery);
        const newRegistrationsThisMonth = newRegistrationsSnapshot.size;
        
        setAnalytics({
          totalUsers,
          activeUsersLast7Days,
          newRegistrationsThisMonth,
        });

      } catch (err: any) {
        console.error("Error fetching analytics data:", err);
        setError(`Failed to load analytics data. Ensure 'lastLogin' and 'createdAt' fields (as Timestamps) exist on user documents in Firestore and that Firestore indexes are configured if prompted by console errors. Error: ${err.message}`);
        toast({ title: "Error", description: "Failed to load analytics data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error && !analytics) { // Only show full page error if no analytics data could be loaded at all
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <BarChart3 className="h-8 w-8" /> Platform Analytics
            </CardTitle>
            <CardDescription>
              Overview of user activity and platform health for Edu-Track.
            </CardDescription>
          </CardHeader>
        </Card>
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Analytics</AlertTitle>
          <AlertDescription>{error} You may need to create Firestore indexes for `users` collection on `lastLogin` and `createdAt` fields. Check your browser's developer console for a link to create them.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" /> Platform Analytics
          </CardTitle>
          <CardDescription>
            Overview of user activity for Edu-Track.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && analytics && ( // Show inline error if some data loaded but there was an issue
         <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Analytics Data Issue</AlertTitle>
            <AlertDescription>{error} Some analytics might be incomplete or inaccurate. You may need to create Firestore indexes for `users` collection on `lastLogin` and `createdAt` fields. Check your browser's developer console for a link to create them.</AlertDescription>
         </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalUsers ?? 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (Last 7 Days)</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeUsersLast7Days ?? 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Registrations (This Month)</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.newRegistrationsThisMonth ?? 'N/A'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
