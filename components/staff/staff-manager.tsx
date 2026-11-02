"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreVertical,
  Plus,
  Search,
  Mail,
  Shield,
  User,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenuSeparator,
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

const ROLE_ICON: Record<StaffRole, React.ElementType> = {
  ADMIN: Shield,
  MANAGER: User,
  CASHIER: User,
};

function StaffCard({
  user,
  isSelf,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: {
  user: StaffUser;
  isSelf: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const RoleIcon = ROLE_ICON[user.role];
  const isActive = user.isActive;

  return (
    <Card
      className={cn(
        "flex flex-col transition-all hover:shadow-pop-md",
        !isActive && "opacity-60 border-destructive/30",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="size-6 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-semibold truncate">
                  {user.name}
                </CardTitle>
                {isSelf && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: "ghost", size: "icon" })}
              aria-label={`Actions for ${user.name}`}
            >
              <MoreVertical aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl p-1 w-48">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onResetPassword}>
                Reset password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isActive ? (
                <DropdownMenuItem
                  disabled={isSelf}
                  onClick={onDeactivate}
                  className="text-destructive focus:text-destructive"
                >
                  {isSelf ? "Deactivate (not your own account)" : "Deactivate"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={onReactivate}
                  className="text-success focus:text-success"
                >
                  Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>{" "}
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
            <RoleIcon className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="font-medium capitalize">
              {ROLE_LABEL[user.role].toLowerCase()}
            </span>
          </div>
          <Badge
            variant={isActive ? "secondary" : "destructive"}
            className={cn(
              "px-3 py-1.5",
              isActive
                ? "bg-teal-50 text-teal-800"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {isActive ? "Active" : "Deactivated"}
          </Badge>
        </div>

        {isActive && user.mustChangePassword && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            <span>Must change password on next sign in</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="size-3.5 shrink-0" aria-hidden />
          <span>Added {formatDateTime(user.createdAt)}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex justify-end gap-2">
        <Button variant="outline" size="sm" className="h-9" onClick={onEdit}>
          Edit
        </Button>
        {isActive ? (
          !isSelf && (
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={onDeactivate}
            >
              Deactivate
            </Button>
          )
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="h-9"
            onClick={onReactivate}
          >
            Reactivate
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-16">
      <User
        className="size-16 text-muted-foreground/50 mx-auto mb-4"
        aria-hidden
      />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {hasFilters ? "No staff match your filters" : "No staff members yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Get started by adding your first staff member."}
      </p>
      {hasFilters && (
        <Button
          variant="outline"
          className="h-10"
          onClick={() => window.location.reload()}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

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
      skipFirst.current = false;
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
  const hasFilters = search !== "" || role !== "all";

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
        <InputGroup className="h-11 max-w-sm min-w-60 flex-1 bg-card border-none focus-visible:border-3">
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
            className="h-11 data-[size=default]:h-11 w-44 bg-card"
            aria-label="Filter by role"
          >
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="p-2 w-fit rounded-xl">
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
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy={loading}
      >
        {items.length === 0 ? (
          <div className="col-span-full">
            <EmptyState hasFilters={hasFilters} />
          </div>
        ) : (
          items.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <StaffCard
                key={u.id}
                user={u}
                isSelf={isSelf}
                onEdit={() => {
                  setEditing(u);
                  setFormOpen(true);
                }}
                onResetPassword={() => setResetting(u)}
                onDeactivate={() => setDeactivating(u)}
                onReactivate={() => void setActive(u, true)}
              />
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <Pager
          meta={meta}
          count={items.length}
          loading={loading}
          onPage={setPage}
        />
      )}

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
