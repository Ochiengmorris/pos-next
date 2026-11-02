"use client";

import { useRouter } from "next/navigation";
import { OpenShiftForm } from "@/components/cash/open-shift-form";

export function OpenShiftGate() {
  const router = useRouter();
  return (
    <div className="mx-auto grid max-w-md gap-4 pt-10">
      <div>
        <h1 className="text-2xl font-semibold">Open your shift</h1>
        <p className="text-sm text-muted-foreground">
          Count the cash in your drawer and enter it. You can start selling
          right after.
        </p>
      </div>
      <OpenShiftForm onOpened={() => router.refresh()} />
    </div>
  );
}
