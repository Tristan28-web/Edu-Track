
import type { ReactNode } from "react";

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  // The AppLayout (which includes the Sidebar) is already provided by the parent 
  // src/app/student/layout.tsx.
  // This layout should simply pass its children through.
  return <>{children}</>;
}
