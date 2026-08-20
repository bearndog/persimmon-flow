import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip } from "@/components/pf/Bits";
import { usePF, balanceOf } from "@/lib/pf/store";
import { uiLabel, useI18n } from "@/lib/pf/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/harvest")({
  head: () => ({
    meta: [
      { title: "Harvest — Elster's Persimmon Warehouse" },
      {
        name: "description",
        content:
          "Celebrate shipped packages, earn persimmons for executive-function progress and send appreciation.",
      },
      { property: "og:title", content: "Harvest — Elster's Persimmon Warehouse" },
      {
        property: "og:description",
        content: "Persimmons reward progress and communication, not moral worth.",
      },
    ],
  }),
  component: Harvest,
});

function Harvest() {
  const { db, me, myTasks, sendPersimmon, peopleIShareWith, buluPing, reset } = usePF();
  const { t, zh } = useI18n();
  const balance = balanceOf(db, me.UserID);
  const done = myTasks()
    .filter((t) => t.Status === "Done")
    .sort((a, b) => (b.CompletedAt ?? "").localeCompare(a.CompletedAt ?? ""));
  const events = db.persimmons.filter((p) => p.ToUser === me.UserID).slice(0, 12);
  const people = peopleIShareWith();
  const [note, setNote] = useState("I noticed how much work that took.");

  // packages I requested from someone else, so I can ping / appreciate
  const requested = db.assignments
    .filter(
      (assignment) =>
        assignment.RequesterUser === me.UserID &&
        !["rejected", "completed"].includes(assignment.State),
    )
    .map((assignment) => ({
      assignment,
      task: db.tasks.find((task) => task.TaskID === assignment.TaskID),
    }))
    .filter((item) => item.task);

  return (
    <AppShell>
      <div className="rounded-3xl bg-card p-5 text-center ring-1 ring-border">
        <p className="text-5xl">🍊</p>
        <p className="mt-2 font-display text-3xl font-bold">{balance}</p>
        <p className="text-sm text-muted-foreground">
          {t("persimmons in the warehouse", "倉庫裡的柿子")}
        </p>
      </div>

      <div className="mt-4">
        <CharacterSays id="elster" tone="accent">
          {done.length
            ? t(
                `Shipment completed. Acceptable. ${done.length} package${done.length === 1 ? "" : "s"} shipped so far.`,
                `出貨完成，做得不錯。目前共送出了 ${done.length} 個包裹。`,
              )
            : t(
                "No shipments yet. The warehouse is ready when you are.",
                "暫時未有包裹出貨。你準備好時，倉庫也已準備好。",
              )}
        </CharacterSays>
      </div>

      <h2 className="mb-2 mt-6 font-display text-base font-bold">
        {t("Persimmons are earned for", "以下行動可獲得柿子")}
      </h2>
      <p className="rounded-3xl bg-secondary/60 p-3 text-xs leading-relaxed">
        {t(
          "Completing tasks · finishing a hard subtask · starting something avoided · marking a blocker honestly · asking for help · updating someone · helping somebody · acknowledging someone's work. Base completion 1 🍊 + expected load (max 6 🍊).",
          "完成任務 · 完成困難步驟 · 開始一直逃避的事情 · 如實標記阻礙 · 求助 · 更新他人 · 幫助他人 · 肯定別人的努力。完成基礎獎勵 1 🍊 加預計負荷（最多 6 🍊）。",
        )}
      </p>

      <h2 className="mb-2 mt-6 font-display text-base font-bold">{t("Send", "送出")} 🍊</h2>
      <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <CharacterSays id="dulcie">
          {t(
            "Appreciation is different from completion. One persimmon, one honest note.",
            "欣賞與完成不同。一個柿子，一句真誠說話。",
          )}
        </CharacterSays>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-3 h-12 rounded-2xl bg-background"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {people.map((p) => (
            <Chip
              key={p.user.UserID}
              onClick={() => {
                if (balance < 1) {
                  toast(t("Not enough persimmons yet.", "目前沒有足夠的柿子。"));
                  return;
                }
                sendPersimmon(p.user.UserID, note);
                toast(
                  t(
                    `Sent 1 🍊 to ${p.user.DisplayName}.`,
                    `已送出 1 🍊 給 ${p.user.DisplayName}。`,
                  ),
                );
              }}
            >
              {t("Send to", "送給")} {p.user.DisplayName}
            </Chip>
          ))}
        </div>
      </div>

      {requested.length ? (
        <>
          <h2 className="mb-2 mt-6 font-display text-base font-bold">
            {t("Packages I asked for", "我提出的包裹請求")}
          </h2>
          <ul className="space-y-2">
            {requested.map(({ assignment, task: taskMaybe }) => {
              const task = taskMaybe!;
              const recipient = db.users.find((user) => user.UserID === assignment.RecipientUser)!;
              return (
                <li
                  key={assignment.AssignmentID}
                  className="rounded-3xl bg-card p-3 ring-1 ring-border"
                >
                  <p className="font-semibold">{task.Title}</p>
                  <p className="text-xs text-muted-foreground">
                    {recipient.DisplayName} · {uiLabel(assignment.State, zh)} ·{" "}
                    {t("reminders", "提醒")}：{uiLabel(assignment.ReminderPermission, zh)}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-2 h-12 w-full rounded-2xl"
                    disabled={assignment.ReminderPermission === "None"}
                    onClick={() => {
                      const r = buluPing(task.TaskID);
                      toast(r.message);
                    }}
                  >
                    {assignment.ReminderPermission === "None"
                      ? t("Reminders off", "提醒已關閉")
                      : t("📣 Riedan ping (1 🍊)", "📣 阿笛提醒（1 🍊）")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <h2 className="mb-2 mt-6 font-display text-base font-bold">{t("Harvest log", "收成紀錄")}</h2>
      <ul className="space-y-2">
        {events.map((e) => (
          <li
            key={e.EventID}
            className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 text-sm ring-1 ring-border"
          >
            <span className="min-w-0">
              <span className="block truncate">{harvestReason(e.Reason, zh)}</span>
              <span className="text-xs text-muted-foreground">
                {e.FromUser
                  ? db.users.find((u) => u.UserID === e.FromUser)?.DisplayName
                  : t("Warehouse", "倉庫")}
              </span>
            </span>
            <span className="font-bold">
              {e.Amount > 0 ? "+" : ""}
              {e.Amount} 🍊
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant="ghost"
        className="mt-6 h-12 w-full rounded-2xl text-xs text-muted-foreground"
        onClick={() => {
          if (
            !window.confirm(
              t(
                "Reset all browser demo data? This cannot be undone.",
                "重設所有瀏覽器示範資料？此操作無法復原。",
              ),
            )
          )
            return;
          reset();
          toast(t("Demo warehouse reset.", "示範倉庫已重設。"));
        }}
      >
        {t("Reset demo data", "重設示範資料")}
      </Button>
    </AppShell>
  );
}

function harvestReason(reason: string, zh: boolean) {
  if (!zh) return reason;

  const exact: Record<string, string> = {
    "Starting week credit": "本週起始柿子",
    "Asked for help — that is progress": "主動求助也是一種進展",
    "Sent appreciation": "送出欣賞",
    "Helped someone": "幫助了別人",
    "Riedan ping": "阿笛提醒",
  };

  if (exact[reason]) return exact[reason];
  if (reason.startsWith("Shipment completed:")) {
    return `完成出貨：${reason.slice("Shipment completed:".length).trim()}`;
  }

  return reason;
}
