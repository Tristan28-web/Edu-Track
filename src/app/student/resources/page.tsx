"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResourceClient } from "./ResourceClient";
import { Library } from "lucide-react";

export default function ResourcesPage() {

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
             <Library className="h-8 w-8" /> Learning Resources
          </CardTitle>
          <CardDescription>
            Download lesson materials, presentations, and documents uploaded by your teacher.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <ResourceClient />
    </div>
  );
}
