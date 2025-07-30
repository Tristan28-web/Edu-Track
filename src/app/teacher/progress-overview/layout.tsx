
import type { ReactNode } from "react";

export default function TeacherProgressOverviewLayout({ children }: { children: ReactNode }) {
  // The AppLayout (which includes the Sidebar) is already provided by the parent
  // src/app/teacher/layout.tsx.
  // This layout should simply pass its children through.
  return <>{children}</>;
}
