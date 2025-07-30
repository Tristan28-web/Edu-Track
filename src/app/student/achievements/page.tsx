
"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Award, CheckCircle, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { allAchievementDefinitions, type AchievementDefinition } from '@/config/achievements.tsx';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { user, loading: authIsLoading } = useAuth();
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setPageIsLoading(true);

    if (authIsLoading) {
      return;
    }

    if (!user) {
      if (isMounted) {
        setError("Please log in to view your achievements.");
        setPageIsLoading(false);
      }
      return;
    }

    const fetchAchievements = async () => {
      if (isMounted) setError(null);
      try {
        const userDocRef = doc(db, "users", user.id);
        const userDocSnap = await getDoc(userDocRef);

        if (!isMounted) return;

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const ids = userData.unlockedAchievementIds as string[] || [];
          if (isMounted) {
            setUnlockedAchievementIds(ids);
          }
        } else {
          if (isMounted) setError("User data not found. Cannot load achievements.");
        }
      } catch (e: any) {
        if (isMounted) {
          console.error("Error fetching achievements data:", e);
          setError(`Failed to load achievements: ${e.message}`);
        }
      } finally {
        if (isMounted) setPageIsLoading(false);
      }
    };

    fetchAchievements();

    return () => {
      isMounted = false;
    };
  }, [user, authIsLoading]);

  const unlockedAchievements = allAchievementDefinitions.filter(achDef => unlockedAchievementIds.includes(achDef.id));
  const lockedAchievements = allAchievementDefinitions.filter(achDef => !unlockedAchievementIds.includes(achDef.id));

  if (pageIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading achievements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!user && !authIsLoading) {
     return (
      <Alert variant="default">
        <AlertTitle>Not Logged In</AlertTitle>
        <AlertDescription>Please log in to view your achievements.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Award className="h-8 w-8" /> Your Achievements
          </CardTitle>
          <CardDescription>Track your accomplishments and milestones in Grade 10 Math.</CardDescription>
        </CardHeader>
      </Card>

      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary/90">Unlocked Achievements</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unlockedAchievements.map(ach => (
              <div key={ach.id} className="p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 flex items-start space-x-3 shadow">
                <div className="text-green-500 mt-1">{ach.icon}</div>
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-300">{ach.name}</h3>
                  <p className="text-sm text-green-600 dark:text-green-400">{ach.description}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 ml-auto flex-shrink-0 mt-1"/>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {lockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-muted-foreground">Locked Achievements</CardTitle>
            <CardDescription>Keep learning to unlock these!</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lockedAchievements.map(ach => (
              <div key={ach.id} className="p-4 rounded-lg border bg-muted/30 dark:bg-muted/20 border-border flex items-start space-x-3 opacity-70">
                 <div className="text-muted-foreground mt-1">{React.cloneElement(ach.icon as React.ReactElement, { className: cn((ach.icon as React.ReactElement).props.className, "text-muted-foreground") })}</div>
                <div>
                  <h3 className="font-semibold text-foreground/80">{ach.name}</h3>
                  <p className="text-sm text-muted-foreground">{ach.description}</p>
                </div>
                <Lock className="h-5 w-5 text-muted-foreground ml-auto flex-shrink-0 mt-1"/>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {unlockedAchievements.length === 0 && lockedAchievements.length === 0 && !pageIsLoading && (
         <Card>
            <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">No achievements defined yet.</p>
            </CardContent>
         </Card>
      )}
    </div>
  );
}
