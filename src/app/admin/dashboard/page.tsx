
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useAuth } from '@/contexts/AuthContext';
import { UserCog, Settings, BarChartHorizontalBig, Loader2, Users, GraduationCap, Activity, Shield, AlertTriangle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { AppUser } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DashboardData {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalPrincipals: number;
  activeUsersLast7Days: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentUsers, setRecentUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (user.role !== 'admin') {
      setError("You must be an administrator to view this page.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setError(null);
    setIsLoading(true);

    const fetchStats = async () => {
      try {
        const usersCollectionRef = collection(db, "users");

        const allUsersSnapshot = await getDocs(usersCollectionRef);
        if (!isMounted) return;

        let totalStudents = 0;
        let totalTeachers = 0;
        let totalPrincipals = 0;
        allUsersSnapshot.forEach(doc => {
          const userRole = doc.data().role;
          if (userRole === 'teacher') totalTeachers++;
          if (userRole === 'student') totalStudents++;
          if (userRole === 'principal') totalPrincipals++;
        });
        const totalUsers = allUsersSnapshot.size;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);
        const activeUsersQuery = query(usersCollectionRef, where("lastLogin", ">=", sevenDaysAgoTimestamp));
        const activeUsersSnapshot = await getDocs(activeUsersQuery);
        if (!isMounted) return;
        
        setDashboardData({
          totalUsers,
          totalStudents,
          totalTeachers,
          totalPrincipals,
          activeUsersLast7Days: activeUsersSnapshot.size,
        });
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
        const detailedError = "Failed to load dashboard statistics. Check Firestore indexes for 'lastLogin'.";
        if(isMounted) setError(prev => (prev ? `${prev}\n${detailedError}` : detailedError));
      }
    };
    
    const recentUsersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5));
    const unsubscribe = onSnapshot(recentUsersQuery, (snapshot) => {
        const fetchedRecentUsers: AppUser[] = [];
        snapshot.forEach((docInstance) => {
          const data = docInstance.data();
          fetchedRecentUsers.push({
            id: docInstance.id,
            ...data,
          } as AppUser);
        });
        if (isMounted) {
          setRecentUsers(fetchedRecentUsers);
          if (isLoading) setIsLoading(false);
        }
    }, (err: any) => {
        console.error("Error listening for recent users:", err);
        let detailedError = "Failed to load recent registrations in real-time.";
        if (err.code === 'failed-precondition') {
          detailedError += " This might be due to a missing Firestore index on 'createdAt'.";
        }
        if (isMounted) {
          setError(prev => (prev ? `${prev}\n${detailedError}` : detailedError));
          if (isLoading) setIsLoading(false);
        }
    });

    fetchStats();

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
          Administrator Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user?.displayName || 'Admin'}! From here you can oversee and manage the entire Edu-Track platform.
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
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.totalUsers ?? '...'}</div></CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.totalStudents ?? '...'}</div></CardContent>
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
            <CardTitle className="text-sm font-medium">Total Principals</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.totalPrincipals ?? '...'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (7 Days)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardData?.activeUsersLast7Days ?? '...'}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Registrations */}
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Registrations</CardTitle>
                    <CardDescription>The most recent users who joined the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentUsers.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Display Name</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead className="hidden md:table-cell">Registered</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                          {recentUsers.map((u) => (
                              <TableRow key={u.id}>
                                  <TableCell>{u.displayName || 'N/A'}</TableCell>
                                  <TableCell>
                                      <Badge
                                      variant={u.role === 'admin' ? 'destructive' : u.role === 'teacher' ? 'secondary' : 'default'}
                                      className="capitalize"
                                      >
                                      {u.role}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-xs">
                                      {u.createdAt && u.createdAt instanceof Timestamp
                                      ? format(u.createdAt.toDate(), 'PP')
                                      : 'N/A'}
                                  </TableCell>
                              </TableRow>
                          ))}
                          </TableBody>
                      </Table>
                    </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No recent user registrations found.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Management Links */}
        <div className="space-y-6">
            <DashboardCard
            title="User Management"
            description="Manage all user accounts."
            icon={<Users className="h-8 w-8" />}
            linkHref="/admin/users"
            linkText="Manage Users"
            />
            <DashboardCard
            title="System Settings"
            description="Configure platform-wide settings."
            icon={<Settings className="h-8 w-8" />}
            linkHref="/admin/settings"
            linkText="Configure Settings"
            />
            <DashboardCard
            title="Platform Analytics"
            description="View more detailed usage statistics."
            icon={<BarChartHorizontalBig className="h-8 w-8" />}
            linkHref="/admin/analytics"
            linkText="View Detailed Analytics"
            />
        </div>
      </div>
    </div>
  );
}
