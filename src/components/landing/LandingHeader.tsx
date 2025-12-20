"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
        <div className="flex-shrink-0">
          <Logo href="/" />
        </div>

        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap">
              About
            </Link>
            <Link href="/developers" className="text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap">
              Developers
            </Link>
            <Link href="/help" className="text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap">
              Help
            </Link>
          </nav>

           <Button asChild>
                <Link href="/login">
                  Log In
                </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
