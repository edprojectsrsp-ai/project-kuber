import { useEffect, useState } from "react";
import { Bell, LifeBuoy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, useSession } from "@/lib/session";
import type { Person } from "@/lib/store/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function ContactAdministrator({
  compact = false,
}: {
  compact?: boolean;
}) {
  const user = useSession((s) => s.user)!;
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      disabled={busy || sent}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/password-help", {
            personnelNo: user.personnelNo,
            portal: user.role,
          });
          setSent(true);
          toast.success(
            "Password help requested. Your administrator has been notified.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <LifeBuoy className="size-4" />
      <span className={compact ? "hidden sm:inline" : ""}>
        {sent ? "Administrator notified" : "Contact administrator"}
      </span>
    </Button>
  );
}
export function AdminNotifications() {
  const [requests, setRequests] = useState<
      {
        id: number;
        name: string;
        personnelNo: string;
        person_id: string;
        requested_at: string;
      }[]
    >([]),
    [open, setOpen] = useState(false),
    [reset, setReset] = useState<Person | null>(null);
  const load = () =>
    api("/password-help")
      .then(setRequests)
      .catch(() => {});
  useEffect(() => {
    void load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <button
        className="notification-bell"
        aria-label={
          "Administrator notifications, " +
          requests.length +
          " password requests"
        }
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        {requests.length > 0 && <span>{requests.length}</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administrator notifications</DialogTitle>
            <DialogDescription>
              Users requesting password assistance.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60dvh] space-y-3 overflow-y-auto">
            {requests.map((r) => (
              <div className="rounded-xl border p-4" key={r.id}>
                <p className="font-medium">
                  {r.name} · {r.personnelNo}
                </p>
                <p className="my-2 text-xs text-muted-foreground">
                  Requested {new Date(r.requested_at).toLocaleString()}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setReset({
                      id: r.person_id,
                      name: r.name,
                      personnelNo: r.personnelNo,
                    } as Person)
                  }
                >
                  Reset password
                </Button>
              </div>
            ))}
            {!requests.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No pending password requests.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ResetPasswordDialog
        person={reset}
        onClose={() => {
          setReset(null);
          void load();
        }}
      />
    </>
  );
}
export function ResetPasswordDialog({
  person,
  onClose,
}: {
  person: Person | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const reset = async (useDefault: boolean) => {
    if (!person) return;
    setBusy(true);
    setError("");
    try {
      await api("/accounts/" + person.id + "/reset", { useDefault, password });
      setPassword("");
      toast.success(
        useDefault ? "Password reset to personnel number" : "Password reset",
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={!!person}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setPassword("");
          setError("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <KeyRound className="mr-2 inline size-5" />
            Reset password
          </DialogTitle>
          <DialogDescription>
            {person?.name} · {person?.personnelNo}. Existing passwords are
            hashed and cannot be viewed. Resetting signs the user out of all
            devices.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm">
          New password
          <Input
            aria-label="Temporary password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 10 characters"
          />
        </label>
        <Button
          disabled={busy || password.length < 10}
          onClick={() => void reset(false)}
        >
          Set new password
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void reset(true)}
        >
          Reset to personnel number ({person?.personnelNo})
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
