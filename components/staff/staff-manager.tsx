"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Pager } from "@/components/ui/pager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounced } from "@/hooks/use-debounced";
import { formatDateTime } from "@/lib/dashboard/format";
import {
  ROLE_LABEL,
  type StaffPage,
  type StaffRole,
  type StaffUser,
} from "@/lib/staff/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { StaffFormDialog } from "./staff-form-dialog";

const ROLE_VARIANT: Record<StaffRole, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  MANAGER: "secondary",
  CASHIER: "outline",
};

export function StaffManager({
  initialData,
  currentUserId,
}: {
  initialData: StaffPage;
  currentUserId: string;
}) {
  const call = useApi();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [resetting, setResetting] = useState<StaffUser | null>(null);
  const [deactivating, setDeactivating] = useState<StaffUser | null>(null);
  const [busy, setBusy] = useState(false);

  const debouncedSearch = useDebounced(search, 250);
  const skipFirst = useRef(true);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the server already gave us page 1
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({ page: String(page), limit: "20" });
        if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
        if (role !== "all") qs.set("role", role);
        const res = await call<StaffPage>(`/users?${qs}`);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load staff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, debouncedSearch, role, page, tick]);

  async function setActive(u: StaffUser, active: boolean) {
    setBusy(true);
    try {
      await call(`/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: active }),
      });
      toast.success(
        active ? `${u.name} can sign in again` : `${u.name} is deactivated`,
      );
      reload();
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update the account",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const { items, meta } = data;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        title="Staff"
        description="Who can sign in, and what they can do."
        actions={
          <Button
            type="button"
            className="h-11"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus aria-hidden /> Add staff member
          </Button>
        }
      />

      <div role="search" className="flex flex-wrap items-center gap-3">
        <InputGroup className="h-11 max-w-sm min-w-60 flex-1 bg-card">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email…"
            aria-label="Search staff"
            autoComplete="off"
          />
        </InputGroup>
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-11 w-44 bg-card"
            aria-label="Filter by role"
          >
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {error}
            <Button type="button" size="sm" variant="outline" onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          "rounded-xl border bg-card shadow-sm transition-opacity",
          loading && "opacity-60",
        )}
        aria-busy={loading}
      >
        <Table>
          <caption className="sr-only">Staff accounts</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Added</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-16 text-center text-muted-foreground"
                >
                  No staff match.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow
                    key={u.id}
                    className={cn(!u.isActive && "opacity-60")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {u.name}
                        {isSelf && <Badge variant="outline">You</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[u.role]}>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {u.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-teal-50 text-teal-800"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Deactivated</Badge>
                      )}
                      {u.isActive && u.mustChangePassword && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Must change password
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {formatDateTime(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon",
                          })}
                          aria-label={`Actions for ${u.name}`}
                        >
                          <MoreVertical aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(u);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetting(u)}>
                            Reset password
                          </DropdownMenuItem>
                          {u.isActive ? (
                            <DropdownMenuItem
                              disabled={isSelf}
                              onClick={() => setDeactivating(u)}
                            >
                              {isSelf
                                ? "Deactivate (not your own account)"
                                : "Deactivate"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => void setActive(u, true)}
                            >
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pager
        meta={meta}
        count={items.length}
        loading={loading}
        onPage={setPage}
      />

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        isSelf={editing?.id === currentUserId}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />
      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
      />

      <Dialog
        open={deactivating !== null}
        onOpenChange={(o) => !busy && !o && setDeactivating(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {deactivating?.name}?</DialogTitle>
            <DialogDescription>
              They can no longer sign in, and anyone currently signed in as them
              is signed out on their next action. Their past sales stay in the
              records. You can reactivate them any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={() => setDeactivating(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={busy}
              onClick={async () => {
                if (deactivating && (await setActive(deactivating, false)))
                  setDeactivating(null);
              }}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
