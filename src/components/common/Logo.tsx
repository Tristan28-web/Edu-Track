
import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export function Logo({ size = 'md', href = '/' }: { size?: 'sm' | 'md' | 'lg', href?: string }) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <Link href={href} className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
      <GraduationCap className={`
        ${size === 'sm' ? 'h-6 w-6' : ''}
        ${size === 'md' ? 'h-8 w-8' : ''}
        ${size === 'lg' ? 'h-10 w-10' : ''}
      `} />
      <h1 className={`font-headline font-semibold ${sizeClasses[size]}`}>Edu-Track</h1>
    </Link>
  );
}
