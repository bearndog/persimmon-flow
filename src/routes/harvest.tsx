import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip } from "@/components/pf/Bits";
import { usePF, balanceOf } from "@/lib/pf/store";
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
        content:
          "Persimmons reward progress and communication, not moral worth.",
      },
    ],
  }),
  component: Harvest,
});

function Harvest() {
  const { db, me, myTasks, sendPersimmon, peopleIShareWith, buluPing, reset } =
    usePF();
  const balance = balanceOf(db, me.UserID);
  const done = myTasks()
    .filter((t) => t.Status === "Done")
    .sort((a, b) => (b.CompletedAt ?? "").localeCompare(a.CompletedAt ?? ""));
  const events = db.persimmons
    .filter((p) => p.ToUser === me.UserID)
    .slice(0, 12);
  const people = peopleIShareWith();
  const [note, setNote] = useState("I noticed how much work that took.");

  // packages I requested from someone else, so I can ping / appreciate
  const requested = db.tasks.filter((t) => t.RequestedByUser === me.UserID);

  return (
    <AppShell>
      <div className="rounded-3xl bg-card p-5 text-center ring-1 ring-border">
        <p className="text-5xl">🍊</p>
        <p className="mt-2 font-display text-3xl font-bold">{balance}</p>
        <p className="text-sm text-muted-foreground">persimmons in the barn</p>
      </div>

      <div className="mt-4">
        <CharacterSays id="elster" tone="accent">
          {done.length
            ? `Shipment completed. Acceptable. ${done.length} package${done.length === 1 ? "" : "s"} shipped so far.`
            : "No shipments yet. The line is still warm."}
        </CharacterSays>
      </div>

      <h2 className="mb-2 mt-6 font-display text-base font-bold">
        Persimmons are earned for
      </h2>
      <p className="rounded-3xl bg-secondary/60 p-3 text-xs leading-relaxed">
        Completing tasks · finishing a hard subtask · starting something avoided ·
        marking a blocker honestly · asking for help · updating someone · helping
        somebody · acknowledging someone's work. Base completion 1 🍊 + expected
        load (max 6 🍊).
      </p>

      <h2 className="mb-2 mt-6 font-display text-base font-bold">Send 🍊</h2>
      <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <CharacterSays id="nuffel">
          Appreciation is different from completion. One persimmon, one honest
          note.
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
            Packages I asked for
          </h2>
          <ul className="space-y-2">
            {requested.map((t) => {
              const owner = db.users.find((u) => u.UserID === t.OwnerUser)!;
              return (
                <li
                  key={t.TaskID}
                  className="rounded-3xl bg-card p-3 ring-1 ring-border"
                >
                  <p className="font-semibold">{t.Title}</p>
                  <p className="text-xs text-muted-foreground">
                    {owner.DisplayName} · {t.AssignmentResponse || t.Status}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-2 h-12 w-full rounded-2xl"
                    onClick={() => {
                      const r = buluPing(t.TaskID);
                      toast(r.message);
                    }}
                  >
                    🎙 Bulu ping (1 🍊, max one per day)
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <h2 className="mb-2 mt-6 font-display text-base font-bold">Harvest log</h2>
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
          reset();
          toast("Demo factory reset.");
        }}
      >
        Reset demo data
      </Button>
    </AppShell>
  );
}
