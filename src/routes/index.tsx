import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip, Scale } from "@/components/pf/Bits";
import { usePF } from "@/lib/pf/store";
import { uiLabel, useI18n } from "@/lib/pf/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { ReminderPermission } from "@/lib/pf/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Landing Patch — Elster's Persimmon Warehouse" }] }),
  component: LandingPatch,
});

function LandingPatch() {
  const {
    me,
    myTasks,
    addTasksFromDump,
    saveHoldingNote,
    updateHoldingNote,
    archiveHoldingNote,
    convertHoldingNote,
    addOrganisedTask,
    db,
    answerPing,
  } = usePF();
  const { t, zh } = useI18n();
  const [text, setText] = useState("");
  const [asLines, setAsLines] = useState(true);
  const [sortingDelegate, setSortingDelegate] = useState("");
  const [organised, setOrganised] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [deadline, setDeadline] = useState("");
  const [load, setLoad] = useState(3);
  const [priority, setPriority] = useState(3);
  const [why, setWhy] = useState("");
  const [reminder, setReminder] = useState<ReminderPermission>("None");

  const inbox = myTasks().filter((task) => task.OwnerUser === me.UserID && task.Status === "Inbox");
  const pings = db.pings.filter((ping) => ping.ToUser === me.UserID && !ping.Response);
  const holding = db.dumps.filter(
    (dump) => dump.User === me.UserID && dump.Kind === "holding" && !dump.ArchivedAt,
  );
  const projects = db.projects.filter(
    (project) => project.OwnerUser === me.UserID && !project.ArchivedAt,
  );
  const categories = db.categories.filter(
    (category) =>
      category.OwnerUser === me.UserID &&
      !category.ArchivedAt &&
      (!projectId || !category.ProjectID || category.ProjectID === projectId),
  );
  const connections = db.connections
    .filter(
      (connection) =>
        connection.Active && connection.ViewerUser === me.UserID && connection.CanAssignTasks,
    )
    .map((connection) => db.users.find((user) => user.UserID === connection.OwnerUser)!)
    .filter(Boolean);

  return (
    <AppShell>
      <h2 className="font-display text-2xl font-bold leading-tight">
        {t("What's taking up space in your head?", "腦內有甚麼事情一直打轉？")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          "Put it all down here. You can organise it later.",
          "先全部放在這裡，稍後再整理也可以。",
        )}
      </p>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("Thesis\nEmail professor\nBuy toothpaste", "論文\n電郵教授\n買牙膏")}
        className="mt-4 min-h-40 rounded-3xl bg-card text-base"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip active={asLines} onClick={() => setAsLines(true)}>
          {t("One package per line", "每行一個包裹")}
        </Chip>
        <Chip active={!asLines} onClick={() => setAsLines(false)}>
          {t("Keep as a holding note", "保留為待整理筆記")}
        </Chip>
      </div>
      {asLines && connections.length ? (
        <label className="mt-3 block text-sm font-semibold">
          {t("Who should sort these packages?", "之後由誰整理這些包裹？")}
          <select
            className="mt-1 h-11 w-full rounded-xl border bg-card px-3"
            value={sortingDelegate}
            onChange={(event) => setSortingDelegate(event.target.value)}
          >
            <option value="">{t("I will sort them", "由我整理")}</option>
            {connections.map((user) => (
              <option key={user.UserID} value={user.UserID}>
                {user.DisplayName}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {t(
              "This hands over the organising only. You still own the packages.",
              "這只會交由對方整理；包裹仍然屬於你。",
            )}
          </span>
        </label>
      ) : null}
      <Button
        className="mt-3 h-14 w-full rounded-2xl text-base"
        onClick={() => {
          if (!text.trim()) return;
          if (asLines) {
            const count = addTasksFromDump(text, sortingDelegate || null);
            toast(
              t(
                `${count} package${count === 1 ? "" : "s"} landed in the Inbox.`,
                `${count} 個包裹已放到待整理區。`,
              ),
            );
          } else {
            saveHoldingNote(text);
            toast(
              t("Holding note saved. It is not a task yet.", "暫存筆記已保存，暫時不會當作任務。"),
            );
          }
          setText("");
          setSortingDelegate("");
        }}
      >
        🛬 {t("Unload it", "卸下來")}
      </Button>

      <Button
        variant="secondary"
        className="mt-3 h-14 w-full rounded-2xl"
        onClick={() => setOrganised((value) => !value)}
      >
        + {t("Add an organised package", "新增已整理的包裹")}
      </Button>

      {organised ? (
        <div className="mt-3 space-y-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("Package title", "包裹標題")}
          />
          <label className="block text-sm font-semibold">
            {t("Project", "項目")}
            <select
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">{t("No project", "不屬於任何項目")}</option>
              {projects.map((project) => (
                <option key={project.ProjectID} value={project.ProjectID}>
                  {project.Name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            {t("Category", "分類")}
            <select
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">{t("No category", "暫不分類")}</option>
              {categories.map((category) => (
                <option key={category.CategoryID} value={category.CategoryID}>
                  {uiLabel(category.Name, zh)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            {t("Who is it for?", "給誰？")}
            <select
              className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            >
              <option value="">{t("Me", "我")}</option>
              {connections.map((user) => (
                <option key={user.UserID} value={user.UserID}>
                  {user.DisplayName}
                </option>
              ))}
            </select>
          </label>
          <Input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <Scale label={t("Expected load", "預計負荷")} value={load} onChange={setLoad} />
          <Scale label={t("Priority", "優先次序")} value={priority} onChange={setPriority} />
          <Textarea
            value={why}
            onChange={(event) => setWhy(event.target.value)}
            placeholder={t("Why it matters", "為何重要")}
          />
          {recipient ? (
            <div className="flex flex-wrap gap-2">
              {(["None", "One reminder", "Every 3 days"] as ReminderPermission[]).map((value) => (
                <Chip key={value} active={reminder === value} onClick={() => setReminder(value)}>
                  {uiLabel(value, zh)}
                </Chip>
              ))}
            </div>
          ) : null}
          <Button
            className="h-12 w-full rounded-2xl"
            onClick={() => {
              if (!title.trim()) return;
              const category = db.categories.find((item) => item.CategoryID === categoryId);
              addOrganisedTask(
                {
                  Title: title.trim(),
                  ProjectID: projectId || null,
                  CategoryID: categoryId || null,
                  Category: (category?.Name as never) ?? "",
                  Deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
                  DeadlineBucket: deadline ? "Custom" : "No deadline",
                  ExpectedLoad: load,
                  Priority: priority,
                  WhyImportant: why,
                  ReminderPermission: reminder,
                },
                recipient || null,
              );
              setTitle("");
              setWhy("");
              setDeadline("");
              setRecipient("");
              setOrganised(false);
              toast(t("Organised package created.", "已建立整理好的包裹。"));
            }}
          >
            {t("Create package", "新增包裹")}
          </Button>
        </div>
      ) : null}

      {holding.length ? (
        <section className="mt-6">
          <h3 className="font-display text-lg font-bold">{t("Holding notes", "暫存筆記")}</h3>
          <div className="mt-2 space-y-3">
            {holding.map((note) => (
              <HoldingNote key={note.DumpID} note={note} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6">
        <CharacterSays id="riedan" tone="accent">
          {t(
            `Control Tower: ${inbox.length} unsorted package${inbox.length === 1 ? " is" : "s are"} waiting.`,
            `阿笛留意到目前有 ${inbox.length} 個包裹等待整理。`,
          )}
        </CharacterSays>
      </div>

      {pings.map((ping) => (
        <div key={ping.PingID} className="mt-3 rounded-3xl bg-card p-3 ring-1 ring-border">
          <CharacterSays id="riedan">📣 {ping.Message}</CharacterSays>
          <div className="mt-2 flex gap-2">
            <Button
              className="h-12 flex-1 rounded-2xl"
              onClick={() => answerPing(ping.PingID, "📥 Got it")}
            >
              📥 {t("Got it", "收到")}
            </Button>
            <Button
              variant="secondary"
              className="h-12 flex-1 rounded-2xl"
              onClick={() => answerPing(ping.PingID, "💤 Later")}
            >
              💤 {t("Later", "稍後")}
            </Button>
          </div>
        </div>
      ))}

      {inbox.length ? (
        <ul className="mt-4 space-y-2">
          {inbox.map((task) => (
            <li
              key={task.TaskID}
              className="rounded-2xl bg-card p-3 text-sm font-semibold ring-1 ring-border"
            >
              📦 {task.Title}
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}

function HoldingNote({ note }: { note: { DumpID: string; Text: string } }) {
  const { updateHoldingNote, archiveHoldingNote, convertHoldingNote } = usePF();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note.Text);
  return (
    <article className="rounded-3xl bg-card p-3 ring-1 ring-border">
      {editing ? (
        <Textarea value={value} onChange={(event) => setValue(event.target.value)} />
      ) : (
        <p className="whitespace-pre-wrap text-sm">{note.Text}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (editing) updateHoldingNote(note.DumpID, value);
            setEditing((current) => !current);
          }}
        >
          {editing ? t("Save", "儲存") : t("Edit", "編輯")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => convertHoldingNote(note.DumpID, true)}>
          {t("Split into packages", "拆成多個包裹")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => convertHoldingNote(note.DumpID, false)}
        >
          {t("Make one package", "轉為一個包裹")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => archiveHoldingNote(note.DumpID)}>
          {t("Archive", "封存")}
        </Button>
      </div>
    </article>
  );
}
