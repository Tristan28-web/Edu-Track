"use client";


import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssistantClient } from "./AssistantClient";
import { AssistantFeatures } from "./AssistantFeatures";
import { Brain } from "lucide-react";

export default function AiAssistantPage() {

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
             <Brain className="h-8 w-8" /> AI Math Assistant
          </CardTitle>
          <CardDescription>
            Your personal AI tutor. Ask questions, generate practice problems, or get a hint if you're stuck.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
            <AssistantClient />
        </div>
        <div className="space-y-8">
            <AssistantFeatures />
        </div>
      </div>

    </div>
  );
}
