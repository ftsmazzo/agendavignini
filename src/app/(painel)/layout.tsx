import type { ReactNode } from "react";
import { Casca } from "@/components/casca";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return <Casca>{children}</Casca>;
}
