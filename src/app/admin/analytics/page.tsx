"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Activity,
  UserPlus,
  BarChart3,
  AlertTriangle,
  Loader2,
  LayoutDashboard,
  UserCog,
  Search,
  Settings,
  GraduationCap,
  Shield,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

interface AnalyticsData {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalPrincipals: number;
  activeUsersLast7Days: number;
  newRegistrationsThisMonth: number;
}

export default function PlatformAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalyticsData = async () => {
      if (!isMounted) return;
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");
        const allUsersSnapshot = await getDocs(usersCollectionRef);
        if (!isMounted) return;

        const totalUsers = allUsersSnapshot.size;
        let totalStudents = 0;
        let totalTeachers = 0;
        let totalPrincipals = 0;

        allUsersSnapshot.forEach((doc) => {
          const userRole = doc.data().role;
          if (userRole === "student") totalStudents++;
          if (userRole === "teacher") totalTeachers++;
          if (userRole === "principal") totalPrincipals++;
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsersSnapshot = await getDocs(
          query(
            usersCollectionRef,
            where("lastLogin", ">=", Timestamp.fromDate(sevenDaysAgo))
          )
        );

        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        const newRegistrationsSnapshot = await getDocs(
          query(
            usersCollectionRef,
            where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
          )
        );

        if (isMounted) {
            setAnalytics({
              totalUsers,
              totalStudents,
              totalTeachers,
              totalPrincipals,
              activeUsersLast7Days: activeUsersSnapshot.size,
              newRegistrationsThisMonth: newRegistrationsSnapshot.size,
            });
        }
      } catch (err: any) {
        console.error("Error fetching analytics:", err);
        if(isMounted) {
            setError(
              `Failed to load analytics data. Error: ${err.message}. Check Firestore indexes for 'users' collection on 'lastLogin' and 'createdAt' fields.`
            );
            toast({
              title: "Error",
              description: "Failed to load analytics data.",
              variant: "destructive",
            });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAnalyticsData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" /> Platform Analytics
          </CardTitle>
          <CardDescription>
            Overview of user activity for Edu-Track.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && !analytics && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Analytics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {analytics && (
        <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Users</CardTitle>
                  <Users className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                      {analytics?.totalUsers !== undefined ? <AnimatedCounter value={analytics.totalUsers} /> : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Students</CardTitle>
                  <GraduationCap className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                      {analytics?.totalStudents !== undefined ? <AnimatedCounter value={analytics.totalStudents} /> : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Teachers</CardTitle>
                  <UserCog className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                      {analytics?.totalTeachers !== undefined ? <AnimatedCounter value={analytics.totalTeachers} /> : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Principals</CardTitle>
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                      {analytics?.totalPrincipals !== undefined ? <AnimatedCounter value={analytics.totalPrincipals} /> : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Active Users (7 Days)</CardTitle>
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                       {analytics?.activeUsersLast7Days !== undefined ? <AnimatedCounter value={analytics.activeUsersLast7Days} /> : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">New Registrations (This Month)</CardTitle>
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                      {analytics?.newRegistrationsThisMonth !== undefined ? <AnimatedCounter value={analytics.newRegistrationsThisMonth} /> : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                title="Global Search"
                description="Search for users, quizzes, and topics."
                icon={<Search className="h-8 w-8" />}
                linkHref="/admin/search"
                linkText="Search Platform"
              />
              <DashboardCard
                title="System Settings"
                description="Configure platform-wide settings."
                icon={<Settings className="h-8 w-8" />}
                linkHref="/admin/settings"
                linkText="Configure Settings"
              />
            </div>
        </>
      )}
    </div>
  );
}
