
"use client"; // Added "use client" as Link and event handlers are used.

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  ExternalLink, 
  FunctionSquare, 
  DivideSquare, 
  GitCompareArrows, 
  Baseline, 
  TrendingUp, 
  ListOrdered, 
  Dices, 
  BarChartHorizontalBig 
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const resources = [
  {
    id: "res-quadratic",
    title: "Mastering Quadratic Equations",
    type: "Khan Academy Section",
    topic: "Quadratic Equations and Functions",
    icon: <FunctionSquare className="h-6 w-6 text-primary" />,
    description: "Explore solving quadratic equations, graphing parabolas, and real-world applications using Khan Academy's comprehensive guide.",
    link: "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "parabola graph"
  },
  {
    id: "res-rational",
    title: "Understanding Rational Expressions",
    type: "Khan Academy Section",
    topic: "Rational Algebraic Expressions",
    icon: <DivideSquare className="h-6 w-6 text-primary" />,
    description: "Learn to simplify, operate on, and solve equations involving rational algebraic expressions with Khan Academy.",
    link: "https://www.khanacademy.org/math/algebra2/x2ec2f6f830c9fb89:rational",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "algebra fraction"
  },
  {
    id: "res-variation",
    title: "Direct, Inverse, and Joint Variation",
    type: "Online Guide",
    topic: "Variation",
    icon: <GitCompareArrows className="h-6 w-6 text-primary" />,
    description: "A helpful guide from MathHints.com explaining direct, inverse, and joint variation with clear examples and formulas.",
    link: "https://mathhints.com/beginning-algebra/direct-inverse-and-joint-variation/",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "graph arrows"
  },
  {
    id: "res-polynomial",
    title: "Polynomial Functions Explained",
    type: "Online Guide",
    topic: "Polynomial Functions",
    icon: <Baseline className="h-6 w-6 text-primary" />,
    description: "A detailed guide from Cuemath explaining polynomial functions, their types, degrees, and how to graph them.",
    link: "https://www.cuemath.com/calculus/polynomial-functions/",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "function graph"
  },
  {
    id: "res-expo-log",
    title: "Logarithms and Exponential Functions Guide",
    type: "Online Guide",
    topic: "Exponential and Logarithmic Functions",
    icon: <TrendingUp className="h-6 w-6 text-primary" />,
    description: "A comprehensive guide from Math LibreTexts covering the properties and applications of logarithms and exponential functions.",
    link: "https://math.libretexts.org/Bookshelves/Precalculus/APEX_PreCalculus_(Chapman_Herald_and_Libertini)/01%3A_Numbers_and_Functions/1.05%3A_Logarithms_and_Exponential_Functions",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "growth curve"
  },
  {
    id: "res-sequences",
    title: "Sequences and Series (Grade 10)",
    type: "YouTube Video",
    topic: "Sequences and Series",
    icon: <ListOrdered className="h-6 w-6 text-primary" />,
    description: "A detailed video covering arithmetic and geometric sequences and series, aligned with the Grade 10 curriculum.",
    link: "https://www.youtube.com/watch?v=7sGZBlidHaQ",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "number pattern"
  },
  {
    id: "res-probability",
    title: "Introduction to Probability",
    type: "Khan Academy Section",
    topic: "Probability",
    icon: <Dices className="h-6 w-6 text-primary" />,
    description: "Understand counting principles, permutations, combinations, and basic probability concepts with Khan Academy.",
    link: "https://www.khanacademy.org/math/statistics-probability/counting-permutations-and-combinations",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "dice cards"
  },
  {
    id: "res-statistics",
    title: "Statistics Fundamentals",
    type: "Khan Academy Section",
    topic: "Statistics",
    icon: <BarChartHorizontalBig className="h-6 w-6 text-primary" />,
    description: "Learn measures of central tendency, variability, and how to interpret statistical data effectively with Khan Academy.",
    link: "https://www.khanacademy.org/math/statistics-probability/summarizing-quantitative-data",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "data chart"
  },
  {
    id: "res-general-practice",
    title: "Grade 10 Math Full Course",
    type: "YouTube Playlist",
    topic: "General",
    icon: <ExternalLink className="h-6 w-6 text-primary" />,
    description: "A comprehensive YouTube playlist covering a wide range of Grade 10 math topics to support your learning journey.",
    link: "https://www.youtube.com/playlist?list=PLPPsDIdbG32AXjKv2cr_bKEM7YcEfR4iE",
    imageSrc: "https://placehold.co/600x300.png",
    aiHint: "math problems worksheet"
  },
];

export default function LearningResourcesPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Learning Resources</CardTitle>
          <CardDescription>Curated external videos, websites, and practice materials to enhance your Grade 10 Math skills across all topics.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {resources.map((resource) => (
          <Card key={resource.id} className="shadow-md hover:shadow-lg transition-shadow">
            <div>
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                  {resource.icon}
                  <div>
                    <CardTitle className="text-xl font-headline text-primary/90">{resource.title}</CardTitle>
                    <Badge variant="outline" className="mt-1">{resource.topic} - {resource.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground/70 leading-relaxed">{resource.description}</p>
                  {resource.link === "#" ? (
                    <Button variant="default" className="group" disabled>
                      {resource.type.includes("Video") || resource.type.includes("Playlist") ? <Video className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                      Resource Coming Soon
                    </Button>
                  ) : (
                    <Button asChild variant="default" className="group">
                      <Link href={resource.link} target="_blank" rel="noopener noreferrer">
                        {resource.type.includes("Video") || resource.type.includes("Playlist") ? <Video className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                        Access Resource
                        <ExternalLink className="h-4 w-4 ml-2 opacity-70 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
