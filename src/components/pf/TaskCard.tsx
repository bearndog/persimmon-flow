import { useState } from "react";
import { toast } from "sonner";
import { usePF, progressOf } from "@/lib/pf/store";
import { uiLabel, useI18n } from "@/lib/pf/i18n";
import type {
  AssignmentResponse,
  BlockerType,
  DetailLevel,
  ReminderPermission,
  SupportType,
  Task,
  Visibility,
} from "@/lib/pf/types";
import { CharacterAvatar, CharacterSays } from "./Character";
import { Chip } from "./Bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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
const RESPONSES: AssignmentResponse[] = [
  "📥 Received",
  "💤 Later / Low Capacity",
  "❓ Need Clarification",
  "🚫 Can't Take This",
  "▶️ In Progress",
  "✅ Done",
];

export function TaskCard({
  task,
  context = "floor",
}: {
  task: Task;
  context?: "sorting" | "floor";
}) {
  const {
    db,
    me,
    updateTask,
    stepsOf,
    addStep,
    toggleStep,
    completeTask,
    splitTask,
    convertStepsToTasks,
    applyBreakdownChoice,
    resolveSpiral,
    handoffSorting,
    requestSupport,
    assignmentForTask,
    respondToAssignment,
  } = usePF();
  const { t, zh } = useI18n();
  const [tool, setTool] = useState<"" | "break" | "spiral" | "support" | "riedan">("");
  const [breakMode, setBreakMode] = useState<"checklist" | "packages">("checklist");
  const [stepText, setStepText] = useState("");
  const [splitText, setSplitText] = useState("");
  const [fact, setFact] = useState("");
  const [next, setNext] = useState("");
  const [park, setPark] = useState(task.ParkedThoughts);
  const [supportType, setSupportType] = useState<SupportType>("Practical help");
  const [helper, setHelper] = useState("");
  const [supportDetails, setSupportDetails] = useState("");
  const [supportTime, setSupportTime] = useState("");
  const [clarification, setClarification] = useState("");
  const [draftResponse, setDraftResponse] = useState<AssignmentResponse | "">(
    task.AssignmentResponse || "",
  );

  const steps = stepsOf(task.TaskID);
  const firstOpen = steps.find((step) => !step.IsDone);
  const progress = progressOf(db, task);
  const assignment = assignmentForTask(task.TaskID);
  const requester = assignment
    ? db.users.find((user) => user.UserID === assignment.RequesterUser)
    : db.users.find((user) => user.UserID === task.RequestedByUser);
  const isRecipient = assignment?.RecipientUser === me.UserID;
  const canRespond =
    isRecipient && assignment && !["rejected", "completed"].includes(assignment.State);
  const project = db.projects.find((item) => item.ProjectID === task.ProjectID);
  const category = db.categories.find((item) => item.CategoryID === task.CategoryID);
  const helpers = db.connections
    .filter((connection) => connection.Active && connection.ViewerUser === me.UserID)
    .map((connection) => db.users.find((user) => user.UserID === connection.OwnerUser)!)
    .filter(Boolean);

  function finish() {
    const unfinished = steps.filter((step) => !step.IsDone).length;
    if (
      unfinished &&
      !window.confirm(
        t(
          `${unfinished} checklist step(s) are unfinished. Ship anyway?`,
          `仍有 ${unfinished} 個清單步驟未完成。仍要出貨嗎？`,
        ),
      )
    )
      return;
    const { persimmons } = completeTask(task.TaskID);
    toast(t(`Package shipped. +${persimmons} 🍊`, `包裹已出貨。+${persimmons} 🍊`));
  }

  if (db.layoutMode === "simple" && context === "floor") {
    return (
      <SimpleTaskCard
        task={task}
        progress={progress}
        onUpdate={(patch) => updateTask(task.TaskID, patch)}
        onFinish={finish}
      />
    );
  }

  return (
    <article className="rounded-3xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-snug">{task.Title}</h3>
          {context === "floor" ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {uiLabel(task.Status, zh)} · {t("load", "負荷")} {task.ExpectedLoad}/5 ·{" "}
              {t("priority", "優先")} {task.Priority}/5
              {project ? ` · ${project.Name}` : ""}
              {category
                ? ` / ${uiLabel(category.Name, zh)}`
                : task.Category
                  ? ` · ${uiLabel(task.Category, zh)}`
                  : ""}
            </p>
          ) : null}
          {task.ParentTaskID ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              ↳ {t("Split from another package", "由另一包裹拆分而來")}
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{progress}%</span>
      </div>
      <Progress value={progress} className="mt-3 h-2" />

      {requester ? (
        <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-xs">
          {t("Requested by", "請求人")} <strong>{requester.DisplayName}</strong>
          {task.WhyImportant ? <> — “{task.WhyImportant}”</> : null}
        </p>
      ) : task.WhyImportant ? (
        <p className="mt-3 rounded-2xl bg-secondary/60 p-3 text-xs">
          {t("Why it matters", "重要原因")}：“{task.WhyImportant}”
        </p>
      ) : null}

      {canRespond && assignment ? (
        <div className="mt-3 rounded-3xl bg-accent p-3 ring-1 ring-border">
          <p className="text-sm font-semibold">{t("Respond to this request", "回覆此請求")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Reminders", "提醒")}：{uiLabel(assignment.ReminderPermission, zh)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RESPONSES.map((response) => (
              <Chip
                key={response}
                active={draftResponse === response}
                onClick={() => setDraftResponse(response)}
              >
                {uiLabel(response, zh)}
              </Chip>
            ))}
          </div>
          <Textarea
            className="mt-2 min-h-20"
            value={clarification}
            onChange={(event) => setClarification(event.target.value)}
            placeholder={t(
              "Clarification question (required for Need Clarification)",
              "澄清問題（選擇「需要澄清」時必填）",
            )}
          />
          <Button
            className="mt-2 w-full"
            disabled={!draftResponse}
            onClick={() => {
              if (draftResponse === "❓ Need Clarification" && !clarification.trim()) {
                toast(t("Write your question first.", "請先寫下想問的問題。"));
                return;
              }
              const result = respondToAssignment(
                assignment.AssignmentID,
                draftResponse as AssignmentResponse,
                clarification,
              );
              toast(t(result.message, result.ok ? "回覆已傳送。" : "請先寫下澄清問題。"));
            }}
          >
            {t("Send response", "傳送回覆")}
          </Button>
        </div>
      ) : null}

      {firstOpen ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-accent p-3">
          <CharacterAvatar id="tottie" size="sm" />
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t("Next tiny action", "下一個微小行動")}
            </p>
            <p className="text-sm font-semibold">{firstOpen.StepText}</p>
          </div>
        </div>
      ) : null}

      {context === "floor" ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Chip active={tool === "break"} onClick={() => setTool(tool === "break" ? "" : "break")}>
            <CharacterAvatar id="tottie" size="sm" /> {t("Break this down", "拆細處理")}
          </Chip>
          <Chip
            active={tool === "spiral"}
            onClick={() => setTool(tool === "spiral" ? "" : "spiral")}
          >
            <CharacterAvatar id="tottie" size="sm" /> {t("Stop spiralling", "停止鑽牛角尖")}
          </Chip>
          <Chip
            active={tool === "support"}
            onClick={() => setTool(tool === "support" ? "" : "support")}
          >
            <CharacterAvatar id="dulcie" size="sm" /> {t("Ground support", "安心支援")}
          </Chip>
          <Chip
            active={tool === "riedan"}
            onClick={() => setTool(tool === "riedan" ? "" : "riedan")}
          >
            <CharacterAvatar id="riedan" size="sm" /> 📣 {t("Reminders", "提醒")}
          </Chip>
        </div>
      ) : null}

      {tool === "break" ? (
        <div className="mt-3 space-y-4 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="tottie">
            {t(
              "Choose one route: keep a checklist inside this package, or make separate packages.",
              "請選一種方式：在這個包裹內建立清單，或拆成多個獨立包裹。",
            )}
          </CharacterSays>
          <div>
            <p className="text-sm font-semibold">{t("What's blocking you?", "有甚麼阻礙你？")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BLOCKERS.map((blocker) => (
                <Chip
                  key={blocker}
                  active={task.BlockerType === blocker}
                  onClick={() => setBreakMode(applyBreakdownChoice(task.TaskID, blocker))}
                >
                  {uiLabel(blocker, zh)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Chip active={breakMode === "checklist"} onClick={() => setBreakMode("checklist")}>
              {t("Checklist", "清單")}
            </Chip>
            <Chip active={breakMode === "packages"} onClick={() => setBreakMode("packages")}>
              {t("Separate packages", "獨立包裹")}
            </Chip>
          </div>
          {breakMode === "checklist" ? (
            <div>
              <p className="text-sm font-semibold">{t("Add checklist steps", "新增清單步驟")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "Keep these as steps, or turn every unfinished step into its own package later.",
                  "你可以保留為清單；之後如有需要，也可把每個未完成步驟變成獨立包裹。",
                )}
              </p>
              <ul className="mt-2 space-y-2">
                {steps.map((step) => (
                  <li key={step.StepID}>
                    <button
                      type="button"
                      onClick={() => toggleStep(step.StepID)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left text-sm ring-1 ring-border"
                    >
                      <span>{step.IsDone ? "✅" : "⬜️"}</span>
                      <span className={step.IsDone ? "line-through opacity-60" : ""}>
                        {step.StepText}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Input
                  value={stepText}
                  onChange={(event) => setStepText(event.target.value)}
                  placeholder={t("Small physical action", "微小的實際行動")}
                />
                <Button
                  onClick={() => {
                    if (stepText.trim()) {
                      addStep(task.TaskID, stepText.trim());
                      setStepText("");
                    }
                  }}
                >
                  {t("Add", "新增")}
                </Button>
              </div>
              {steps.some((step) => !step.IsDone) ? (
                <Button
                  className="mt-2 w-full"
                  variant="secondary"
                  onClick={() => {
                    const count = convertStepsToTasks(task.TaskID);
                    toast(t(`${count} separate packages created.`, `已建立 ${count} 個獨立包裹。`));
                  }}
                >
                  {t("Turn unfinished steps into packages", "把未完成步驟變成獨立包裹")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold">
                {t("Split into separate packages", "拆成獨立包裹")}
              </p>
              <Textarea
                value={splitText}
                onChange={(event) => setSplitText(event.target.value)}
                placeholder={t("One new package per line", "每行一個新包裹")}
              />
              <Button
                className="mt-2 w-full"
                variant="secondary"
                onClick={() => {
                  const count = splitTask(task.TaskID, splitText);
                  if (count) {
                    setSplitText("");
                    toast(t(`${count} linked packages created.`, `已建立 ${count} 個相連包裹。`));
                  }
                }}
              >
                {t("Create separate packages", "建立獨立包裹")}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {tool === "spiral" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="tottie">
            {t(
              "Are we solving the task, or thinking about the task?",
              "我們是在解決任務，還是在反覆想任務？",
            )}
          </CharacterSays>
          <Field
            label={t("FACT — what needs to happen?", "事實－需要發生甚麼？")}
            value={fact}
            onChange={setFact}
          />
          <Field
            label={t("NEXT — what can you do in five minutes?", "下一步－五分鐘內可做甚麼？")}
            value={next}
            onChange={setNext}
          />
          <Field
            label={t("PARK — what can wait?", "暫放－甚麼可以稍後處理？")}
            value={park}
            onChange={setPark}
          />
          <Button
            className="w-full"
            onClick={() => {
              resolveSpiral(task.TaskID, { fact, next, park });
              setTool("");
              toast(
                t(
                  "Tottie saved your next step and sent you an inbox note.",
                  "托蒂已儲存下一步，並在收件匣留下一則訊息。",
                ),
              );
            }}
          >
            {t("Hand it to Tottie", "交給托蒂")}
          </Button>
        </div>
      ) : null}

      {tool === "support" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="dulcie">
            {t("What kind of support would actually help?", "哪一種支援真的有幫助？")}
          </CharacterSays>
          <div className="flex flex-wrap gap-2">
            {SUPPORT.map((type) => (
              <Chip key={type} active={supportType === type} onClick={() => setSupportType(type)}>
                {uiLabel(type, zh)}
              </Chip>
            ))}
          </div>
          <select
            className="h-11 w-full rounded-xl border bg-card px-3"
            value={helper}
            onChange={(event) => setHelper(event.target.value)}
          >
            <option value="">{t("No specific helper", "不指定幫手")}</option>
            {helpers.map((user) => (
              <option key={user.UserID} value={user.UserID}>
                {user.DisplayName}
              </option>
            ))}
          </select>
          <Textarea
            value={supportDetails}
            onChange={(event) => setSupportDetails(event.target.value)}
            placeholder={supportPlaceholder(supportType, t)}
          />
          {supportType === "Body doubling" ? (
            <Input
              type="datetime-local"
              value={supportTime}
              onChange={(event) => setSupportTime(event.target.value)}
            />
          ) : null}
          <Button
            className="w-full"
            onClick={() => {
              const result = requestSupport(
                task.TaskID,
                supportType,
                helper || null,
                supportDetails,
                supportTime ? new Date(supportTime).toISOString() : null,
              );
              toast(
                t(
                  result.message,
                  result.ok ? "支援請求已傳送。求助也是進展。+1 🍊" : "請加入支援詳情。",
                ),
              );
              if (result.ok) setSupportDetails("");
            }}
          >
            {t("Send support request", "傳送支援請求")}
          </Button>
        </div>
      ) : null}

      {tool === "riedan" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="riedan">
            {t(
              "You choose whether this package allows reminders.",
              "你可以決定此包裹是否允許提醒。",
            )}
          </CharacterSays>
          <div className="flex flex-wrap gap-2">
            {(["None", "One reminder", "Every 3 days"] as ReminderPermission[]).map(
              (permission) => (
                <Chip
                  key={permission}
                  active={task.ReminderPermission === permission}
                  onClick={() => updateTask(task.TaskID, { ReminderPermission: permission })}
                >
                  {uiLabel(permission, zh)}
                </Chip>
              ),
            )}
          </div>
        </div>
      ) : null}

      {context === "floor" ? (
        <details className="mt-4">
          <summary className="cursor-pointer list-none rounded-2xl bg-secondary/60 p-3 text-sm font-semibold">
            🔒 {t("Privacy & status", "私隱及狀態")}
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["JUST ME", "MY CONNECTIONS", "SELECTED PEOPLE"] as Visibility[]).map(
                (visibility) => (
                  <Chip
                    key={visibility}
                    active={task.Visibility === visibility}
                    onClick={() => updateTask(task.TaskID, { Visibility: visibility })}
                  >
                    {uiLabel(visibility, zh)}
                  </Chip>
                ),
              )}
            </div>
            {task.Visibility === "SELECTED PEOPLE" ? <SelectedPeople task={task} /> : null}
            <p className="text-xs text-muted-foreground">
              {t(
                "Status, load and priority are edited in the main task area.",
                "狀態、負荷和優先次序請在任務主要區域調整。",
              )}
            </p>
          </div>
        </details>
      ) : null}

      {context === "floor" && task.Status !== "Done" ? (
        <div className="mt-4 rounded-2xl bg-secondary/50 p-3">
          <label className="text-sm font-semibold">
            {t("Progress", "進度")}：{progress}%
            <input
              className="mt-2 w-full accent-primary"
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(event) =>
                updateTask(task.TaskID, { ProgressOverride: Number(event.target.value) })
              }
            />
          </label>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={() => {
              handoffSorting(
                task.TaskID,
                task.OwnerUser === me.UserID ? me.UserID : task.OwnerUser,
              );
              toast(t("Package returned to the Sorting Area.", "包裹已送回整理區。"));
            }}
          >
            ← {t("Back to Sorting Area to edit details", "返回整理區修改資料")}
          </Button>
        </div>
      ) : null}

      {context === "floor" && task.Status !== "Done" && !canRespond ? (
        <Button className="mt-4 h-14 w-full rounded-2xl text-base" onClick={finish}>
          ✅ {t("All set — mark this package shipped", "一切就緒－將此包裹標記為已出貨")}
        </Button>
      ) : null}
    </article>
  );
}

function SimpleTaskCard({
  task,
  progress,
  onUpdate,
  onFinish,
}: {
  task: Task;
  progress: number;
  onUpdate: (patch: Partial<Task>) => void;
  onFinish: () => void;
}) {
  const { db, me, handoffSorting } = usePF();
  const { t, zh } = useI18n();
  const projects = db.projects.filter(
    (project) => project.OwnerUser === task.OwnerUser && !project.ArchivedAt,
  );
  return (
    <article className="rounded-2xl border bg-card p-4">
      <Input
        className="h-12 text-base font-semibold"
        value={task.Title}
        onChange={(event) => onUpdate({ Title: event.target.value })}
        aria-label={t("Task title", "任務名稱")}
      />
      <Textarea
        className="mt-2 min-h-20"
        value={task.Description}
        onChange={(event) => onUpdate({ Description: event.target.value })}
        placeholder={t("Notes", "備註")}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          {t("Project", "項目")}
          <select
            className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"
            value={task.ProjectID ?? ""}
            onChange={(event) =>
              onUpdate({ ProjectID: event.target.value || null, CategoryID: null })
            }
          >
            <option value="">{t("No project", "未加入項目")}</option>
            {projects.map((project) => (
              <option key={project.ProjectID} value={project.ProjectID}>
                {project.Name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          {t("Status", "狀態")}
          <select
            className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm"
            value={task.Status}
            onChange={(event) => onUpdate({ Status: event.target.value as Task["Status"] })}
          >
            {(["Sorted", "In Progress", "Blocked", "Waiting for Someone"] as const).map(
              (status) => (
                <option key={status} value={status}>
                  {uiLabel(status, zh)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="text-xs font-semibold">
          {t("Load", "負荷")}
          <select
            className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
            value={task.ExpectedLoad}
            onChange={(event) => onUpdate({ ExpectedLoad: Number(event.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          {t("Priority", "優先次序")}
          <select
            className="mt-1 h-11 w-full rounded-xl border bg-background px-3"
            value={task.Priority}
            onChange={(event) => onUpdate({ Priority: Number(event.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs font-semibold">
        {t("Progress", "進度")}：{progress}%
        <input
          className="mt-2 w-full accent-primary"
          type="range"
          min="0"
          max="100"
          step="5"
          value={progress}
          onChange={(event) => onUpdate({ ProgressOverride: Number(event.target.value) })}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            handoffSorting(task.TaskID, task.OwnerUser === me.UserID ? me.UserID : task.OwnerUser)
          }
        >
          ← {t("Edit in Sorting", "返回整理")}
        </Button>
        <Button onClick={onFinish}>✅ {t("Done", "完成")}</Button>
      </div>
    </article>
  );
}

function SelectedPeople({ task }: { task: Task }) {
  const { db, setTaskAccess } = usePF();
  const { t, zh } = useI18n();
  return (
    <div className="space-y-2">
      {db.connections
        .filter((connection) => connection.Active && connection.OwnerUser === task.OwnerUser)
        .map((connection) => {
          const user = db.users.find((item) => item.UserID === connection.ViewerUser)!;
          const current = db.access.find(
            (grant) => grant.Task === task.TaskID && grant.ViewerUser === user.UserID,
          )?.DetailLevel;
          return (
            <div
              key={connection.ConnectionID}
              className="flex items-center justify-between rounded-2xl bg-card p-3 text-sm ring-1 ring-border"
            >
              <span>{user.DisplayName}</span>
              <div className="flex gap-1">
                <Chip
                  active={!current}
                  onClick={() => setTaskAccess(task.TaskID, user.UserID, null)}
                >
                  {t("No", "否")}
                </Chip>
                {(["LOAD ONLY", "FULL"] as DetailLevel[]).map((level) => (
                  <Chip
                    key={level}
                    active={current === level}
                    onClick={() => setTaskAccess(task.TaskID, user.UserID, level)}
                  >
                    {uiLabel(level, zh)}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
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
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-20 rounded-2xl bg-card"
      />
    </label>
  );
}

function supportPlaceholder(type: SupportType, t: (english: string, chinese: string) => string) {
  const prompts: Record<SupportType, [string, string]> = {
    "Practical help": ["Describe the exact help needed", "描述需要的實際協助"],
    "Body doubling": ["What will you work on together?", "你們會一起處理甚麼？"],
    Encouragement: ["What would feel encouraging?", "怎樣的鼓勵會有幫助？"],
    "Remind me": ["What should the reminder say?", "提醒應該說甚麼？"],
    "Help me start": ["Write the first tiny action", "寫下第一個微小行動"],
    "Just acknowledge me": ["What do you want witnessed?", "你想對方看見甚麼？"],
    "Give me space": ["What should people pause?", "希望大家暫停甚麼？"],
  };
  return t(...prompts[type]);
}
