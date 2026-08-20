import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { usePF } from "@/lib/pf/store";
import { moodLabel, relativeTime, uiLabel, useI18n } from "@/lib/pf/i18n";
import type { ActivityNotification, DB } from "@/lib/pf/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip } from "./Bits";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Filter = "for_me" | "requests" | "mood" | "announcements";

export function BuluInbox() {
  const {
    db,
    me,
    markNotificationRead,
    markAllNotificationsRead,
    replyToAssignment,
    respondSupport,
  } = usePF();
  const { t, zh } = useI18n();
  const [filter, setFilter] = useState<Filter>("for_me");
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const mine = useMemo(
    () =>
      db.notifications
        .filter((item) => item.RecipientUser === me.UserID)
        .sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt)),
    [db.notifications, me.UserID],
  );
  const unread = mine.filter((item) => !item.ReadAt).length;
  const shown = mine.filter((item) => {
    if (filter === "requests")
      return [
        "assignment_response",
        "clarification",
        "task_completed",
        "reminder_response",
      ].includes(item.Type);
    if (filter === "mood")
      return ["mood_check_in", "support_requested", "support_response"].includes(item.Type);
    if (filter === "announcements")
      return ["reminder", "announcement", "appreciation"].includes(item.Type);
    return true;
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="relative h-9 rounded-xl px-3">
          <Bell className="size-4" />
          <span className="sr-only">{t("Open Riedan Inbox", "開啟阿笛收件匣")}</span>
          {unread ? (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Riedan Inbox", "阿笛收件匣")}</SheetTitle>
          <SheetDescription>
            {t(
              "Assignments, replies, support and announcements for this demo user.",
              "此示範用戶的指派、回覆、支援及公告。",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["for_me", t("For me", "給我的")],
              ["requests", t("My requests", "我的請求")],
              ["mood", t("Mood / help", "心情／協助")],
              ["announcements", t("Announcements", "公告")],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
              {label}
            </Chip>
          ))}
        </div>

        {unread ? (
          <Button variant="ghost" className="mt-2 w-full" onClick={markAllNotificationsRead}>
            {t("Mark all as read", "全部標示為已讀")}
          </Button>
        ) : null}

        <div className="mt-3 space-y-3">
          {shown.map((item) => {
            const actor = item.ActorUser
              ? db.users.find((user) => user.UserID === item.ActorUser)
              : null;
            const support = item.SupportRequestID
              ? db.supportRequests.find(
                  (request) => request.SupportRequestID === item.SupportRequestID,
                )
              : null;
            return (
              <article
                key={item.NotificationID}
                className={`rounded-2xl p-3 ring-1 ring-border ${item.ReadAt ? "bg-card" : "bg-accent"}`}
                onClick={() => markNotificationRead(item.NotificationID)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {actor?.DisplayName ?? t("Warehouse", "倉庫")} ·{" "}
                      {relativeTime(item.CreatedAt, zh)}
                    </p>
                    <p className="mt-1 text-sm">{notificationMessage(item, db, zh)}</p>
                  </div>
                  {!item.ReadAt ? (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </div>

                {support?.HelperUser === me.UserID && support.Status === "open" ? (
                  <Button
                    className="mt-3 h-10 w-full rounded-xl"
                    onClick={(event) => {
                      event.stopPropagation();
                      respondSupport(support.SupportRequestID, "accepted");
                    }}
                  >
                    {t("Accept support request", "接受支援請求")}
                  </Button>
                ) : null}

                {item.AssignmentID && item.Type === "clarification" ? (
                  replying === item.NotificationID ? (
                    <div className="mt-3 flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <Input
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder={t("Write a reply", "輸入回覆")}
                      />
                      <Button
                        onClick={() => {
                          if (!reply.trim()) return;
                          replyToAssignment(item.AssignmentID!, reply);
                          setReply("");
                          setReplying(null);
                        }}
                      >
                        {t("Send", "傳送")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="mt-3 h-10 w-full rounded-xl"
                      onClick={(event) => {
                        event.stopPropagation();
                        setReplying(item.NotificationID);
                      }}
                    >
                      {t("Reply", "回覆")}
                    </Button>
                  )
                ) : null}
              </article>
            );
          })}
          {!shown.length ? (
            <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
              {t("Nothing here yet.", "暫時沒有消息。")}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function notificationMessage(item: ActivityNotification, db: DB, zh: boolean) {
  if (!zh) return item.Message;
  const task = item.TaskID ? db.tasks.find((entry) => entry.TaskID === item.TaskID) : null;
  const actor = item.ActorUser ? db.users.find((entry) => entry.UserID === item.ActorUser) : null;
  const assignment = item.AssignmentID
    ? db.assignments.find((entry) => entry.AssignmentID === item.AssignmentID)
    : null;
  const support = item.SupportRequestID
    ? db.supportRequests.find((entry) => entry.SupportRequestID === item.SupportRequestID)
    : null;
  const title = task?.Title ?? "包裹";
  switch (item.Type) {
    case "task_assigned":
      return `${title} 已請求由你處理。`;
    case "assignment_response":
      return `${title}：${uiLabel(task?.AssignmentResponse ?? assignment?.State ?? "", true)}`;
    case "clarification": {
      const message = item.Message.includes(" — ")
        ? item.Message.split(" — ").slice(1).join(" — ")
        : assignment?.LastMessage;
      return `${title}：${message || "有新的澄清訊息"}`;
    }
    case "support_requested":
      return `${title}：${uiLabel(support?.Type ?? "", true)}－${support?.Details ?? ""}`;
    case "support_response":
      return `${title}：支援請求${support?.Status === "resolved" ? "已解決" : "已接受"}。`;
    case "mood_check_in":
      return `${actor?.DisplayName ?? "有人"} 登記為 ${moodLabel(actor?.CurrentMood ?? "Fine", true)}，負荷 ${actor?.CurrentLoad ?? "自動"}/5${actor?.HelpNeeded ? "，並需要協助" : ""}。`;
    case "task_completed":
      return `${title} 已標記為完成。`;
    case "reminder":
      return `${actor?.DisplayName ?? "有人"} 正在跟進「${title}」。`;
    case "reminder_response":
      return `${title}：${item.Message.includes("Got it") ? "📥 收到" : "💤 稍後"}`;
    case "appreciation":
      return item.Message.replace("You received", "你收到");
    case "sorting_handoff":
      return `請你協助整理「${title}」。包裹仍然屬於原本的主人。`;
    case "character_coaching":
      return `托蒂已替「${title}」整理思緒。下一個行動已加入任務。`;
    default:
      return item.Message;
  }
}
