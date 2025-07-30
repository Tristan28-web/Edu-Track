import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/common/Logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
       <div className="absolute top-6 left-6">
        <Logo />
      </div>
      <LoginForm />
    </div>
  );
}
