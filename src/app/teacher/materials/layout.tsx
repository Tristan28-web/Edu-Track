
import type { ReactNode } from "react";

export default function TeacherMaterialsLayout({ children }: { children: ReactNode }) {
  // The AppLayout is provided by the parent teacher layout.
  return <>{children}</>;
}
