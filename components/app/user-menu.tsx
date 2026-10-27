"use client";

import { useState, useTransition } from "react";
import { ChevronsUpDown, KeyRound, Loader2, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ChangePasswordDialog } from "@/components/app/change-password-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/access";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
};

function getInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]) // safe for non-BMP characters
    .join("")
    .toUpperCase();

  return letters || "?";
}

type UserMenuProps = {
  name: string;
  email: string;
  role: Role;
};

export function UserMenu({ name, email, role }: UserMenuProps) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const router = useRouter();

  const displayName = name.trim() || email;
  const roleLabel = ROLE_LABEL[role] ?? role;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={`Account menu for ${displayName}`}
          className="flex max-w-full items-center gap-3 rounded-full p-1.5 pr-2 outline-none transition-colors hover:bg-accent group focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:bg-accent"
        >
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {getInitials(displayName)}
          </span>
          <span className="hidden min-w-0 group-hover:font-semibold group-hover:text-muted text-left leading-tight sm:block">
            <span className="block truncate text-sm font-semibold">
              {displayName}
            </span>
            <span className="block truncate text-xs group-hover:text-muted text-muted-foreground">
              {roleLabel}
            </span>
          </span>
          <ChevronsUpDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60 rounded-xl">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
              <KeyRound aria-hidden />
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              // keep the menu open so the pending state is visible
              closeOnClick={false}
              onClick={() => {
                startSignOut(async () => {
                  try {
                    // redirect: false so the toast isn't lost to a full page reload
                    await signOut({ redirect: false });
                    toast.success("Signed out successfully");
                    router.replace("/login");
                    router.refresh();
                  } catch {
                    toast.error("Couldn't sign you out. Please try again.");
                  }
                });
              }}
            >
              {isSigningOut ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <LogOut aria-hidden />
              )}
              {isSigningOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
}
