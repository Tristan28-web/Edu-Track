"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { collection, addDoc } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import Link from 'next/link';

export default function AddTeacherPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!name || !email) {
        setError("Please fill in all fields.");
        setIsLoading(false);
        return;
    }

    try {
      // This is a simplified version. In a real app, you would use Firebase Auth 
      // to create a user and then add their details to Firestore.
      await addDoc(collection(db, "users"), {
        displayName: name,
        email: email,
        role: 'teacher',
        createdAt: new Date(),
      });

      setSuccess("Teacher added successfully! Redirecting...");
      setTimeout(() => {
        router.push('/principal/teachers');
      }, 2000);

    } catch (err) {
      console.error("Error adding teacher:", err);
      setError("Failed to add teacher. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
         <Card>
            <CardHeader>
                <Button asChild variant="outline" size="sm" className="mb-4 w-fit">
                    <Link href="/principal/teachers"><ArrowLeft className="mr-2 h-4 w-4" />Back to Teachers</Link>
                </Button>
                <CardTitle>Add New Teacher</CardTitle>
                <CardDescription>Enter the details for the new teacher account.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="e.g., Jane Doe"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="e.g., jane.doe@example.com"
                            disabled={isLoading}
                        />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add Teacher
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
