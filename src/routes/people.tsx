import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRegister } from "@/lib/store/use-register";
import type { Person } from "@/lib/store/types";

export const Route = createFileRoute("/people")({ component: PeoplePage });

function PeoplePage() {
  const people = useRegister((s) => s.people);
  const assets = useRegister((s) => s.assets);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"active" | "retired" | "all">("active");
  const [editing, setEditing] = useState<Person | null | "new">(null);
  const [retiring, setRetiring] = useState<Person | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return people
      .filter((p) => (tab === "all" ? true : p.status === tab))
      .filter((p) => {
        if (!query) return true;
        return `${p.personnelNo} ${p.name} ${p.designation} ${p.section}`.toLowerCase().includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, q, tab]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Holders"
        title="People"
        description="Everyone who can hold an asset or raise a store slip. When someone retires, send their machines to store or to the next person."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            Add person
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="retired">Retired</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search name or section"
          className="sm:ml-auto sm:max-w-sm sm:flex-1"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No people in this list"
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add person
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((person) => {
            const held = assets.filter((a) => a.holderId === person.id);
            return (
              <li key={person.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {person.personnelNo || "No personnel no."} · {person.designation} · {person.section}
                        </p>
                      </div>
                      {person.status === "retired" ? (
                        <Badge variant="cancelled">Retired</Badge>
                      ) : (
                        <Badge variant="closed">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {held.length} asset{held.length === 1 ? "" : "s"}
                      {held.length > 0
                        ? ` · ${held
                            .slice(0, 3)
                            .map((a) => a.assetNo)
                            .join(", ")}`
                        : ""}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(person)}>
                        Edit
                      </Button>
                      {person.status === "active" ? (
                        <Button size="sm" variant="ghost" onClick={() => setRetiring(person)}>
                          Retire
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <PersonDialog
        person={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
      <RetireDialog person={retiring} onClose={() => setRetiring(null)} />
    </div>
  );
}

function PersonDialog({
  person,
  open,
  onClose,
}: {
  person: Person | null;
  open: boolean;
  onClose: () => void;
}) {
  const addPerson = useRegister((s) => s.addPerson);
  const updatePerson = useRegister((s) => s.updatePerson);
  const [personnelNo, setPersonnelNo] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [section, setSection] = useState("Projects");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onOpenAutoFocus={() => {
          setPersonnelNo(person?.personnelNo ?? "");
          setName(person?.name ?? "");
          setDesignation(person?.designation ?? "");
          setSection(person?.section ?? "Projects");
        }}
      >
        <DialogHeader>
          <DialogTitle>{person ? "Edit person" : "Add person"}</DialogTitle>
          <DialogDescription>Used on issue slips and as the holder of assets.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Personnel number" htmlFor="pe-no">
            <Input
              id="pe-no"
              value={personnelNo}
              onChange={(e) => setPersonnelNo(e.target.value)}
              placeholder="104821"
            />
          </Field>
          <Field label="Name" htmlFor="pe-name">
            <Input id="pe-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Designation" htmlFor="pe-des">
            <Input
              id="pe-des"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Junior Engineer"
            />
          </Field>
          <Field label="Section" htmlFor="pe-sec">
            <Input id="pe-sec" value={section} onChange={(e) => setSection(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!name.trim()) {
                toast.error("Name is required");
                return;
              }
              if (person) {
                await updatePerson(person.id, {
                  personnelNo: personnelNo.trim(),
                  name: name.trim(),
                  designation: designation.trim(),
                  section: section.trim(),
                });
                toast.success("Person updated");
              } else {
                await addPerson({
                  personnelNo: personnelNo.trim(),
                  name: name.trim(),
                  designation: designation.trim() || "Staff",
                  section: section.trim() || "Projects",
                  status: "active",
                });
                toast.success("Person added");
              }
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetireDialog({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const allAssets = useRegister((s) => s.assets);
  const allPeople = useRegister((s) => s.people);
  const updatePerson = useRegister((s) => s.updatePerson);
  const transferAsset = useRegister((s) => s.transferAsset);
  const retirePerson = useRegister(s=>s.retirePerson);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const assets = allAssets.filter((a) => a.holderId === person?.id);
  const people = allPeople.filter((p) => p.status === "active" && p.id !== person?.id);

  return (
    <Dialog open={Boolean(person)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={() => {
          const next: Record<string, string> = {};
          for (const a of assets) next[a.id] = "store";
          setTargets(next);
        }}
      >
        <DialogHeader>
          <DialogTitle>Retire {person?.name}</DialogTitle>
          <DialogDescription>
            Mark them retired and move each machine they hold — to store, or to a colleague.
          </DialogDescription>
        </DialogHeader>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets are currently with this person.</p>
        ) : (
          <ul className="space-y-3">
            {assets.map((asset) => (
              <li key={asset.id} className="grid gap-2 sm:grid-cols-[1fr_12rem] sm:items-center">
                <div>
                  <p className="font-mono text-sm font-medium">{asset.assetNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {asset.kind} · {asset.make} {asset.model}
                  </p>
                </div>
                <Select
                  value={targets[asset.id] ?? "store"}
                  onValueChange={(v) => setTargets((t) => ({ ...t, [asset.id]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">Return to store</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!person) return;
              await retirePerson(person.id, targets);
              toast.success(`${person.name} marked retired`);
              onClose();
            }}
          >
            Confirm retirement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
