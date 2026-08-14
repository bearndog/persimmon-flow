import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip } from "@/components/pf/Bits";
import { usePF } from "@/lib/pf/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Landing Patch — Elster's Persimmon Factory" },
      {
        name: "description",
        content:
          "Dump everything flying around your brain into the Landing Patch. Organisation can happen later.",
      },
      { property: "og:title", content: "Elster's Persimmon Factory 柿務總管工廠" },
      {
        property: "og:description",
        content:
          "A playful shared task and communication app for brain dumping, sorting and making invisible workload visible.",
      },
    ],
  }),
  component: LandingPatch,
});

function LandingPatch() {
  const { me, myTasks, addTasksFromDump, addTask, db, answerPing } = usePF();
  const [text, setText] = useState("");
  const [splitLines, setSplitLines] = useState(true);
  const [single, setSingle] = useState("");

  const inbox = myTasks().filter((t) => t.Status === "Inbox");
  const pings = db.pings.filter((p) => p.ToUser === me.UserID && !p.Response);

  return (
    <AppShell>
      <h2 className="font-display text-2xl font-bold leading-tight">
        What's flying around your brain?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dump it here. Organisation can happen later.
      </p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Thesis\nEmail professor\nDad reimbursement\nBuy toothpaste"}
        className="mt-4 min-h-40 rounded-3xl bg-card text-base"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip active={splitLines} onClick={() => setSplitLines(true)}>
          One package per line
        </Chip>
        <Chip active={!splitLines} onClick={() => setSplitLines(false)}>
          Keep as one lump
        </Chip>
      </div>
      <Button
        className="mt-3 h-14 w-full rounded-2xl text-base"
        onClick={() => {
          const n = addTasksFromDump(text, splitLines);
          if (!n) return;
          setText("");
          toast(`${n} package${n === 1 ? "" : "s"} landed in the Inbox.`);
        }}
      >
        🛬 Dump it
      </Button>

      <div className="mt-3 flex gap-2">
        <Input
          value={single}
          onChange={(e) => setSingle(e.target.value)}
          placeholder="Add one package (a title is enough)"
          className="h-14 rounded-2xl bg-card"
        />
        <Button
          variant="secondary"
          className="h-14 rounded-2xl"
          onClick={() => {
            if (!single.trim()) return;
            addTask({ Title: single.trim() });
            setSingle("");
            toast("Package added.");
          }}
        >
          + Add
        </Button>
      </div>

      <div className="mt-6">
        <CharacterSays id="bulu" tone="accent">
          Control Tower: {inbox.length} unsorted{" "}
          {inbox.length === 1 ? "package is" : "packages are"} waiting. No rush —
          they are safe on the patch.
        </CharacterSays>
      </div>

      {pings.length ? (
        <div className="mt-4 space-y-3">
          {pings.map((p) => (
            <div key={p.PingID} className="rounded-3xl bg-card p-3 ring-1 ring-border">
              <CharacterSays id="bulu">🎙 {p.Message}</CharacterSays>
              <div className="mt-2 flex gap-2">
                <Button
                  className="h-12 flex-1 rounded-2xl"
                  onClick={() => answerPing(p.PingID, "📥 Got it")}
                >
                  📥 Got it
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 flex-1 rounded-2xl"
                  onClick={() => answerPing(p.PingID, "💤 Later")}
                >
                  💤 Later
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {inbox.length ? (
        <ul className="mt-4 space-y-2">
          {inbox.map((t) => (
            <li
              key={t.TaskID}
              className="rounded-2xl bg-card p-3 text-sm font-semibold ring-1 ring-border"
            >
              📦 {t.Title}
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
