import { LandingHeader } from "@/components/landing/LandingHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Users, BookOpen, Target, Lightbulb, TrendingUp } from "lucide-react";

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="items-center pb-4">
        <div className="bg-primary/10 p-3 rounded-full">
            {icon}
        </div>
        <CardTitle className="font-headline text-xl mt-4 text-primary/90">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/70">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow container mx-auto px-6 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
            About Edu-Track
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto">
            Edu-Track is a comprehensive educational platform designed to enhance the learning and teaching of Grade 10 Mathematics.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
                <h2 className="text-3xl font-headline font-bold text-primary/90 mb-4">Our Mission</h2>
                <p className="text-foreground/80 leading-relaxed">
                  To provide an engaging, accessible, and effective learning environment that empowers students to master mathematical concepts, supports teachers with robust tools, and offers administrators clear insights into academic progress.
                </p>
            </div>
             <div>
                <h2 className="text-3xl font-headline font-bold text-primary/90 mb-4">Our Vision</h2>
                <p className="text-foreground/80 leading-relaxed">
                  To be the leading digital companion for mathematics education, fostering a love for learning and creating a seamless connection between students, teachers, and school administrators to achieve academic excellence.
                </p>
            </div>
        </div>

        <section>
            <h2 className="text-3xl font-headline font-bold text-center mb-12 text-primary/90">
                What We Offer
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<BookOpen className="w-8 h-8 text-primary" />}
                title="Interactive Learning"
                description="Dynamic quizzes and lessons that adapt to student performance."
              />
              <FeatureCard
                icon={<Target className="w-8 h-8 text-primary" />}
                title="Progress Tracking"
                description="Real-time monitoring of student mastery and quiz results for teachers."
              />
              <FeatureCard
                icon={<Lightbulb className="w-8 h-8 text-primary" />}
                title="AI Assistance"
                description="An intelligent math assistant to help students solve problems and understand concepts."
              />
              <FeatureCard
                icon={<Users className="w-8 h-8 text-primary" />}
                title="Unified Platform"
                description="A single hub for students, teachers, and administrators to interact and manage learning."
              />
               <FeatureCard
                icon={<CheckCircle className="w-8 h-8 text-primary" />}
                title="Simplified Management"
                description="Easy tools for teachers to create content and for admins to manage users."
              />
               <FeatureCard
                icon={<TrendingUp className="w-8 h-8 text-primary" />}
                title="Actionable Analytics"
                description="Powerful dashboards for principals and admins to see school-wide trends."
              />
            </div>
        </section>
      </main>

      <footer className="py-4 text-center border-t bg-background">
        <p className="text-sm text-muted-foreground">
          © 2025 Edu-Track. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
