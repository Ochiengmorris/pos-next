"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <Alert variant="destructive" className="mx-auto max-w-xl">
      <AlertCircle aria-hidden />
      <AlertDescription className="flex items-center justify-between gap-4">
        This page couldn&apos;t be loaded. Check that the server is running,
        then try again.
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            // re-fetch on the server, then re-render the page
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
