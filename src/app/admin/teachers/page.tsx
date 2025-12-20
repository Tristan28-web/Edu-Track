"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, GraduationCap, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useInView } from 'react-intersection-observer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const PAGE_SIZE = 15;

export default function AdminTeachersPage() {
  const { user } = useAuth();
  const [allTeachers, setAllTeachers] = useState<AppUser[]>([]);
  const [visibleTeachers, setVisibleTeachers] = useState<AppUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setError("You must be an administrator to view this page.");
      setIsLoading(false);
      return;
    }

    const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"), orderBy("displayName", "asc"));
    
    const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
      const teacherList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setAllTeachers(teacherList);
      setVisibleTeachers(teacherList.slice(0, PAGE_SIZE));
      setPage(1);
      setHasMore(teacherList.length > PAGE_SIZE);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching teachers:", err);
      setError("Failed to load teacher list.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      const nextPage = page + 1;
      const newTeachers = allTeachers.slice(0, nextPage * PAGE_SIZE);
      setVisibleTeachers(newTeachers);
      setPage(nextPage);
      setHasMore(newTeachers.length < allTeachers.length);
    }
  }, [inView, hasMore, isLoading, allTeachers, page]);

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
  
  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'on_leave': return 'secondary';
      case 'deactivated': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTeachers.length > 0 ? (
                    visibleTeachers.map((teacher) => (
                       <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.displayName}</TableCell>
                        <TableCell>
                           <Badge variant={getStatusBadgeVariant(teacher.status)} className="capitalize">
                            {teacher.status?.replace('_', ' ') || 'Active'}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/teachers/${teacher.id}`}>
                                View Report <ChevronRight className="h-4 w-4 ml-2" />
                              </Link>
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                         No teachers found in the system.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
             {hasMore && (
                <div ref={ref} className="flex justify-center items-center py-4 mt-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
