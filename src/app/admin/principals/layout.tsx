
import type { ReactNode } from "react";

export default function AdminPrincipalsLayout({ children }: { children: ReactNode }) {
  // The AppLayout is provided by the parent admin layout.
  return <>{children}</>;
}
