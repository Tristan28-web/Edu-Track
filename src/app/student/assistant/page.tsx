import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssistantClient } from "./AssistantClient"; // Client component for interactivity
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
            Stuck on a Grade 10 math problem? Get instant, step-by-step help from our AI tutor.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <AssistantClient />
    </div>
  );
}
