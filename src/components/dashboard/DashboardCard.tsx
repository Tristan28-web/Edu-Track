import * as React from "react"
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  linkHref: string;
  linkText?: string;
  className?: string;
  children?: ReactNode;
}

export function DashboardCard({
  title,
  description,
  icon,
  linkHref,
  linkText = "View Details",
  className,
  children
}: DashboardCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col", className)}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
        {icon && <div className="bg-primary/10 p-2 rounded-full text-primary">{icon}</div>}
        <div className="grid gap-1">
          <CardTitle className="font-headline text-xl text-primary/90">{title}</CardTitle>
          <CardDescription className="text-foreground/70">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {children}
      </CardContent>
      <CardContent className="pt-0"> {/* Use CardContent for consistent padding with Button */}
        <Button asChild variant="outline" className="w-full group mt-auto">
          <Link href={linkHref} className="flex items-center justify-between">
            {linkText}
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
