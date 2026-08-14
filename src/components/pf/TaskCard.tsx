import { useState } from "react";
import { toast } from "sonner";
import { usePF, progressOf } from "@/lib/pf/store";
import { uiLabel, useI18n } from "@/lib/pf/i18n";
import type {
  AssignmentResponse,
  BlockerType,
  DetailLevel,
  ReminderPermission,
  Status,
  SupportType,
  Task,
  Visibility,
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
const RESPONSES: AssignmentResponse[] = [
  "📥 Received",
  "💤 Later / Low Capacity",
  "❓ Need Clarification",
  "🚫 Can't Take This",
  "▶️ In Progress",
  "✅ Done",
];

export function TaskCard({ task }: { task: Task }) {
  const {
    db,
    me,
    updateTask,
    stepsOf,
    addStep,
    toggleStep,
    completeTask,
    splitTask,
    requestSupport,
    assignmentForTask,
    respondToAssignment,
  } = usePF();
  const { t, zh } = useI18n();
  const [tool, setTool] = useState<"" | "break" | "spiral" | "support" | "bulu">("");
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

  const steps = stepsOf(task.TaskID);
  const firstOpen = steps.find((step) => !step.IsDone);
  const progress = progressOf(db, task);
  const assignment = assignmentForTask(task.TaskID);
  const requester = assignment
    ? db.users.find((user) => user.UserID === assignment.RequesterUser)
    : db.users.find((user) => user.UserID === task.RequestedByUser);
  const isRecipient = assignment?.RecipientUser === me.UserID;
  const waitingForAcceptance =
    isRecipient &&
    ["pending", "received", "later", "clarification_needed"].includes(assignment.State);
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

  return (
    <article className="rounded-3xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-snug">{task.Title}</h3>
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

      {waitingForAcceptance && assignment ? (
        <div className="mt-3 rounded-3xl bg-accent p-3 ring-1 ring-border">
          <p className="text-sm font-semibold">{t("Respond to this request", "回覆此請求")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Reminders", "提醒")}：{uiLabel(assignment.ReminderPermission, zh)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RESPONSES.map((response) => (
              <Chip
                key={response}
                active={task.AssignmentResponse === response}
                onClick={() => {
                  if (response === "❓ Need Clarification" && !clarification.trim()) {
                    toast(t("Write your question first.", "請先輸入問題。"));
                    return;
                  }
                  const result = respondToAssignment(
                    assignment.AssignmentID,
                    response,
                    clarification,
                  );
                  toast(t(result.message, result.ok ? "回覆已傳送。" : "請先輸入澄清問題。"));
                }}
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
        </div>
      ) : null}

      {firstOpen ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-accent p-3">
          <CharacterAvatar id="neuna" size="sm" />
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t("Next tiny action", "下一個微小行動")}
            </p>
            <p className="text-sm font-semibold">{firstOpen.StepText}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={tool === "break"} onClick={() => setTool(tool === "break" ? "" : "break")}>
          🐈‍⬛ {t("Break this down", "拆細任務")}
        </Chip>
        <Chip active={tool === "spiral"} onClick={() => setTool(tool === "spiral" ? "" : "spiral")}>
          🌀 {t("Stop spiralling", "停止反覆思考")}
        </Chip>
        <Chip
          active={tool === "support"}
          onClick={() => setTool(tool === "support" ? "" : "support")}
        >
          🐕 {t("Ask Nuffel", "找 Nuffel 幫忙")}
        </Chip>
        <Chip active={tool === "bulu"} onClick={() => setTool(tool === "bulu" ? "" : "bulu")}>
          🐰 {t("Reminders", "提醒")}
        </Chip>
      </div>

      {tool === "break" ? (
        <div className="mt-3 space-y-4 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="neuna">
            {t(
              "Checklist steps stay in this package. Splitting creates separate packages.",
              "清單步驟留在此包裹；拆分則會建立獨立包裹。",
            )}
          </CharacterSays>
          <div>
            <p className="text-sm font-semibold">{t("What's blocking you?", "有甚麼阻礙你？")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BLOCKERS.map((blocker) => (
                <Chip
                  key={blocker}
                  active={task.BlockerType === blocker}
                  onClick={() =>
                    updateTask(task.TaskID, {
                      BlockerType: task.BlockerType === blocker ? "" : blocker,
                      Status: task.Status === "Inbox" ? "Sorted" : task.Status,
                    })
                  }
                >
                  {uiLabel(blocker, zh)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">{t("Add checklist steps", "新增清單步驟")}</p>
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
          </div>
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
        </div>
      ) : null}

      {tool === "spiral" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="neuna">
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
              updateTask(task.TaskID, { ParkedThoughts: park });
              if (next.trim()) addStep(task.TaskID, next.trim());
              toast(t("Neuna parked those thoughts.", "Neuna 已替你暫放那些想法。"));
            }}
          >
            {t("Hand it to Neuna", "交給 Neuna")}
          </Button>
        </div>
      ) : null}

      {tool === "support" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="nuffel">
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

      {tool === "bulu" ? (
        <div className="mt-3 space-y-3 rounded-3xl bg-secondary/50 p-3">
          <CharacterSays id="bulu">
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
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <Chip
                key={status}
                active={task.Status === status}
                onClick={() =>
                  status === "Done" ? finish() : updateTask(task.TaskID, { Status: status })
                }
              >
                {uiLabel(status, zh)}
              </Chip>
            ))}
          </div>
          <Scale
            label={t("Expected load", "預計負荷")}
            value={task.ExpectedLoad}
            onChange={(value) => updateTask(task.TaskID, { ExpectedLoad: value })}
          />
          <Scale
            label={t("Priority", "優先次序")}
            value={task.Priority}
            onChange={(value) => updateTask(task.TaskID, { Priority: value })}
          />
          <label className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3 text-sm font-semibold">
            {t("Goldie: this is interesting", "Goldie：這件事很有趣")}
            <Switch
              checked={task.Interesting}
              onCheckedChange={(value) => updateTask(task.TaskID, { Interesting: value })}
            />
          </label>
        </div>
      </details>

      {task.Status !== "Done" && !waitingForAcceptance ? (
        <Button className="mt-4 h-14 w-full rounded-2xl text-base" onClick={finish}>
          ✅ {t("All set — mark this package shipped", "一切就緒－將此包裹標記為已出貨")}
        </Button>
      ) : null}
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
