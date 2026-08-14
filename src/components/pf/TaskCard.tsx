import { useState } from "react";
import { toast } from "sonner";
import { usePF, progressOf } from "@/lib/pf/store";
import type {
  BlockerType,
  ReminderPermission,
  SupportType,
  Task,
  Visibility,
  DetailLevel,
  Status,
} from "@/lib/pf/types";
import { CharacterAvatar, CharacterSays } from "./Character";
import { Chip, Scale } from "./Bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

const BLOCKERS: BlockerType[] = [
  "I don't know where to start",
  "Too many steps",
  "I need information",
  "I'm afraid of doing it wrong",
  "It's boring / I can't initiate",
  "I'm waiting for someone",
  "Other",
];

const SUPPORT: SupportType[] = [
  "Practical help",
  "Body doubling",
  "Encouragement",
  "Remind me",
  "Help me start",
  "Just acknowledge me",
  "Give me space",
];

const STATUSES: Status[] = [
  "Inbox",
  "Sorted",
  "In Progress",
  "Blocked",
  "Waiting for Someone",
  "Done",
];

export function TaskCard({ task }: { task: Task }) {
  const {
    db,
    updateTask,
    stepsOf,
    addStep,
    toggleStep,
    completeTask,
    requestSupport,
  } = usePF();
  const [tool, setTool] = useState<"" | "break" | "spiral" | "support" | "bulu">("");
  const [stepText, setStepText] = useState("");
  const [fact, setFact] = useState("");
  const [next, setNext] = useState("");
  const [park, setPark] = useState(task.ParkedThoughts);

  const steps = stepsOf(task.TaskID);
  const firstOpen = steps.find((s) => !s.IsDone);
  const progress = progressOf(db, task);
  const requester = db.users.find((u) => u.UserID === task.RequestedByUser);

  return (
    <article className="rounded-3xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-snug">
            {task.Title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {task.Status} · load {task.ExpectedLoad}/5 · priority {task.Priority}/5
            {task.Category ? ` · ${task.Category}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
          {progress}%
        </span>
      </div>

      <Progress value={progress} className="mt-3 h-2" />

      {requester ? (
        <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-xs">
          Requested by <strong>{requester.DisplayName}</strong>
          {task.WhyImportant ? (
            <>
              {" "}
              — “{task.WhyImportant}”
            </>
          ) : null}
        </p>
      ) : task.WhyImportant ? (
        <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-xs">
          Why it matters: “{task.WhyImportant}”
        </p>
      ) : null}

      {firstOpen ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-accent p-3">
          <CharacterAvatar id="neuna" size="sm" />
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">
              Next tiny action
            </p>
            <p className="text-sm font-semibold">{firstOpen.StepText}</p>
          </div>
        </div>
      ) : null}

      {task.SupportRequested.length ? (
        <p className="mt-3 text-xs">
          🐕 Support requested: {task.SupportRequested.join(", ")}
        </p>
      ) : null}

      {/* tool toggles */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={tool === "break"} onClick={() => setTool(tool === "break" ? "" : "break")}>
          🐈‍⬛ Break this down
        </Chip>
        <Chip active={tool === "spiral"} onClick={() => setTool(tool === "spiral" ? "" : "spiral")}>
          🌀 Stop spiralling
        </Chip>
        <Chip active={tool === "support"} onClick={() => setTool(tool === "support" ? "" : "support")}>
          🐕 Ask Nuffel
        </Chip>
        <Chip active={tool === "bulu"} onClick={() => setTool(tool === "bulu" ? "" : "bulu")}>
          🐰 Reminders
        </Chip>
      </div>

      {tool === "break" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="neuna">Ask Neuna to break this down.</CharacterSays>
          <div>
            <p className="text-sm font-semibold">What's blocking you?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BLOCKERS.map((b) => (
                <Chip
                  key={b}
                  active={task.BlockerType === b}
                  onClick={() =>
                    updateTask(task.TaskID, {
                      BlockerType: task.BlockerType === b ? "" : b,
                      Status:
                        task.Status === "Inbox" ? "Sorted" : task.Status,
                    })
                  }
                >
                  {b}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">
              What is the smallest physical action you could do in five minutes?
            </p>
            <ul className="mt-2 space-y-2">
              {steps.map((s) => (
                <li key={s.StepID}>
                  <button
                    type="button"
                    onClick={() => toggleStep(s.StepID)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left text-sm ring-1 ring-border"
                  >
                    <span className="text-lg">{s.IsDone ? "✅" : "⬜️"}</span>
                    <span className={s.IsDone ? "line-through opacity-60" : ""}>
                      {s.StepText}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {steps.length < 5 ? (
              <div className="mt-2 flex gap-2">
                <Input
                  value={stepText}
                  onChange={(e) => setStepText(e.target.value)}
                  placeholder="e.g. Find policy number"
                  className="h-12 rounded-2xl bg-card"
                />
                <Button
                  className="h-12 rounded-2xl"
                  onClick={() => {
                    if (!stepText.trim()) return;
                    addStep(task.TaskID, stepText.trim());
                    setStepText("");
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tool === "spiral" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="neuna">
            Are we actually solving the task, or thinking about the task?
          </CharacterSays>
          <Field label="FACT — what actually needs to happen?" value={fact} onChange={setFact} />
          <Field
            label="NEXT — what can you physically do in five minutes?"
            value={next}
            onChange={setNext}
          />
          <Field
            label="PARK — what does not need solving right now?"
            value={park}
            onChange={setPark}
          />
          <Button
            className="h-12 w-full rounded-2xl"
            onClick={() => {
              updateTask(task.TaskID, { ParkedThoughts: park });
              if (next.trim() && steps.length < 5) addStep(task.TaskID, next.trim());
              toast("Neuna has confiscated these thoughts for later.");
            }}
          >
            Hand it to Neuna
          </Button>
          {task.ParkedThoughts ? (
            <p className="rounded-2xl bg-card p-3 text-xs ring-1 ring-border">
              Confiscated: “{task.ParkedThoughts}”
            </p>
          ) : null}
        </div>
      ) : null}

      {tool === "support" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="nuffel">What kind of support helps here?</CharacterSays>
          <div className="flex flex-wrap gap-2">
            {SUPPORT.map((s) => {
              const active = task.SupportRequested.includes(s);
              return (
                <Chip
                  key={s}
                  active={active}
                  onClick={() => {
                    const nextList = active
                      ? task.SupportRequested.filter((x) => x !== s)
                      : [...task.SupportRequested, s];
                    requestSupport(task.TaskID, nextList);
                    if (!active) toast("Asking for help is progress. +1 🍊");
                  }}
                >
                  {s}
                </Chip>
              );
            })}
          </div>
        </div>
      ) : null}

      {tool === "bulu" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="bulu">
            Control Tower can nudge you inside the app. You choose how often.
          </CharacterSays>
          <div className="flex flex-wrap gap-2">
            {(["None", "One reminder", "Every 3 days"] as ReminderPermission[]).map(
              (r) => (
                <Chip
                  key={r}
                  active={task.ReminderPermission === r}
                  onClick={() => updateTask(task.TaskID, { ReminderPermission: r })}
                >
                  {r}
                </Chip>
              ),
            )}
          </div>
        </div>
      ) : null}

      {/* privacy + status */}
      <details className="mt-4">
        <summary className="cursor-pointer list-none rounded-2xl bg-secondary/60 p-3 text-sm font-semibold">
          🔒 Privacy & status
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-sm font-semibold">Who may access this package?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["JUST ME", "MY CONNECTIONS", "SELECTED PEOPLE"] as Visibility[]).map(
                (v) => (
                  <Chip
                    key={v}
                    active={task.Visibility === v}
                    onClick={() => updateTask(task.TaskID, { Visibility: v })}
                  >
                    {v}
                  </Chip>
                ),
              )}
            </div>
          </div>
          {task.Visibility === "SELECTED PEOPLE" ? (
            <SelectedPeople task={task} />
          ) : null}
          <div>
            <p className="text-sm font-semibold">How much detail do they get?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["FULL", "LOAD ONLY"] as DetailLevel[]).map((d) => (
                <Chip
                  key={d}
                  active={task.DetailLevel === d}
                  onClick={() => updateTask(task.TaskID, { DetailLevel: d })}
                >
                  {d}
                </Chip>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              LOAD ONLY shows “Private background task” plus workload — no title,
              no requester, no notes.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  active={task.Status === s}
                  onClick={() => {
                    if (s === "Done") {
                      const { persimmons } = completeTask(task.TaskID);
                      toast(`Shipment completed. Acceptable. +${persimmons} 🍊`);
                    } else {
                      updateTask(task.TaskID, { Status: s });
                      if (s === "Blocked")
                        toast("Marking a blocker honestly is progress.");
                    }
                  }}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <Scale
            label="Expected load"
            hint="How expensive it feels, not how long it takes."
            value={task.ExpectedLoad}
            onChange={(v) => updateTask(task.TaskID, { ExpectedLoad: v })}
          />
          <Scale
            label="Priority"
            value={task.Priority}
            onChange={(v) => updateTask(task.TaskID, { Priority: v })}
          />
          <label className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3 text-sm font-semibold">
            Goldie: this one is actually interesting
            <Switch
              checked={task.Interesting}
              onCheckedChange={(v) => updateTask(task.TaskID, { Interesting: v })}
            />
          </label>
        </div>
      </details>

      {task.Status !== "Done" ? (
        <Button
          className="mt-4 h-14 w-full rounded-2xl text-base"
          onClick={() => {
            const { persimmons } = completeTask(task.TaskID);
            toast(`Shipment completed. Acceptable. +${persimmons} 🍊`);
          }}
        >
          ✅ Ship this package
        </Button>
      ) : null}
    </article>
  );
}

function SelectedPeople({ task }: { task: Task }) {
  const { db } = usePF();
  const viewers = db.connections.filter(
    (c) => c.Active && c.OwnerUser === task.OwnerUser,
  );
  return (
    <div className="space-y-2">
      {viewers.map((c) => {
        const user = db.users.find((u) => u.UserID === c.ViewerUser)!;
        const grant = db.access.find(
          (a) => a.Task === task.TaskID && a.ViewerUser === user.UserID,
        );
        return (
          <div
            key={c.ConnectionID}
            className="flex items-center justify-between rounded-2xl bg-card p-3 text-sm ring-1 ring-border"
          >
            <span>
              {user.DisplayName}{" "}
              <span className="text-muted-foreground">({c.RelationshipLabel})</span>
            </span>
            <AccessToggle taskId={task.TaskID} viewerId={user.UserID} current={grant?.DetailLevel} />
          </div>
        );
      })}
    </div>
  );
}

function AccessToggle({
  taskId,
  viewerId,
  current,
}: {
  taskId: string;
  viewerId: string;
  current?: DetailLevel | undefined;
}) {
  const { db } = usePF();
  // mutate through a tiny local helper on the db object via context updateTask is
  // not suitable; use a dedicated event instead.
  const set = (level: DetailLevel | null) => {
    const raw = window.localStorage.getItem("epf.db.v1");
    const parsed = raw ? JSON.parse(raw) : db;
    const rest = parsed.access.filter(
      (a: { Task: string; ViewerUser: string }) =>
        !(a.Task === taskId && a.ViewerUser === viewerId),
    );
    parsed.access = level
      ? [
          ...rest,
          {
            AccessID: `ac_${Math.random().toString(36).slice(2, 8)}`,
            Task: taskId,
            ViewerUser: viewerId,
            DetailLevel: level,
          },
        ]
      : rest;
    window.localStorage.setItem("epf.db.v1", JSON.stringify(parsed));
    window.location.reload();
  };
  return (
    <div className="flex gap-1">
      <Chip active={!current} onClick={() => set(null)}>
        No
      </Chip>
      <Chip active={current === "LOAD ONLY"} onClick={() => set("LOAD ONLY")}>
        Load
      </Chip>
      <Chip active={current === "FULL"} onClick={() => set("FULL")}>
        Full
      </Chip>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-20 rounded-2xl bg-card"
      />
    </label>
  );
}
