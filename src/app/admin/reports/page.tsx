"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, GraduationCap, Users as UsersIcon } from "lucide-react";
import AdminPrincipalsPage from "../principals/page";
import AdminTeachersPage from "../teachers/page";
import AdminStudentsPage from "../students/page";

export default function UserReportsPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <UsersIcon className="h-8 w-8" /> User Reports
          </CardTitle>
          <CardDescription>
            View detailed profiles and activity reports for all users in the system.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="principals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="principals">
            <ShieldAlert className="mr-2 h-4 w-4" /> Principals
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <GraduationCap className="mr-2 h-4 w-4" /> Teachers
          </TabsTrigger>
          <TabsTrigger value="students">
            <UsersIcon className="mr-2 h-4 w-4" /> Students
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="principals" className="mt-6">
          <AdminPrincipalsPage />
        </TabsContent>
        <TabsContent value="teachers" className="mt-6">
          <AdminTeachersPage />
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          <AdminStudentsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
