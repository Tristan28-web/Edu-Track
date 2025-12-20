
import { Logo } from "@/components/common/Logo";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="absolute top-6 left-6">
         <Logo />
      </div>
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Student Registration</CardTitle>
            <CardDescription>
                Student accounts must be created by an assigned teacher.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-6">
                If you are a student, please contact your teacher to get your account credentials. You can then log in using the button below.
            </p>
            <Button asChild>
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go to Login
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
