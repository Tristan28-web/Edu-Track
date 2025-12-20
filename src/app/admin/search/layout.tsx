
import type { ReactNode } from "react";

export default function AdminSearchLayout({ children }: { children: ReactNode }) {
  // The main AdminLayout already provides the AppLayout wrapper.
  // This layout only needs to pass its children through.
  return <>{children}</>;
}
