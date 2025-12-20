
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScannerClient } from "./ScannerClient";
import { Camera } from "lucide-react";

export default function PhotoSolverPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
             <Camera className="h-8 w-8" /> Photo Solver
          </CardTitle>
          <CardDescription>
            Stuck on a problem from your book or worksheet? Snap a picture and let our AI help you solve it.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <ScannerClient />
    </div>
  );
}
