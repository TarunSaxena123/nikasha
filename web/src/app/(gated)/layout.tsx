import type { ReactNode } from "react";
import { DisclaimerGate } from "@/components/legal/DisclaimerGate";

export default function GatedLayout({ children }: { children: ReactNode }) {
  return <DisclaimerGate>{children}</DisclaimerGate>;
}
