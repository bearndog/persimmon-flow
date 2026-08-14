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
      { title: "Harvest — Elster's Persimmon Factory" },
      {
        name: "description",
        content:
          "Celebrate shipped packages, earn persimmons for executive-function progress and send appreciation.",
      },
      { property: "og:title", content: "Harvest — Elster's Persimmon Factory" },
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
          {t("persimmons in the barn", "倉庫裡的柿子")}
        </p>
      </div>

      <div className="mt-4">
        <CharacterSays id="elster" tone="accent">
          {done.length
            ? `Shipment completed. Acceptable. ${done.length} package${done.length === 1 ? "" : "s"} shipped so far.`
            : "No shipments yet. The line is still warm."}
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
        <CharacterSays id="nuffel">
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
                  toast("Not enough persimmons yet.");
                  return;
                }
                sendPersimmon(p.user.UserID, note);
                toast(`Sent 1 🍊 to ${p.user.DisplayName}.`);
              }}
            >
              Send to {p.user.DisplayName}
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
                      : t("🎙 Bulu ping (1 🍊)", "🎙 Bulu 提醒（1 🍊）")}
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
              <span className="block truncate">{e.Reason}</span>
              <span className="text-xs text-muted-foreground">
                {e.FromUser
                  ? db.users.find((u) => u.UserID === e.FromUser)?.DisplayName
                  : "Factory"}
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
          toast(t("Demo factory reset.", "示範工廠已重設。"));
        }}
      >
        {t("Reset demo data", "重設示範資料")}
      </Button>
    </AppShell>
  );
}
