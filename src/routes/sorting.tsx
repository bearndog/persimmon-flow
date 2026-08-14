import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip, Scale } from "@/components/pf/Bits";
import { TaskCard } from "@/components/pf/TaskCard";
import { usePF } from "@/lib/pf/store";
import type { Category } from "@/lib/pf/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/sorting")({
  head: () => ({
    meta: [
      { title: "Sorting Line — Elster's Persimmon Factory" },
      {
        name: "description",
        content:
          "Sort one package at a time: who it is for, when, priority, expected load and why it matters.",
      },
      { property: "og:title", content: "Sorting Line — Elster's Persimmon Factory" },
      {
        property: "og:description",
        content: "Turn brain-dump packages into sorted, doable shipments.",
      },
    ],
  }),
  component: SortingLine,
});

const CATEGORIES: Category[] = [
  "Work / Study",
  "Family",
  "Household",
  "Money / Admin",
  "Health",
  "Social",
  "Errands",
  "Other",
];

function SortingLine() {
  const { db, me, myTasks, updateTask } = usePF();
  const inbox = myTasks().filter((t) => t.Status === "Inbox");
  const task = inbox[0];
  const [why, setWhy] = useState("");
  const [customDate, setCustomDate] = useState("");

  const connections = db.connections.filter(
    (c) => c.Active && c.ViewerUser === me.UserID,
  );

  return (
    <AppShell>
      <CharacterSays id="bulu">
        Control Tower: {inbox.length} unsorted{" "}
        {inbox.length === 1 ? "package is" : "packages are"} on the line.
      </CharacterSays>

      {!task ? (
        <div className="mt-6 rounded-3xl bg-card p-6 text-center ring-1 ring-border">
          <p className="text-4xl">🏭</p>
          <h2 className="mt-2 font-display text-lg font-bold">Line is clear</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing waiting to be sorted. Dump more on the Landing Patch whenever
            your brain is loud.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
            <p className="text-xs font-semibold text-muted-foreground">
              Package on the line
            </p>
            <h2 className="font-display text-2xl font-bold leading-snug">
              {task.Title}
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold">WHO owns this?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip
                    active={task.OwnerUser === me.UserID}
                    onClick={() => updateTask(task.TaskID, { OwnerUser: me.UserID })}
                  >
                    Me
                  </Chip>
                  {connections
                    .filter((c) => c.CanAssignTasks)
                    .map((c) => {
                      const u = db.users.find((x) => x.UserID === c.OwnerUser)!;
                      return (
                        <Chip
                          key={c.ConnectionID}
                          active={task.OwnerUser === u.UserID}
                          onClick={() =>
                            updateTask(task.TaskID, {
                              OwnerUser: u.UserID,
                              RequestedByUser: me.UserID,
                            })
                          }
                        >
                          {u.DisplayName}
                        </Chip>
                      );
                    })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Requested by (optional)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip
                    active={!task.RequestedByUser}
                    onClick={() => updateTask(task.TaskID, { RequestedByUser: null })}
                  >
                    Nobody
                  </Chip>
                  {connections.map((c) => {
                    const u = db.users.find((x) => x.UserID === c.OwnerUser)!;
                    return (
                      <Chip
                        key={c.ConnectionID}
                        active={task.RequestedByUser === u.UserID}
                        onClick={() =>
                          updateTask(task.TaskID, { RequestedByUser: u.UserID })
                        }
                      >
                        {u.DisplayName}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">WHEN</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["Today", "Soon", "Later", "No deadline"] as const).map((w) => (
                    <Chip
                      key={w}
                      active={task.DeadlineBucket === w}
                      onClick={() =>
                        updateTask(task.TaskID, {
                          DeadlineBucket: w,
                          Deadline:
                            w === "Today"
                              ? new Date().toISOString()
                              : w === "Soon"
                                ? new Date(Date.now() + 3 * 86400000).toISOString()
                                : w === "Later"
                                  ? new Date(Date.now() + 14 * 86400000).toISOString()
                                  : null,
                        })
                      }
                    >
                      {w}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="h-12 rounded-2xl bg-card"
                  />
                  <Button
                    variant="secondary"
                    className="h-12 rounded-2xl"
                    onClick={() =>
                      customDate &&
                      updateTask(task.TaskID, {
                        DeadlineBucket: "Custom",
                        Deadline: new Date(customDate).toISOString(),
                      })
                    }
                  >
                    Set
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Category</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      active={task.Category === c}
                      onClick={() => updateTask(task.TaskID, { Category: c })}
                    >
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              <Scale
                label="Priority"
                value={task.Priority}
                onChange={(v) => updateTask(task.TaskID, { Priority: v })}
              />
              <Scale
                label="Expected load"
                hint="How expensive this feels, not just how long it takes."
                value={task.ExpectedLoad}
                onChange={(v) => updateTask(task.TaskID, { ExpectedLoad: v })}
              />

              <label className="block">
                <span className="text-sm font-semibold">
                  Why does this matter to you?
                </span>
                <Textarea
                  value={why || task.WhyImportant}
                  onChange={(e) => setWhy(e.target.value)}
                  onBlur={() => updateTask(task.TaskID, { WhyImportant: why })}
                  placeholder="It is only HK$300, but unresolved money makes me anxious."
                  className="mt-1 min-h-24 rounded-2xl bg-card"
                />
              </label>

              <Button
                className="h-14 w-full rounded-2xl text-base"
                onClick={() => {
                  if (why) updateTask(task.TaskID, { WhyImportant: why });
                  updateTask(task.TaskID, { Status: "Sorted" });
                  setWhy("");
                }}
              >
                🏭 Send to the factory floor
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Tools below work on this package too — Neuna, Nuffel and Bulu.
          </p>
          <TaskCard task={task} />
        </div>
      )}
    </AppShell>
  );
}
