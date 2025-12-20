
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Card } from '@/components/ui/card';
import { mathTopics, type MathTopic } from '@/config/topics';
import { 
  FunctionSquare, 
  DivideSquare, 
  GitCompareArrows, 
  Baseline, 
  TrendingUp, 
  ListOrdered, 
  Dices, 
  BarChartHorizontalBig,
  Lock,
  Loader2,
  Calculator,
  Shapes
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppUser, UserProgressTopic } from '@/types';
import { Progress } from '@/components/ui/progress';

const topicIcons: { [key: string]: React.ReactNode } = {
    'algebra-and-polynomials': <Calculator className="h-8 w-8" />,
    'polynomial-functions': <Baseline className="h-8 w-8" />,
    'sequences-series': <ListOrdered className="h-8 w-8" />,
    'geometry': <Shapes className="h-8 w-8" />,
    'statistics-and-probability': <BarChartHorizontalBig className="h-8 w-8" />,
};

const UNLOCK_MASTERY_THRESHOLD = 75; 

export default function LessonsPage() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setDataLoading(false);
        return;
    }

    const unsub = onSnapshot(doc(db, "users", user.id), (doc) => {
        if (doc.exists()) {
            setUserData(doc.data() as AppUser);
        }
        setDataLoading(false);
    });

    return () => unsub();
  }, [user, authLoading]);

  const sortedTopics = [...mathTopics].sort((a, b) => a.order - b.order);

  const isTopicLocked = (topic: MathTopic): boolean => {
    if (topic.order === 1) return false; // First topic is always unlocked

    const previousTopicOrder = topic.order - 1;
    const previousTopic = sortedTopics.find(t => t.order === previousTopicOrder);
    
    if (!previousTopic) return true; // Should not happen in practice

    const progress = userData?.progress?.[previousTopic.slug];
    
    if (!progress) return true; // If no progress on previous topic, it's locked

    // Must have a mastery score >= threshold
    const hasSufficientMastery = (progress.mastery ?? 0) >= UNLOCK_MASTERY_THRESHOLD;

    return !hasSufficientMastery;
  };
  
  if (dataLoading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading lesson path...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-headline font-semibold text-primary">Interactive Math Lessons</h1>
        <p className="text-muted-foreground mt-1">
          Choose a topic to start learning. You must achieve {UNLOCK_MASTERY_THRESHOLD}% mastery on the previous topic's quizzes to unlock the next one.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedTopics.map((topic) => {
            const isLocked = isTopicLocked(topic);
            const progress = userData?.progress?.[topic.slug];
            const mastery = progress?.mastery ?? 0;

            return (
              <Card key={topic.slug} className={cn("shadow-sm flex flex-col justify-between", isLocked && "bg-muted/50 border-dashed")}>
                {isLocked ? (
                   <div className="flex flex-col items-center justify-center text-center p-6 h-full">
                      <Lock className="h-10 w-10 text-muted-foreground mb-3"/>
                      <h3 className="font-headline text-lg text-muted-foreground">{topic.title}</h3>
                      <p className="text-sm text-muted-foreground/80 mt-2">
                          Complete the previous topic to unlock.
                      </p>
                  </div>
                ) : (
                  <DashboardCard
                      title={topic.title}
                      description={topic.description || "Explore this math topic."}
                      icon={topicIcons[topic.slug] || <FunctionSquare className="h-8 w-8" />}
                      linkHref={`/student/lessons/${topic.slug}`}
                      linkText={`Explore ${topic.title}`}
                  >
                     {progress && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Mastery</label>
                           <div className="flex items-center gap-2">
                                <Progress value={mastery} className="h-2 flex-1" />
                                <span className="text-xs font-semibold w-10 text-right">{mastery}%</span>
                           </div>
                        </div>
                      )}
                  </DashboardCard>
                )}
              </Card>
            );
        })}
      </div>
    </div>
  );
}
