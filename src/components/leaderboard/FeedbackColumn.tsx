"use client";

import { TrendingUp, Award, BookOpen, Brain, ThumbsUp } from "lucide-react";

interface FeedbackColumnProps {
  score: number;
}

export function FeedbackColumn({ score }: FeedbackColumnProps) {
  if (score >= 95) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Award className="h-4 w-4" />
        <span className="text-sm font-medium">Excellent work! True mastery.</span>
      </div>
    );
  }
  if (score >= 85) {
    return (
      <div className="flex items-center gap-2 text-cyan-600">
        <ThumbsUp className="h-4 w-4" />
        <span className="text-sm font-medium">Great job! You're an expert.</span>
      </div>
    );
  }
  if (score >= 75) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm font-medium">Very good! Keep practicing to excel.</span>
      </div>
    );
  }
  if (score >= 50) {
    return (
      <div className="flex items-center gap-2 text-yellow-600">
        <Brain className="h-4 w-4" />
        <span className="text-sm font-medium">Good effort! Review the materials to improve.</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-orange-600">
      <BookOpen className="h-4 w-4" />
      <span className="text-sm font-medium">Keep trying! Revisiting lessons will help.</span>
    </div>
  );
}
