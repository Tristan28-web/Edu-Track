import { LandingHeader } from "@/components/landing/LandingHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

const developers = [
  {
    name: "Tristan Jay Rebaomia",
    role: "Full Stack Developer",
    image: "/img1.png",
  },
  {
    name: "Christalie Ann Cordero",
    role: "Front End Developer",
    image: "/img4.png",
  },
  {
    name: "Lovely Piano",
    role: "Front End Developer",
    image: "/img2.png",
  },
  {
    name: "Eljane Estrelles",
    role: "Front End Developer",
    image: "/img3.png",
  },
];

export default function DevelopersPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow container mx-auto px-6 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
            Meet the Developers
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto">
            The passionate team behind the creation and development of Edu-Track.
          </p>
        </section>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {developers.map((dev) => (
              <Card key={dev.name} className="text-center shadow-lg hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-2">
                <CardContent className="pt-6">
                  <div className="relative h-40 w-40 mx-auto rounded-full overflow-hidden border-4 border-primary/20">
                    <Image
                      src={dev.image}
                      alt={`Profile picture of ${dev.name}`}
                      layout="fill"
                      objectFit="cover"
                      className="grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  </div>
                </CardContent>
                <CardHeader>
                  <CardTitle className="font-headline text-xl text-primary/90">{dev.name}</CardTitle>
                  <CardDescription className="text-base">{dev.role}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-4 text-center border-t bg-background mt-16">
        <p className="text-sm text-muted-foreground">
          © 2025 Edu-Track. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
