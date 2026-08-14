import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip, LoadDot, Scale } from "@/components/pf/Bits";
import { TaskCard } from "@/components/pf/TaskCard";
import { usePF, calculatedLoad, viewTask } from "@/lib/pf/store";
import { moodLabel, relativeTime, uiLabel, useI18n } from "@/lib/pf/i18n";
import type { Mood, Task } from "@/lib/pf/types";
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

function FactoryFloor() {
  const { db, me, myTasks, checkIn } = usePF();
  const { t, zh } = useI18n();
  const [view, setView] = useState<"mine" | "people">("mine");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [mood, setMood] = useState<Mood>(me.CurrentMood);
  const [load, setLoad] = useState<number>(me.CurrentLoad ?? calculatedLoad(db, me.UserID));
  const [help, setHelp] = useState(me.HelpNeeded);
  const [showEverything, setShowEverything] = useState(false);

  const calc = calculatedLoad(db, me.UserID);
  const open = Array.from(new Map(myTasks().map((task) => [task.TaskID, task])).values()).filter(
    (task) => task.Status !== "Done" && task.Status !== "Split into packages",
  );
  const filtered = applyFilter(open, filter).sort(byMood(me.CurrentMood));
  const moodView = moodConfig(me.CurrentMood);
  const shown = moodView.limit && !showEverything ? filtered.slice(0, moodView.limit) : filtered;

  return (
    <AppShell>
      {/* Bulu check-in */}
      <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <CharacterSays id="bulu">
          {t("How is the factory running?", "工廠今天運作得怎樣？")}
        </CharacterSays>
        {!checkInOpen ? (
          <Button
            className="mt-3 h-12 w-full rounded-2xl"
            variant="secondary"
            onClick={() => setCheckInOpen(true)}
          >
            {t("Check in", "狀態登記")} ({moodLabel(me.CurrentMood, zh)} · {t("load", "負荷")}{" "}
            {me.CurrentLoad ?? calc}/5)
          </Button>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip key={m.mood} active={mood === m.mood} onClick={() => setMood(m.mood)}>
                  {moodLabel(m.mood, zh)}
                </Chip>
              ))}
            </div>
            <Scale
              label={t("Current load", "目前負荷")}
              hint={t(
                `The factory calculates ${calc}/5 from your open packages. You may override it.`,
                `工廠按未完成包裹估算為 ${calc}/5，你可以自行調整。`,
              )}
              value={load}
              onChange={setLoad}
            />
            <div className="flex gap-2">
              <Chip active={help} onClick={() => setHelp(true)}>
                {t("Need help? Yes", "需要協助？是")}
              </Chip>
              <Chip active={!help} onClick={() => setHelp(false)}>
                {t("No", "否")}
              </Chip>
            </div>
            <Button
              className="h-12 w-full rounded-2xl"
              onClick={() => {
                checkIn(mood, load, help);
                setCheckInOpen(false);
                toast(
                  t(
                    "Check-in logged. The floor has been adjusted.",
                    "狀態已記錄，工廠樓層已調整。",
                  ),
                );
              }}
            >
              {t("Save check-in", "儲存狀態")}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Chip active={view === "mine"} onClick={() => setView("mine")}>
          {t("My Factory", "我的工廠")}
        </Chip>
        <Chip active={view === "people"} onClick={() => setView("people")}>
          {t("People I Share With", "與我共享的人")}
        </Chip>
      </div>

      {view === "mine" ? (
        <>
          <div className="mt-4">
            <CharacterSays id={moodView.character} tone="accent">
              {zh ? moodView.messageZh : moodView.message}
            </CharacterSays>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {filterLabel(f, zh)}
              </Chip>
            ))}
            {filter !== "All" ? (
              <Chip onClick={() => setFilter("All")}>{t("Clear filter", "清除篩選")}</Chip>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t(
                `${filtered.length} matching package${filtered.length === 1 ? "" : "s"}`,
                `${filtered.length} 個符合的包裹`,
              )}
            </span>
            {moodView.limit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEverything((value) => !value)}
              >
                {showEverything
                  ? t("Use mode view", "使用模式檢視")
                  : t("Show everything anyway", "仍然顯示全部")}
              </Button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            {shown.map((t) => (
              <TaskCard key={t.TaskID} task={t} />
            ))}
            {!shown.length ? (
              <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
                {t("Nothing in this filter.", "此篩選沒有包裹。")}
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
  const { t, zh } = useI18n();
  const people = peopleIShareWith();
  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-3xl bg-secondary/60 p-3 text-xs">
        {t(
          "Only people with an explicit, active connection appear here. There is no public directory.",
          "只有已有明確連結的人會在這裡出現；沒有公開用戶目錄。",
        )}
      </p>
      {people.map((p) => (
        <div key={p.user.UserID} className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold uppercase">{p.user.DisplayName}</h3>
            <span className="text-xs text-muted-foreground">{p.label}</span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <LoadDot value={p.load} /> {t("Current load", "目前負荷")}：{p.load}/5
            {p.user.HelpNeeded ? t(" · asked for help", " · 已提出協助請求") : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {moodLabel(p.user.CurrentMood, zh)}
            {p.user.LastCheckIn
              ? ` · ${t("checked in", "登記於")} ${relativeTime(p.user.LastCheckIn, zh)}`
              : ""}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label={t("Active shipments", "進行中包裹")} value={p.active} />
            <Stat label={t("Urgent", "緊急")} value={p.urgent} />
            <Stat label={t("Blocked", "受阻")} value={p.blocked} />
            <Stat label={t("Hidden background work", "隱藏背景工作")} value={p.hidden} />
          </dl>
          <ul className="mt-3 space-y-2">
            {db.tasks
              .filter((t) => t.OwnerUser === p.user.UserID)
              .slice(0, 8)
              .map((t) => (
                <VisibleRow key={t.TaskID} task={t} />
              ))}
          </ul>
        </div>
      ))}
      {!people.length ? (
        <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
          {t("No active connections.", "沒有有效連結。")}
        </p>
      ) : null}
    </div>
  );
}

function VisibleRow({ task }: { task: Task }) {
  const { db } = usePF();
  const { t, zh } = useI18n();
  const v = viewTask(db, task, db.currentUserId);
  if (!v) return null;
  return (
    <li className="rounded-2xl bg-secondary/50 p-3 text-sm">
      {v.redacted ? (
        <>
          <p className="font-semibold">🔒 {t("Private background task", "私人背景任務")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Load", "負荷")} {v.ExpectedLoad}/5 · {uiLabel(v.Status, zh)} · {v.Progress}%
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">{v.Title}</p>
          <p className="text-xs text-muted-foreground">
            {t("Load", "負荷")} {v.ExpectedLoad}/5 · {uiLabel(v.Status, zh)} · {v.Progress}%
            {v.Deadline ? ` · by ${new Date(v.Deadline).toLocaleDateString()}` : ""}
          </p>
          {v.WhyImportant ? <p className="mt-1 text-xs">“{v.WhyImportant}”</p> : null}
        </>
      )}
    </li>
  );
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

function filterLabel(filter: (typeof FILTERS)[number], zh: boolean) {
  if (!zh) return filter;
  const labels: Record<(typeof FILTERS)[number], string> = {
    All: "全部",
    Today: "今天",
    Urgent: "緊急",
    "High priority": "高優先",
    "Quick / low load": "快速／低負荷",
    Blocked: "受阻",
    "Waiting for Someone": "等待他人",
  };
  return labels[filter];
}

function byMood(mood: Mood) {
  return (a: Task, b: Task) => {
    if (mood === "Teddi / exhausted") return a.ExpectedLoad - b.ExpectedLoad;
    if (mood === "Neuna / overwhelmed")
      return b.Priority - a.Priority || a.ExpectedLoad - b.ExpectedLoad;
    if (mood === "Goldie / energetic")
      return Number(b.Interesting) - Number(a.Interesting) || b.Priority - a.Priority;
    // Elster / Fine: priority then deadline
    return b.Priority - a.Priority || (a.Deadline ?? "9999").localeCompare(b.Deadline ?? "9999");
  };
}

function moodConfig(mood: Mood) {
  switch (mood) {
    case "Neuna / overwhelmed":
      return {
        character: "neuna",
        message: "Too much input. Let's reduce the field.",
        messageZh: "資訊太多了，先縮小範圍。",
        limit: 3,
      };
    case "Teddi / exhausted":
      return {
        character: "teddi",
        message: "Minimum viable worker mode. One tiny action is enough.",
        messageZh: "最低可行工作模式，一個微小行動已足夠。",
        limit: 1,
      };
    case "Elster / focused":
      return {
        character: "elster",
        message: "Factory operational.",
        messageZh: "工廠運作正常。",
        limit: 0,
      };
    case "Goldie / energetic":
      return {
        character: "goldie",
        message: "Use the energy while it exists.",
        messageZh: "趁能量還在，好好運用它。",
        limit: 0,
      };
    default:
      return {
        character: "bulu",
        message: "Steady line today. Suggestions only, never restrictions.",
        messageZh: "今天運作平穩；模式只是建議，不是限制。",
        limit: 0,
      };
  }
}
