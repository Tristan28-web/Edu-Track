import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { GraduationCap, UserCog, Shield } from "lucide-react";


function RoleCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="text-center shadow-sm hover:shadow-lg transition-shadow duration-300 bg-background">
      <CardHeader className="items-center pb-4">
        <div className="bg-primary/10 p-4 rounded-full mb-2">
            {icon}
        </div>
        <CardTitle className="font-headline text-xl mt-2 text-primary/90">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/70">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow">
        <section className="py-16 md:py-24 text-center bg-gradient-to-b from-background to-blue-50 dark:to-primary/10">
          <div className="container mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-6">
              Unlock Your Math Potential with Edu-Track
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto">
              Your personalized companion for interactive lessons, progress tracking, and AI-powered assistance. Ace your exams and build a strong foundation in mathematics.
            </p>
            <div className="space-x-4">
               <Button asChild size="lg" className="font-semibold">
                  <Link href="/login">Access Your Account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-blue-50/50 dark:bg-primary/10">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-headline font-bold text-primary/90 mb-4">For Every Role in Education</h2>
                    <p className="text-lg text-foreground/80 mb-12">
                        Edu-Track is designed to meet the unique needs of everyone in your educational institution. Find out how we can help you succeed.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <RoleCard
                        icon={<GraduationCap className="h-8 w-8 text-primary" />}
                        title="For Students"
                        description="Engage with interactive lessons, take dynamic quizzes, and get instant help from our AI Math Assistant to master complex topics at your own pace."
                    />
                    <RoleCard
                        icon={<UserCog className="h-8 w-8 text-primary" />}
                        title="For Teachers"
                        description="Easily create and manage quizzes, upload learning materials, monitor student progress in real-time, and communicate seamlessly with your classes."
                    />
                    <RoleCard
                        icon={<Shield className="h-8 w-8 text-primary" />}
                        title="For Administrators & Principals"
                        description="Gain a high-level overview of school-wide performance with powerful analytics, manage user accounts, and ensure platform integrity with robust tools."
                    />
                </div>
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
