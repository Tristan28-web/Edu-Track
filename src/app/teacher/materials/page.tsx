
"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadMaterialsClient } from "./UploadMaterialsClient";
import { Library } from "lucide-react";

export default function LearningMaterialsPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
             <Library className="h-8 w-8" /> Upload & Manage Resources
          </CardTitle>
          <CardDescription>
            Upload PDF, DOCX, or PPTX files to share with your students. You can also archive old materials to hide them from the student view.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <UploadMaterialsClient />
    </div>
  );
}
