import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip, LoadDot, Scale } from "@/components/pf/Bits";
import { TaskCard } from "@/components/pf/TaskCard";
import { usePF, calculatedLoad, progressOf } from "@/lib/pf/store";
import type { AssignmentResponse, Mood, Task } from "@/lib/pf/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/floor")({
  head: () => ({
    meta: [
      { title: "Factory Floor — Elster's Persimmon Factory" },
      {
        name: "description",
        content:
          "See your own workload and the capacity of the people you share with, without exposing private details.",
      },
      { property: "og:title", content: "Factory Floor — Elster's Persimmon Factory" },
      {
        property: "og:description",
        content:
          "Make invisible workload visible. Check in, adapt the view to your mood, and keep private things private.",
      },
    ],
  }),
  component: FactoryFloor,
});

const MOODS: { mood: Mood; character: string; blurb: string }[] = [
  { mood: "Neuna / overwhelmed", character: "neuna", blurb: "Overwhelmed, overstimulated" },
  { mood: "Teddi / exhausted", character: "teddi", blurb: "Exhausted, shutdown" },
  { mood: "Elster / focused", character: "elster", blurb: "Focused, doing things" },
  { mood: "Goldie / energetic", character: "goldie", blurb: "Energetic, novelty-seeking" },
  { mood: "Fine", character: "bulu", blurb: "Normal" },
];

const FILTERS = [
  "All",
  "Today",
  "Urgent",
  "High priority",
  "Quick / low load",
  "Blocked",
  "Waiting for Someone",
] as const;

const RESPONSES: AssignmentResponse[] = [
  "📥 Received",
  "💤 Later / Low Capacity",
  "❓ Need Clarification",
  "🚫 Can't Take This",
  "▶️ In Progress",
  "✅ Done",
];

function FactoryFloor() {
  const { db, me, myTasks, checkIn, updateTask, peopleIShareWith } = usePF();
  const [view, setView] = useState<"mine" | "people">("mine");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [mood, setMood] = useState<Mood>(me.CurrentMood);
  const [load, setLoad] = useState<number>(me.CurrentLoad ?? calculatedLoad(db, me.UserID));
  const [help, setHelp] = useState(me.HelpNeeded);

  const calc = calculatedLoad(db, me.UserID);
  const open = myTasks().filter((t) => t.Status !== "Done");
  const filtered = applyFilter(open, filter).sort(byMood(me.CurrentMood));
  const moodView = moodConfig(me.CurrentMood);
  const shown = moodView.limit ? filtered.slice(0, moodView.limit) : filtered;
  const assigned = myTasks().filter((t) => t.RequestedByUser && t.Status !== "Done");

  return (
    <AppShell>
      {/* Bulu check-in */}
      <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <CharacterSays id="bulu">How is the factory running?</CharacterSays>
        {!checkInOpen ? (
          <Button
            className="mt-3 h-12 w-full rounded-2xl"
            variant="secondary"
            onClick={() => setCheckInOpen(true)}
          >
            Check in ({me.CurrentMood} · load {me.CurrentLoad ?? calc}/5)
          </Button>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip key={m.mood} active={mood === m.mood} onClick={() => setMood(m.mood)}>
                  {m.mood} — {m.blurb}
                </Chip>
              ))}
            </div>
            <Scale
              label="Current load"
              hint={`The factory calculates ${calc}/5 from your open packages. You may override it.`}
              value={load}
              onChange={setLoad}
            />
            <div className="flex gap-2">
              <Chip active={help} onClick={() => setHelp(true)}>
                Need help? Yes
              </Chip>
              <Chip active={!help} onClick={() => setHelp(false)}>
                No
              </Chip>
            </div>
            <Button
              className="h-12 w-full rounded-2xl"
              onClick={() => {
                checkIn(mood, load, help);
                setCheckInOpen(false);
                toast("Check-in logged. The floor has been adjusted.");
              }}
            >
              Save check-in
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Chip active={view === "mine"} onClick={() => setView("mine")}>
          My Factory
        </Chip>
        <Chip active={view === "people"} onClick={() => setView("people")}>
          People I Share With
        </Chip>
      </div>

      {view === "mine" ? (
        <>
          <div className="mt-4">
            <CharacterSays id={moodView.character} tone="accent">
              {moodView.message}
            </CharacterSays>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </div>

          {assigned.length ? (
            <div className="mt-4 space-y-2">
              <h2 className="font-display text-base font-bold">
                Requested by someone else
              </h2>
              {assigned.map((t) => {
                const from = db.users.find((u) => u.UserID === t.RequestedByUser);
                return (
                  <div key={t.TaskID} className="rounded-3xl bg-card p-3 ring-1 ring-border">
                    <p className="font-semibold">{t.Title}</p>
                    <p className="text-xs text-muted-foreground">
                      From {from?.DisplayName} · load {t.ExpectedLoad}/5
                      {t.Deadline ? ` · by ${new Date(t.Deadline).toLocaleDateString()}` : ""}
                    </p>
                    {t.WhyImportant ? (
                      <p className="mt-2 rounded-2xl bg-secondary/60 p-2 text-xs">
                        Why it matters to them: “{t.WhyImportant}”
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {RESPONSES.filter(Boolean).map((r) => (
                        <Chip
                          key={r}
                          active={t.AssignmentResponse === r}
                          onClick={() => updateTask(t.TaskID, { AssignmentResponse: r })}
                        >
                          {r}
                        </Chip>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      “Received” is different from “I can do it now”. Both are honest.
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            {shown.map((t) => (
              <TaskCard key={t.TaskID} task={t} />
            ))}
            {!shown.length ? (
              <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
                Nothing in this filter.
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <PeopleView />
      )}
    </AppShell>
  );
}

function PeopleView() {
  const { peopleIShareWith, db } = usePF();
  const people = peopleIShareWith();
  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-3xl bg-secondary/60 p-3 text-xs">
        Only people with an explicit, active connection appear here. Nobody can
        discover anyone else through you — there is no directory.
      </p>
      {people.map((p) => (
        <div key={p.user.UserID} className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold uppercase">
              {p.user.DisplayName}
            </h3>
            <span className="text-xs text-muted-foreground">{p.label}</span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <LoadDot value={p.load} /> Current Load: {p.load}/5
            {p.user.HelpNeeded ? " · asked for help" : ""}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Active shipments" value={p.active} />
            <Stat label="Urgent" value={p.urgent} />
            <Stat label="Blocked" value={p.blocked} />
            <Stat label="Hidden background work" value={p.hidden} />
          </dl>
          <ul className="mt-3 space-y-2">
            {db.tasks
              .filter((t) => t.OwnerUser === p.user.UserID)
              .map((t) => {
                const v = visible(t, p.user.UserID);
                return v;
              })
              .filter(Boolean)
              .slice(0, 6)}
          </ul>
        </div>
      ))}
      {!people.length ? (
        <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
          No active connections.
        </p>
      ) : null}
    </div>
  );

  function visible(task: Task, _ownerId: string) {
    const { db: database } = { db };
    void database;
    return <VisibleRow key={task.TaskID} task={task} />;
  }
}

function VisibleRow({ task }: { task: Task }) {
  const { db } = usePF();
  const v = viewFor(db, task);
  if (!v) return null;
  return (
    <li className="rounded-2xl bg-secondary/50 p-3 text-sm">
      {v.redacted ? (
        <>
          <p className="font-semibold">🔒 Private background task</p>
          <p className="text-xs text-muted-foreground">
            Load {v.ExpectedLoad}/5 · {v.Status} · {v.Progress}%
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">{v.Title}</p>
          <p className="text-xs text-muted-foreground">
            Load {v.ExpectedLoad}/5 · {v.Status} · {v.Progress}%
            {v.Deadline ? ` · by ${new Date(v.Deadline).toLocaleDateString()}` : ""}
          </p>
          {v.WhyImportant ? (
            <p className="mt-1 text-xs">“{v.WhyImportant}”</p>
          ) : null}
        </>
      )}
    </li>
  );
}

function viewFor(db: ReturnType<typeof usePF>["db"], task: Task) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return viewTaskSafe(db, task);
}

import { viewTask } from "@/lib/pf/store";
function viewTaskSafe(db: ReturnType<typeof usePF>["db"], task: Task) {
  return viewTask(db, task, db.currentUserId);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-xl font-bold">{value}</dd>
    </div>
  );
}

function applyFilter(tasks: Task[], filter: string) {
  const soon = Date.now() + 3 * 86400000;
  switch (filter) {
    case "Today":
      return tasks.filter(
        (t) =>
          t.DeadlineBucket === "Today" ||
          (t.Deadline && new Date(t.Deadline).toDateString() === new Date().toDateString()),
      );
    case "Urgent":
      return tasks.filter((t) => t.Deadline && new Date(t.Deadline).getTime() < soon);
    case "High priority":
      return tasks.filter((t) => t.Priority >= 4);
    case "Quick / low load":
      return tasks.filter((t) => t.ExpectedLoad <= 2);
    case "Blocked":
      return tasks.filter((t) => t.Status === "Blocked");
    case "Waiting for Someone":
      return tasks.filter((t) => t.Status === "Waiting for Someone");
    default:
      return tasks;
  }
}

function byMood(mood: Mood) {
  return (a: Task, b: Task) => {
    if (mood === "Teddi / exhausted") return a.ExpectedLoad - b.ExpectedLoad;
    if (mood === "Neuna / overwhelmed")
      return b.Priority - a.Priority || a.ExpectedLoad - b.ExpectedLoad;
    if (mood === "Goldie / energetic")
      return Number(b.Interesting) - Number(a.Interesting) || b.Priority - a.Priority;
    // Elster / Fine: priority then deadline
    return (
      b.Priority - a.Priority ||
      (a.Deadline ?? "9999").localeCompare(b.Deadline ?? "9999")
    );
  };
}

function moodConfig(mood: Mood) {
  switch (mood) {
    case "Neuna / overwhelmed":
      return {
        character: "neuna",
        message: "Too much input. Let's reduce the field.",
        limit: 3,
      };
    case "Teddi / exhausted":
      return {
        character: "teddi",
        message: "Minimum viable worker mode. One tiny action is enough.",
        limit: 1,
      };
    case "Elster / focused":
      return { character: "elster", message: "Factory operational.", limit: 0 };
    case "Goldie / energetic":
      return {
        character: "goldie",
        message: "Use the energy while it exists.",
        limit: 0,
      };
    default:
      return {
        character: "bulu",
        message: "Steady line today. Suggestions only, never restrictions.",
        limit: 0,
      };
  }
}

export { progressOf };
