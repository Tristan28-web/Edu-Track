
import type { ReactNode } from 'react';
import { Award, CheckSquare, BookOpen, Zap, Brain, TrendingUp, Target, Crown, Flame } from 'lucide-react'; // Added more icons for variety

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  topicSlug?: string; // Optional: to link achievements to specific topic mastery
}

export const allAchievementDefinitions: AchievementDefinition[] = [
  // Mastery Achievements
  { id: "quadratic-champ", name: "Quadratic Champion", description: "Mastered Quadratic Equations & Functions.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "quadratic-equations-functions" },
  { id: "rational-ruler", name: "Rational Ruler", description: "Conquered Rational Algebraic Expressions.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "rational-algebraic-expressions" },
  { id: "variation-virtuoso", name: "Variation Virtuoso", description: "Excelled in Variation concepts.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "variation" },
  { id: "poly-pro", name: "Polynomial Pro", description: "Dominated Polynomial Functions.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "polynomial-functions" },
  { id: "expo-log-expert", name: "Expo/Log Expert", description: "Aced Exponential & Logarithmic Functions.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "exponential-logarithmic-functions" },
  { id: "sequence-star", name: "Sequence Star", description: "Shined in Sequences & Series.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "sequences-series" },
  { id: "proba-pioneer", name: "Probability Pioneer", description: "Navigated Probability concepts well.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "probability" },
  { id: "stats-savant", name: "Statistics Savant", description: "Interpreted Statistics like a true expert.", icon: <Award className="h-5 w-5 text-yellow-500" />, topicSlug: "statistics" },
  
  // General Learning Achievements
  { id: "topic-starter", name: "Topic Starter", description: "Marked first lesson content as viewed.", icon: <BookOpen className="h-5 w-5 text-green-500" /> },
  { id: "first-quiz-completed", name: "Quiz Navigator", description: "Completed your first quiz!", icon: <CheckSquare className="h-5 w-5 text-teal-500" /> },
  { id: "challenge-seeker", name: "Challenge Seeker", description: "Attempted 5 challenge problems.", icon: <Zap className="h-5 w-5 text-blue-500" /> },
  { id: "ai-learner", name: "AI Learner", description: "Used the AI Math Assistant 5 times.", icon: <Brain className="h-5 w-5 text-purple-500" /> },

  // New Gamified Achievements
  { id: "accuracy-master", name: "Accuracy Master", description: "Score 90% or higher in 5 different quizzes.", icon: <Target className="h-5 w-5 text-red-600" /> },
  { id: "consistency-king", name: "Consistency King/Queen", description: "Take at least one quiz every week for a month.", icon: <Crown className="h-5 w-5 text-amber-500" /> },
  { id: "comeback-kid", name: "Comeback Kid", description: "Improve your score by 20% between two attempts of the same quiz.", icon: <Flame className="h-5 w-5 text-orange-500" /> },
];
