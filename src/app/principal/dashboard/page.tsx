
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from '@/contexts/AuthContext';
import { UserCog, Users, GraduationCap, Loader2, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { AppUser } from "@/types";

interface PrincipalDashboardData {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
}

export default function PrincipalDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<PrincipalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'principal') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");
        
        const allUsersSnapshot = await getDocs(usersCollectionRef);
        let totalStudents = 0;
        let totalTeachers = 0;

        allUsersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.role === 'teacher') totalTeachers++;
          if (userData.role === 'student') totalStudents++;
        });

        setDashboardData({
          totalUsers: allUsersSnapshot.size,
          totalStudents,
          totalTeachers,
        });

      } catch (err: any) {
        console.error("Error fetching principal dashboard data:", err);
        setError("Failed to load dashboard data. Please check your connection and permissions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-headline font-semibold text-primary">
          Principal Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user?.displayName || 'Principal'}! This is your high-level overview of the Edu-Track platform.
        </p>
      </div>

      {error && (
         <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.totalUsers ?? '...'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.totalTeachers ?? '...'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.totalStudents ?? '...'}</div></CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          <DashboardCard
              title="Progress Overview"
              description="View school-wide academic performance."
              icon={<TrendingUp className="h-8 w-8" />}
              linkHref="/principal/progress-overview"
              linkText="View Progress"
          />
          <DashboardCard
              title="Teacher Activity"
              description="Monitor teacher engagement and content creation."
              icon={<Activity className="h-8 w-8" />}
              linkHref="/principal/activity-monitoring"
              linkText="View Activity"
          />
          <DashboardCard
              title="Manage Teachers"
              description="View a roster of all teachers."
              icon={<UserCog className="h-8 w-8" />}
              linkHref="/principal/teachers"
              linkText="View Teachers"
          />
          <DashboardCard
              title="Manage Students"
              description="View a roster of all students."
              icon={<Users className="h-8 w-8" />}
              linkHref="/principal/students"
              linkText="View Students"
          />
      </div>

    </div>
  );
}
