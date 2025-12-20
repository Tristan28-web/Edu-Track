'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md mx-4 text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-4">
                       <WifiOff className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-destructive">You are Offline</CardTitle>
                    <CardDescription>
                        It looks like you've lost your internet connection. This app has limited functionality while offline.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Please check your connection and try again. Some previously visited pages might be available.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
