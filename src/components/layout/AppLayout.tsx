
import { SidebarProvider } from '@/components/ui/sidebar';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <div className="print-hidden">
          <Sidebar />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="print-hidden">
            <Header />
          </div>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
          <footer className="py-4 px-6 text-center border-t bg-background print-hidden">
            <p className="text-sm text-muted-foreground">
              © 2025 Edu-Track. All Rights Reserved.
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
