import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/pf/AppShell";
import { CharacterSays } from "@/components/pf/Character";
import { Chip, Scale } from "@/components/pf/Bits";
import { TaskCard } from "@/components/pf/TaskCard";
import { usePF } from "@/lib/pf/store";
import { uiLabel, useI18n } from "@/lib/pf/i18n";
import type { ReminderPermission } from "@/lib/pf/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/sorting")({
  head: () => ({ meta: [{ title: "Sorting Line — Elster's Persimmon Factory" }] }),
  component: SortingLine,
});

function SortingLine() {
  const {
    db,
    me,
    myTasks,
    updateTask,
    sendAssignment,
    addProject,
    archiveProject,
    addCategory,
    archiveCategory,
  } = usePF();
  const { t, zh } = useI18n();
  const inbox = myTasks().filter((task) => task.OwnerUser === me.UserID && task.Status === "Inbox");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const task = inbox.find((item) => item.TaskID === selectedTaskId) ?? inbox[0];
  const index = task ? inbox.findIndex((item) => item.TaskID === task.TaskID) : -1;
  const [why, setWhy] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [proposedRecipient, setProposedRecipient] = useState("");
  const [reminder, setReminder] = useState<ReminderPermission>("None");
  const [manage, setManage] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryProject, setCategoryProject] = useState("");

  useEffect(() => {
    setWhy(task?.WhyImportant ?? "");
    setCustomDate(task?.Deadline ? task.Deadline.slice(0, 10) : "");
    setProposedRecipient("");
    setReminder(task?.ReminderPermission ?? "None");
    // Reset draft fields only when the selected package changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.TaskID]);

  const connections = db.connections.filter(
    (connection) =>
      connection.Active && connection.ViewerUser === me.UserID && connection.CanAssignTasks,
  );
  const projects = db.projects.filter(
    (project) => project.OwnerUser === me.UserID && !project.ArchivedAt,
  );
  const categories = db.categories.filter(
    (category) => category.OwnerUser === me.UserID && !category.ArchivedAt,
  );
  const recipient = db.users.find((user) => user.UserID === proposedRecipient);

  function move(delta: number) {
    if (!inbox.length) return;
    const next = (Math.max(0, index) + delta + inbox.length) % inbox.length;
    setSelectedTaskId(inbox[next]!.TaskID);
  }

  return (
    <AppShell>
      <CharacterSays id="bulu">
        {t(
          `Control Tower: ${inbox.length} unsorted package${inbox.length === 1 ? "" : "s"} on the line.`,
          `控制塔：分類線上有 ${inbox.length} 個未分類包裹。`,
        )}
      </CharacterSays>

      {inbox.length > 1 ? (
        <div className="mt-3 rounded-3xl bg-card p-3 ring-1 ring-border">
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" size="sm" onClick={() => move(-1)}>
              ← {t("Previous", "上一個")}
            </Button>
            <span className="text-xs font-semibold">
              {index + 1} {t("of", "／")} {inbox.length}
            </span>
            <Button variant="secondary" size="sm" onClick={() => move(1)}>
              {t("Next", "下一個")} →
            </Button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {inbox.map((item) => (
              <Chip
                key={item.TaskID}
                active={item.TaskID === task?.TaskID}
                onClick={() => setSelectedTaskId(item.TaskID)}
              >
                {item.Title}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {!task ? (
        <div className="mt-6 rounded-3xl bg-card p-6 text-center ring-1 ring-border">
          <p className="text-4xl">🏭</p>
          <h2 className="mt-2 font-display text-lg font-bold">
            {t("Line is clear", "分類線已清空")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Nothing is waiting to be sorted.", "沒有包裹等候分類。")}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("Package on the line", "分類線上的包裹")}
            </p>
            <h2 className="font-display text-2xl font-bold leading-snug">{task.Title}</h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold">{t("WHO is this for?", "這是給誰的？")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip active={!proposedRecipient} onClick={() => setProposedRecipient("")}>
                    {t("Me", "我")}
                  </Chip>
                  {connections.map((connection) => {
                    const user = db.users.find((item) => item.UserID === connection.OwnerUser)!;
                    return (
                      <Chip
                        key={connection.ConnectionID}
                        active={proposedRecipient === user.UserID}
                        onClick={() => setProposedRecipient(user.UserID)}
                      >
                        {user.DisplayName}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">{t("WHEN", "何時")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["Today", "Soon", "Later", "No deadline"] as const).map((bucket) => (
                    <Chip
                      key={bucket}
                      active={task.DeadlineBucket === bucket}
                      onClick={() =>
                        updateTask(task.TaskID, {
                          DeadlineBucket: bucket,
                          Deadline:
                            bucket === "Today"
                              ? new Date().toISOString()
                              : bucket === "Soon"
                                ? new Date(Date.now() + 3 * 86400000).toISOString()
                                : bucket === "Later"
                                  ? new Date(Date.now() + 14 * 86400000).toISOString()
                                  : null,
                        })
                      }
                    >
                      {uiLabel(bucket, zh)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(event) => setCustomDate(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      customDate &&
                      updateTask(task.TaskID, {
                        DeadlineBucket: "Custom",
                        Deadline: new Date(`${customDate}T12:00:00`).toISOString(),
                      })
                    }
                  >
                    {t("Set", "設定")}
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t("Project and category", "專案及分類")}</p>
                  <Button size="sm" variant="ghost" onClick={() => setManage((value) => !value)}>
                    {t("Manage", "管理")}
                  </Button>
                </div>
                <select
                  className="mt-2 h-11 w-full rounded-xl border bg-background px-3"
                  value={task.ProjectID ?? ""}
                  onChange={(event) =>
                    updateTask(task.TaskID, {
                      ProjectID: event.target.value || null,
                      CategoryID: null,
                    })
                  }
                >
                  <option value="">{t("No project", "沒有專案")}</option>
                  {projects.map((project) => (
                    <option key={project.ProjectID} value={project.ProjectID}>
                      {project.Name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories
                    .filter(
                      (category) => !category.ProjectID || category.ProjectID === task.ProjectID,
                    )
                    .map((category) => (
                      <Chip
                        key={category.CategoryID}
                        active={task.CategoryID === category.CategoryID}
                        onClick={() =>
                          updateTask(task.TaskID, {
                            CategoryID: category.CategoryID,
                            Category: category.Name as never,
                          })
                        }
                      >
                        {uiLabel(category.Name, zh)}
                      </Chip>
                    ))}
                </div>
                {manage ? (
                  <div className="mt-3 space-y-3 rounded-2xl bg-secondary/50 p-3">
                    <div className="flex gap-2">
                      <Input
                        value={newProject}
                        onChange={(event) => setNewProject(event.target.value)}
                        placeholder={t("New project", "新專案")}
                      />
                      <Button
                        onClick={() => {
                          if (newProject.trim()) {
                            addProject(newProject, "#e58a4d");
                            setNewProject("");
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(event) => setNewCategory(event.target.value)}
                        placeholder={t("New category", "新分類")}
                      />
                      <select
                        className="min-w-28 rounded-xl border bg-background px-2"
                        value={categoryProject}
                        onChange={(event) => setCategoryProject(event.target.value)}
                      >
                        <option value="">{t("General", "一般")}</option>
                        {projects.map((project) => (
                          <option key={project.ProjectID} value={project.ProjectID}>
                            {project.Name}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={() => {
                          if (newCategory.trim()) {
                            addCategory(newCategory, categoryProject || null);
                            setNewCategory("");
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <div className="space-y-1 text-xs">
                      {projects.map((project) => (
                        <button
                          key={project.ProjectID}
                          className="mr-2 text-muted-foreground underline"
                          onClick={() => archiveProject(project.ProjectID)}
                        >
                          {t("Archive", "封存")} {project.Name}
                        </button>
                      ))}
                      {categories
                        .filter((category) => category.OwnerUser === me.UserID)
                        .map((category) => (
                          <button
                            key={category.CategoryID}
                            className="mr-2 text-muted-foreground underline"
                            onClick={() => archiveCategory(category.CategoryID)}
                          >
                            {t("Archive", "封存")} {category.Name}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <Scale
                label={t("Priority", "優先次序")}
                value={task.Priority}
                onChange={(value) => updateTask(task.TaskID, { Priority: value })}
              />
              <Scale
                label={t("Expected load", "預計負荷")}
                hint={t(
                  "How expensive this feels, not just how long it takes.",
                  "這件事感覺有多費力，而不只是需時多久。",
                )}
                value={task.ExpectedLoad}
                onChange={(value) => updateTask(task.TaskID, { ExpectedLoad: value })}
              />
              <label className="block">
                <span className="text-sm font-semibold">
                  {t("Why does this matter?", "為何重要？")}
                </span>
                <Textarea
                  value={why}
                  onChange={(event) => setWhy(event.target.value)}
                  className="mt-1 min-h-24 rounded-2xl"
                />
              </label>

              {recipient ? (
                <div className="rounded-3xl bg-accent p-4 ring-1 ring-border">
                  <h3 className="font-display font-bold">
                    {t(
                      `Review request to ${recipient.DisplayName}`,
                      `檢查給 ${recipient.DisplayName} 的請求`,
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      "The package stays with you until they accept it.",
                      "對方接受前，包裹仍屬於你。",
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["None", "One reminder", "Every 3 days"] as ReminderPermission[]).map(
                      (value) => (
                        <Chip
                          key={value}
                          active={reminder === value}
                          onClick={() => setReminder(value)}
                        >
                          {uiLabel(value, zh)}
                        </Chip>
                      ),
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setProposedRecipient("")}
                    >
                      {t("Cancel", "取消")}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        const id = sendAssignment(task.TaskID, recipient.UserID, {
                          why,
                          load: task.ExpectedLoad,
                          deadline: task.Deadline,
                          reminder,
                        });
                        if (!id) {
                          toast(
                            t(
                              "This package already has an active request.",
                              "此包裹已有進行中的請求。",
                            ),
                          );
                          return;
                        }
                        updateTask(task.TaskID, { Status: "Sorted", WhyImportant: why });
                        toast(
                          t(
                            `Request sent to ${recipient.DisplayName}.`,
                            `請求已傳送給 ${recipient.DisplayName}。`,
                          ),
                        );
                      }}
                    >
                      {t("Send request", "傳送請求")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="h-14 w-full rounded-2xl text-base"
                  onClick={() => {
                    updateTask(task.TaskID, { Status: "Sorted", WhyImportant: why });
                    toast(t("Package sent to the Factory Floor.", "包裹已送到工廠樓層。"));
                  }}
                >
                  🏭 {t("Send to the Factory Floor", "送到工廠樓層")}
                </Button>
              )}
            </div>
          </div>
          <TaskCard task={task} />
        </div>
      )}
    </AppShell>
  );
}
