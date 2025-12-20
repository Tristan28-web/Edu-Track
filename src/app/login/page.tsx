"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/common/Logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="absolute top-6 left-6">
        <Logo />
      </div>
      <LoginForm />
       <footer className="absolute bottom-0 w-full py-4 text-center border-t bg-background">
        <p className="text-sm text-muted-foreground">
          © 2025 Edu-Track. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
