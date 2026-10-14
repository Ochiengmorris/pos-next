"use client";

import { useState } from "react";
import { ChevronsUpDown, KeyRound, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ChangePasswordDialog } from "@/components/app/change-password-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/access";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg p-1.5 pr-2 outline-none transition hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <span className="grid size-9 place-items-center rounded-full bg-accent border text-sm font-semibold ">
            {initials(name)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold">{name}</span>
            <span className="block text-xs text-muted-foreground">
              {ROLE_LABEL[role]}
            </span>
          </span>
          <ChevronsUpDown
            className="size-4 text-muted-foreground"
            aria-hidden
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <div className="px-2 py-2">
            <p className="text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound aria-hidden />
            Change password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut({ redirectTo: "/login" })}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
}
