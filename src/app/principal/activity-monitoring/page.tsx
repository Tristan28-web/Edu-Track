
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, TeacherActivity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Activity, BookOpenCheck, Library, UserPlus, CheckSquare, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const iconMap: { [key in TeacherActivity['type']]: React.ReactNode } = {
    quiz_created: <BookOpenCheck className="h-5 w-5 text-blue-500" />,
    lesson_material_created: <Library className="h-5 w-5 text-purple-500" />,
    student_registered: <UserPlus className="h-5 w-5 text-green-500" />,
    quiz_completion: <CheckSquare className="h-5 w-5 text-teal-500" />,
    content_viewed: <Eye className="h-5 w-5 text-gray-500" />,
    other: <Activity className="h-5 w-5 text-gray-500" />,
};

export default function PrincipalActivityMonitoringPage() {
  const [activities, setActivities] = useState<TeacherActivity[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { user: authUser } = useAuth();
  
  useEffect(() => {
    if (!authUser || authUser.role !== 'principal') {
      setIsLoading(false);
      if (authUser) setError("Accessing this page requires a principal login.");
      return;
    }

    const fetchTeachers = async () => {
        try {
            const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"), orderBy("displayName"));
            const snapshot = await getDocs(teachersQuery);
            setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
        } catch (err) {
            console.error("Error fetching teachers:", err);
            toast({ title: "Error", description: "Could not load teacher list for filtering.", variant: "destructive" });
        }
    };
    fetchTeachers();
    
    let activitiesQuery = query(collection(db, "teacherActivities"), orderBy("timestamp", "desc"));
    if (teacherFilter !== "all") {
        activitiesQuery = query(activitiesQuery, where("teacherId", "==", teacherFilter));
    }
    
    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const fetchedActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeacherActivity));
      setActivities(fetchedActivities);
      setIsLoading(false);
    }, (err: any) => {
      console.error("Error listening for activities:", err);
      let detailedError = "Failed to load activity stream in real-time.";
      if (err.code === 'failed-precondition') {
        detailedError += " This might be due to missing Firestore indexes.";
      }
      setError(detailedError);
      toast({ title: "Error Loading Stream", description: detailedError, variant: "destructive", duration: 10000 });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, teacherFilter]);

  const filteredActivities = useMemo(() => {
    if (!searchTerm) return activities;
    return activities.filter(activity => 
        activity.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.relatedItemTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activities, searchTerm]);

  const teacherMap = useMemo(() => {
    return teachers.reduce((acc, teacher) => {
        acc[teacher.id] = teacher.displayName || "Unknown Teacher";
        return acc;
    }, {} as Record<string, string>);
  }, [teachers]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Activity className="h-8 w-8" /> Teacher Activity Monitoring
          </CardTitle>
          <CardDescription>
            View a live stream of teacher activities across the platform.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input 
                        placeholder="Search activities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by teacher..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Teachers</SelectItem>
                            {teachers.map(teacher => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.displayName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="hidden md:table-cell">Teacher</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{iconMap[activity.type] || iconMap.other}</TableCell>
                    <TableCell>
                      <p className="font-medium">{activity.message}</p>
                      {activity.link && (
                        <Link href={activity.link} className="text-xs text-blue-500 hover:underline">
                          View Details
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{teacherMap[activity.teacherId] || 'N/A'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {activity.timestamp ? formatDistanceToNowStrict(activity.timestamp.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No activities found for the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
