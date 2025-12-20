import { LandingHeader } from "@/components/landing/LandingHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LifeBuoy, Mail, Phone } from "lucide-react";

const faqsData = {
  student: [
    {
      question: "How do I see my progress?",
      answer: "You can view your progress by navigating to the 'My Progress' page from the sidebar. It shows your mastery level for each topic and your recent quiz scores."
    },
    {
      question: "How do I use the AI Math Assistant?",
      answer: "Go to the 'AI Assistant' page. You can type in any Grade 10 math question to get a step-by-step solution, or use the other features to generate practice problems or hints."
    },
    {
        question: "A topic is locked. How do I unlock it?",
        answer: "You must complete the quiz for the previous topic with a score of 75% or higher to unlock the next topic in the learning path."
    }
  ],
  teacher: [
    {
      question: "How do I create a new quiz?",
      answer: "Go to the 'Manage Quizzes' page and click the 'Create New' button. You can add questions manually or use the AI generator to create them for you."
    },
    {
      question: "How do I see my students' results?",
      answer: "From the 'Manage Quizzes' page, you can click the 'Results' button on any active quiz to see a real-time list of student submissions and their scores."
    }
  ],
  principal: [
    {
      question: "How do I monitor teacher activity?",
      answer: "The 'Teacher Activity Monitor' page provides a live feed of significant actions taken by teachers, such as creating quizzes or registering students."
    },
    {
        question: "Where can I see an overview of school performance?",
        answer: "The Principal Dashboard provides high-level statistics, including student and teacher counts, average mastery scores by section, and identifies at-risk sections."
    }
  ],
   admin: [
    {
      question: "How do I create a new user account?",
      answer: "Navigate to the 'User Management' page. From there, you can click 'Add New Staff' to create principals, teachers, or other admins. Student accounts must be created by their assigned teacher."
    },
    {
        question: "How do I backup the platform data?",
        answer: "Go to 'System Settings'. In the 'Data Backup' card, you can trigger a manual backup record or download a JSON backup of all major data collections."
    }
  ]
};

export default function HelpPage() {

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow container mx-auto px-6 py-16">
        <section className="text-center mb-16">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
            <LifeBuoy className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
            Help & Support
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto">
            Find answers to common questions and learn how to get in touch with our support team.
          </p>
        </section>

        <div className="grid md:grid-cols-12 gap-12">
            <div className="md:col-span-8">
                 <h2 className="text-2xl font-headline font-bold mb-6 text-primary/90">Frequently Asked Questions</h2>
                <Accordion type="multiple" className="w-full">
                    <AccordionItem value="student-faq">
                        <AccordionTrigger className="text-lg font-semibold">For Students</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                           {faqsData.student.map((faq, i) => (
                                <div key={`student-${i}`}>
                                    <h4 className="font-semibold">{faq.question}</h4>
                                    <p className="text-muted-foreground">{faq.answer}</p>
                                </div>
                           ))}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="teacher-faq">
                        <AccordionTrigger className="text-lg font-semibold">For Teachers</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                             {faqsData.teacher.map((faq, i) => (
                                <div key={`teacher-${i}`}>
                                    <h4 className="font-semibold">{faq.question}</h4>
                                    <p className="text-muted-foreground">{faq.answer}</p>
                                </div>
                           ))}
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="principal-faq">
                        <AccordionTrigger className="text-lg font-semibold">For Principals</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                           {faqsData.principal.map((faq, i) => (
                                <div key={`principal-${i}`}>
                                    <h4 className="font-semibold">{faq.question}</h4>
                                    <p className="text-muted-foreground">{faq.answer}</p>
                                </div>
                           ))}
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="admin-faq">
                        <AccordionTrigger className="text-lg font-semibold">For Admins</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                           {faqsData.admin.map((faq, i) => (
                                <div key={`admin-${i}`}>
                                    <h4 className="font-semibold">{faq.question}</h4>
                                    <p className="text-muted-foreground">{faq.answer}</p>
                                </div>
                           ))}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            <div className="md:col-span-4">
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Contact Support</CardTitle>
                        <CardDescription>Can't find an answer? Reach out to us.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-4">
                            <Mail className="h-6 w-6 text-primary" />
                            <div>
                                <h4 className="font-semibold">Email Support</h4>
                                <a href="mailto:tristanjayrebadomia@gmail.com" className="text-sm text-muted-foreground hover:underline">tristanjayrebadomia@gmail.com</a>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <Phone className="h-6 w-6 text-primary" />
                            <div>
                                <h4 className="font-semibold">Phone Support</h4>
                                <p className="text-sm text-muted-foreground">(+63) 995 058 1149</p>
                            </div>
                         </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
      </main>

      <footer className="py-4 text-center border-t bg-background mt-16">
        <p className="text-sm text-muted-foreground">
          © 2025 Edu-Track. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
