
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Target, Lightbulb, Users, CheckCircle, Award } from "lucide-react";
import { Logo } from "@/components/common/Logo";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-6 md:px-10 border-b">
        <Logo />
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 md:py-24 text-center bg-gradient-to-b from-background to-secondary/30">
          <div className="container mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-6">
              Master Grade 10 Math with Edu-Track
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto">
              Your personalized companion for interactive lessons, progress tracking, and AI-powered assistance. Ace your exams and build a strong foundation in mathematics.
            </p>
            <div className="space-x-4">
              <Button asChild variant="default" size="lg" className="font-semibold">
                <Link href="/login">Login to Get Started</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-headline font-bold text-center mb-12 text-primary/90">
              Why Choose Edu-Track?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<BookOpen className="w-10 h-10 text-primary" />}
                title="Interactive Lessons"
                description="Engage with lessons in Algebra, Geometry, and Trigonometry, complete with practice problems and quizzes."
              />
              <FeatureCard
                icon={<Target className="w-10 h-10 text-primary" />}
                title="Progress Tracker"
                description="Visualize your performance and mastery level in each topic with clear, intuitive metrics."
              />
              <FeatureCard
                icon={<Lightbulb className="w-10 h-10 text-primary" />}
                title="AI Math Assistant"
                description="Get instant help with math questions and step-by-step explanations from our AI tutor."
              />
              <FeatureCard
                icon={<Award className="w-10 h-10 text-primary" />}
                title="Challenge Problems"
                description="Test your skills with dynamically selected challenge problems to reinforce learning."
              />
              <FeatureCard
                icon={<CheckCircle className="w-10 h-10 text-primary" />}
                title="Curated Resources"
                description="Access a collection of external videos and practice websites to supplement your learning."
              />
              <FeatureCard
                icon={<Users className="w-10 h-10 text-primary" />}
                title="Personalized Experience"
                description="Save your progress and tailor your learning journey with your own user account."
              />
            </div>
          </div>
        </section>
        
        {/* Placeholder for additional sections if needed */}
        <section className="py-16 md:py-24 text-center bg-secondary/30">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl font-headline font-bold text-primary/90 mb-6">Ready to Elevate Your Math Skills?</h2>
                <p className="text-lg text-foreground/80 mb-8 max-w-xl mx-auto">
                    Log in to access your personalized dashboard and start your journey to success!
                </p>
                <Button asChild size="lg" className="font-semibold">
                    <Link href="/login">Access Your Account</Link>
                </Button>
            </div>
        </section>

      </main>

      <footer className="py-8 text-center border-t bg-background">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Edu-Track. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="items-center pb-4">
        {icon}
        <CardTitle className="font-headline text-xl mt-4 text-primary/90">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/70">{description}</p>
      </CardContent>
    </Card>
  );
}
