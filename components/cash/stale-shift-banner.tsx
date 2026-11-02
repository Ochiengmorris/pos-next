import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function StaleShiftBanner() {
  return (
    <Alert>
      <AlertDescription className="text-foreground">
        Your shift has been open a long time. Please{" "}
        <Link
          href="/shift"
          className="font-medium underline underline-offset-2"
        >
          close it and open a new one
        </Link>{" "}
        when you finish today.
      </AlertDescription>
    </Alert>
  );
}
