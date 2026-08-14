import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedDB } from "./seed";
import type {
  ActivityNotification,
  AssignmentRequest,
  AssignmentResponse,
  CategoryRow,
  DB,
  DetailLevel,
  Language,
  Mood,
  Project,
  ReminderPermission,
  SupportRequest,
  SupportType,
  Task,
  TaskStep,
  User,
  VisibleTask,
} from "./types";

const KEY = "epf.db.v2";
const OLD_KEY = "epf.db.v1";
const now = () => new Date().toISOString();
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function taskDefaults(owner: string): Omit<Task, "TaskID" | "Title"> {
  return {
    Description: "",
    OwnerUser: owner,
    RequestedByUser: null,
    Category: "",
    CategoryID: null,
    ProjectID: null,
    ParentTaskID: null,
    Deadline: null,
    DeadlineBucket: "No deadline",
    Priority: 3,
    ExpectedLoad: 3,
    WhyImportant: "",
    Status: "Inbox",
    Visibility: "JUST ME",
    DetailLevel: "FULL",
    BlockerType: "",
    ParkedThoughts: "",
    SupportRequested: [],
    ReminderPermission: "None",
    LastReminder: null,
    AssignmentResponse: "",
    Interesting: false,
    CreatedAt: now(),
    CompletedAt: null,
  };
}

function migrate(input: unknown): DB {
  const base = seedDB();
  if (!input || typeof input !== "object") return base;
  const old = input as Partial<DB> & Record<string, unknown>;
  const oldCharacters = Array.isArray(old.characters) ? old.characters : [];
  const characters = base.characters.map((character) => {
    const saved = oldCharacters.find((item) => item.CharacterID === character.CharacterID);
    return saved ? { ...character, ...saved } : character;
  });
  const tasks = (Array.isArray(old.tasks) ? old.tasks : base.tasks).map((task) => ({
    ...taskDefaults(task.OwnerUser || base.currentUserId),
    ...task,
    CategoryID: task.CategoryID ?? null,
    ProjectID: task.ProjectID ?? null,
    ParentTaskID: task.ParentTaskID ?? null,
  }));
  const dumps = (Array.isArray(old.dumps) ? old.dumps : []).map((dump) => ({
    ...dump,
    Kind: dump.Kind ?? "holding",
    ResultTaskIDs: dump.ResultTaskIDs ?? [],
    UpdatedAt: dump.UpdatedAt ?? dump.CreatedAt ?? now(),
    ArchivedAt: dump.ArchivedAt ?? null,
  }));
  const assignments = Array.isArray(old.assignments)
    ? old.assignments
    : tasks
        .filter((task) => task.RequestedByUser)
        .map((task) => ({
          AssignmentID: `as_migrated_${task.TaskID}`,
          TaskID: task.TaskID,
          RequesterUser: task.RequestedByUser!,
          RecipientUser: task.OwnerUser,
          WhyImportant: task.WhyImportant,
          ExpectedLoad: task.ExpectedLoad,
          Deadline: task.Deadline,
          ReminderPermission: task.ReminderPermission,
          State:
            task.Status === "Done"
              ? ("completed" as const)
              : task.Status === "In Progress"
                ? ("accepted" as const)
                : ("received" as const),
          LastMessage: "",
          CreatedAt: task.CreatedAt,
          UpdatedAt: task.CompletedAt ?? task.CreatedAt,
        }));

  return {
    ...base,
    ...old,
    schemaVersion: 2,
    language: old.language === "zh-HK" ? "zh-HK" : "en",
    tasks,
    dumps,
    projects: Array.isArray(old.projects) ? old.projects : base.projects,
    categories: Array.isArray(old.categories) ? old.categories : base.categories,
    assignments,
    supportRequests: Array.isArray(old.supportRequests)
      ? old.supportRequests
      : base.supportRequests,
    notifications: Array.isArray(old.notifications) ? old.notifications : base.notifications,
    characters,
  } as DB;
}

function load(): DB {
  if (typeof window === "undefined") return seedDB();
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(OLD_KEY);
    return raw ? migrate(JSON.parse(raw)) : seedDB();
  } catch {
    return seedDB();
  }
}

function notify(
  recipient: string,
  type: ActivityNotification["Type"],
  message: string,
  actor: string | null,
  links: Partial<Pick<ActivityNotification, "TaskID" | "AssignmentID" | "SupportRequestID">> = {},
): ActivityNotification {
  return {
    NotificationID: uid("note"),
    ActorUser: actor,
    RecipientUser: recipient,
    Type: type,
    TaskID: links.TaskID ?? null,
    AssignmentID: links.AssignmentID ?? null,
    SupportRequestID: links.SupportRequestID ?? null,
    Message: message,
    CreatedAt: now(),
    ReadAt: null,
  };
}

/* ---------------- access control ---------------- */

function activeConnection(db: DB, ownerId: string, viewerId: string) {
  return db.connections.find(
    (connection) =>
      connection.Active && connection.OwnerUser === ownerId && connection.ViewerUser === viewerId,
  );
}

export function progressOf(db: DB, task: Task) {
  const steps = db.steps.filter((step) => step.Task === task.TaskID);
  if (task.Status === "Done") return 100;
  if (steps.length === 0) {
    if (task.Status === "Inbox") return 0;
    if (task.Status === "Sorted") return 10;
    if (task.Status === "In Progress") return 50;
    if (task.Status === "Blocked" || task.Status === "Waiting for Someone") return 30;
    return 0;
  }
  return Math.round((steps.filter((step) => step.IsDone).length / steps.length) * 100);
}

export function viewTask(db: DB, task: Task, viewerId: string): VisibleTask | null {
  const progress = progressOf(db, task);
  if (task.OwnerUser === viewerId) return full(task, progress);

  let detail: DetailLevel | null = null;
  if (task.Visibility === "JUST ME") return null;
  if (task.Visibility === "MY CONNECTIONS") {
    const connection = activeConnection(db, task.OwnerUser, viewerId);
    if (!connection?.CanSeeProfile) return null;
    detail = task.DetailLevel;
  }
  if (task.Visibility === "SELECTED PEOPLE") {
    detail =
      db.access.find((grant) => grant.Task === task.TaskID && grant.ViewerUser === viewerId)
        ?.DetailLevel ?? null;
  }
  if (!detail) return null;
  if (detail === "LOAD ONLY") {
    return {
      redacted: true,
      TaskID: task.TaskID,
      OwnerUser: task.OwnerUser,
      Title: "Private background task",
      ExpectedLoad: task.ExpectedLoad,
      Progress: progress,
      Status: task.Status === "Done" ? "Done" : "Active",
    };
  }
  return full(task, progress);
}

function full(task: Task, progress: number): VisibleTask {
  return {
    redacted: false,
    TaskID: task.TaskID,
    OwnerUser: task.OwnerUser,
    Title: task.Title,
    WhyImportant: task.WhyImportant,
    ExpectedLoad: task.ExpectedLoad,
    Priority: task.Priority,
    Progress: progress,
    Status: task.Status,
    Deadline: task.Deadline,
    Category: task.Category,
    SupportRequested: task.SupportRequested,
    RequestedByUser: task.RequestedByUser,
    AssignmentResponse: task.AssignmentResponse,
  };
}

export function calculatedLoad(db: DB, userId: string) {
  const open = db.tasks.filter((task) => task.OwnerUser === userId && task.Status !== "Done");
  if (!open.length) return 1;
  const load = open.reduce((sum, task) => sum + task.ExpectedLoad, 0);
  const urgent = open.filter(
    (task) => task.Deadline && new Date(task.Deadline).getTime() - Date.now() < 5 * 86400000,
  ).length;
  const blocked = open.filter(
    (task) => task.Status === "Blocked" || task.Status === "Waiting for Someone",
  ).length;
  return Math.max(1, Math.min(5, Math.round(load / 4 + urgent * 0.7 + blocked * 0.5)));
}

export function balanceOf(db: DB, userId: string) {
  return db.persimmons
    .filter((event) => event.ToUser === userId)
    .reduce((sum, event) => sum + event.Amount, 0);
}

function completeInDB(db: DB, taskId: string) {
  const task = db.tasks.find((item) => item.TaskID === taskId);
  if (!task || task.Status === "Done") return { db, awarded: 0 };
  const awarded = 1 + task.ExpectedLoad;
  const assignment = db.assignments.find(
    (item) => item.TaskID === taskId && item.State !== "rejected",
  );
  const notifications = assignment
    ? [
        notify(
          assignment.RequesterUser,
          "task_completed",
          `${task.Title} was marked done.`,
          task.OwnerUser,
          { TaskID: taskId, AssignmentID: assignment.AssignmentID },
        ),
        ...db.notifications,
      ]
    : db.notifications;
  return {
    awarded,
    db: {
      ...db,
      tasks: db.tasks.map((item) =>
        item.TaskID === taskId
          ? {
              ...item,
              Status: "Done" as const,
              AssignmentResponse: assignment ? ("✅ Done" as const) : item.AssignmentResponse,
              CompletedAt: now(),
            }
          : item,
      ),
      assignments: db.assignments.map((item) =>
        item.TaskID === taskId ? { ...item, State: "completed" as const, UpdatedAt: now() } : item,
      ),
      notifications,
      persimmons: [
        {
          EventID: uid("pe"),
          FromUser: null,
          ToUser: task.OwnerUser,
          Task: taskId,
          Amount: awarded,
          Reason: `Shipment completed: ${task.Title}`,
          Timestamp: now(),
        },
        ...db.persimmons,
      ],
    },
  };
}

interface Ctx {
  db: DB;
  me: User;
  setCurrentUser: (id: string) => void;
  setLanguage: (language: Language) => void;
  addTask: (task: Partial<Task> & { Title: string }) => string;
  addTasksFromDump: (text: string) => number;
  saveHoldingNote: (text: string) => string;
  updateHoldingNote: (id: string, text: string) => void;
  archiveHoldingNote: (id: string) => void;
  convertHoldingNote: (id: string, asLines: boolean) => number;
  updateTask: (id: string, patch: Partial<Task>) => void;
  completeTask: (id: string) => { persimmons: number };
  splitTask: (id: string, lines: string) => number;
  addStep: (taskId: string, text: string) => void;
  toggleStep: (stepId: string) => void;
  stepsOf: (taskId: string) => TaskStep[];
  sendAssignment: (
    taskId: string,
    recipient: string,
    details: {
      why: string;
      load: number;
      deadline: string | null;
      reminder: ReminderPermission;
    },
  ) => string | null;
  respondToAssignment: (
    assignmentId: string,
    response: AssignmentResponse,
    message?: string,
  ) => { ok: boolean; message: string };
  replyToAssignment: (assignmentId: string, message: string) => void;
  assignmentForTask: (taskId: string) => AssignmentRequest | undefined;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  checkIn: (mood: Mood, load: number | null, help: boolean) => void;
  sendPersimmon: (to: string, reason: string, amount?: number, task?: string | null) => void;
  buluPing: (taskId: string) => { ok: boolean; message: string };
  answerPing: (pingId: string, response: "📥 Got it" | "💤 Later") => void;
  requestSupport: (
    taskId: string,
    type: SupportType,
    helper: string | null,
    details: string,
    suggestedTime?: string | null,
  ) => { ok: boolean; message: string };
  respondSupport: (id: string, status: "accepted" | "resolved") => void;
  addProject: (name: string, colour: string) => string;
  archiveProject: (id: string) => void;
  addCategory: (name: string, projectId: string | null) => string;
  archiveCategory: (id: string) => void;
  setCharacterImage: (id: string, image: string | null) => void;
  setTaskAccess: (taskId: string, viewerId: string, level: DetailLevel | null) => void;
  peopleIShareWith: () => {
    user: User;
    label: string;
    load: number;
    active: number;
    urgent: number;
    blocked: number;
    hidden: number;
    canAssign: boolean;
  }[];
  visibleTasksOf: (ownerId: string) => VisibleTask[];
  myTasks: () => Task[];
  reset: () => void;
}

const PFContext = createContext<Ctx | null>(null);

export function PFProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => seedDB());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDb(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(KEY, JSON.stringify(db));
  }, [db, hydrated]);

  const me = db.users.find((user) => user.UserID === db.currentUserId) ?? db.users[0]!;

  const setCurrentUser = useCallback((id: string) => {
    setDb((current) => ({ ...current, currentUserId: id }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setDb((current) => ({ ...current, language }));
  }, []);

  const addTask = useCallback<Ctx["addTask"]>((partial) => {
    const id = uid("t");
    setDb((current) => ({
      ...current,
      tasks: [{ ...taskDefaults(current.currentUserId), ...partial, TaskID: id }, ...current.tasks],
    }));
    return id;
  }, []);

  const addTasksFromDump = useCallback<Ctx["addTasksFromDump"]>((text) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return 0;
    setDb((current) => {
      const tasks = lines.map((Title) => ({
        ...taskDefaults(current.currentUserId),
        TaskID: uid("t"),
        Title,
      }));
      const created = now();
      return {
        ...current,
        tasks: [...tasks, ...current.tasks],
        dumps: [
          {
            DumpID: uid("dump"),
            User: current.currentUserId,
            Text: text,
            Kind: "converted",
            ResultTaskIDs: tasks.map((task) => task.TaskID),
            CreatedAt: created,
            UpdatedAt: created,
            ArchivedAt: null,
          },
          ...current.dumps,
        ],
      };
    });
    return lines.length;
  }, []);

  const saveHoldingNote = useCallback<Ctx["saveHoldingNote"]>((text) => {
    const id = uid("dump");
    setDb((current) => ({
      ...current,
      dumps: [
        {
          DumpID: id,
          User: current.currentUserId,
          Text: text.trim(),
          Kind: "holding",
          ResultTaskIDs: [],
          CreatedAt: now(),
          UpdatedAt: now(),
          ArchivedAt: null,
        },
        ...current.dumps,
      ],
    }));
    return id;
  }, []);

  const updateHoldingNote = useCallback<Ctx["updateHoldingNote"]>((id, text) => {
    setDb((current) => ({
      ...current,
      dumps: current.dumps.map((dump) =>
        dump.DumpID === id ? { ...dump, Text: text, UpdatedAt: now() } : dump,
      ),
    }));
  }, []);

  const archiveHoldingNote = useCallback<Ctx["archiveHoldingNote"]>((id) => {
    setDb((current) => ({
      ...current,
      dumps: current.dumps.map((dump) =>
        dump.DumpID === id ? { ...dump, ArchivedAt: now() } : dump,
      ),
    }));
  }, []);

  const convertHoldingNote = useCallback<Ctx["convertHoldingNote"]>((id, asLines) => {
    let count = 0;
    setDb((current) => {
      const dump = current.dumps.find((item) => item.DumpID === id);
      if (!dump || dump.ArchivedAt) return current;
      const titles = (asLines ? dump.Text.split("\n") : [dump.Text])
        .map((line) => line.trim())
        .filter(Boolean);
      count = titles.length;
      const tasks = titles.map((Title) => ({
        ...taskDefaults(current.currentUserId),
        TaskID: uid("t"),
        Title,
      }));
      return {
        ...current,
        tasks: [...tasks, ...current.tasks],
        dumps: current.dumps.map((item) =>
          item.DumpID === id
            ? {
                ...item,
                Kind: "converted" as const,
                ResultTaskIDs: tasks.map((task) => task.TaskID),
                UpdatedAt: now(),
              }
            : item,
        ),
      };
    });
    return count;
  }, []);

  const updateTask = useCallback<Ctx["updateTask"]>((id, patch) => {
    setDb((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.TaskID === id ? { ...task, ...patch } : task)),
    }));
  }, []);

  const completeTask = useCallback<Ctx["completeTask"]>((id) => {
    let persimmons = 0;
    setDb((current) => {
      const result = completeInDB(current, id);
      persimmons = result.awarded;
      return result.db;
    });
    return { persimmons };
  }, []);

  const splitTask = useCallback<Ctx["splitTask"]>((id, text) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return 0;
    setDb((current) => {
      const parent = current.tasks.find((task) => task.TaskID === id);
      if (!parent) return current;
      const children = lines.map((Title) => ({
        ...taskDefaults(parent.OwnerUser),
        TaskID: uid("t"),
        Title,
        ParentTaskID: parent.TaskID,
        ProjectID: parent.ProjectID,
        CategoryID: parent.CategoryID,
        Category: parent.Category,
        Visibility: parent.Visibility,
        DetailLevel: parent.DetailLevel,
      }));
      return {
        ...current,
        tasks: [
          ...children,
          ...current.tasks.map((task) =>
            task.TaskID === id ? { ...task, Status: "Split into packages" as const } : task,
          ),
        ],
      };
    });
    return lines.length;
  }, []);

  const addStep = useCallback<Ctx["addStep"]>((taskId, text) => {
    setDb((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          StepID: uid("st"),
          Task: taskId,
          StepOrder: current.steps.filter((step) => step.Task === taskId).length + 1,
          StepText: text,
          IsDone: false,
        },
      ],
    }));
  }, []);

  const toggleStep = useCallback<Ctx["toggleStep"]>((stepId) => {
    setDb((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.StepID === stepId ? { ...step, IsDone: !step.IsDone } : step,
      ),
    }));
  }, []);

  const stepsOf = useCallback(
    (taskId: string) =>
      db.steps.filter((step) => step.Task === taskId).sort((a, b) => a.StepOrder - b.StepOrder),
    [db.steps],
  );

  const sendAssignment = useCallback<Ctx["sendAssignment"]>((taskId, recipient, details) => {
    let result: string | null = null;
    setDb((current) => {
      const task = current.tasks.find((item) => item.TaskID === taskId);
      if (!task || task.OwnerUser !== current.currentUserId) return current;
      const existing = current.assignments.find(
        (item) => item.TaskID === taskId && !["rejected", "completed"].includes(item.State),
      );
      if (existing) return current;
      const id = uid("as");
      result = id;
      const assignment: AssignmentRequest = {
        AssignmentID: id,
        TaskID: taskId,
        RequesterUser: current.currentUserId,
        RecipientUser: recipient,
        WhyImportant: details.why,
        ExpectedLoad: details.load,
        Deadline: details.deadline,
        ReminderPermission: details.reminder,
        State: "pending",
        LastMessage: "",
        CreatedAt: now(),
        UpdatedAt: now(),
      };
      return {
        ...current,
        assignments: [assignment, ...current.assignments],
        notifications: [
          notify(
            recipient,
            "task_assigned",
            `${task.Title} was requested from you.`,
            current.currentUserId,
            {
              TaskID: taskId,
              AssignmentID: id,
            },
          ),
          ...current.notifications,
        ],
        tasks: current.tasks.map((item) =>
          item.TaskID === taskId
            ? {
                ...item,
                WhyImportant: details.why,
                ExpectedLoad: details.load,
                Deadline: details.deadline,
                ReminderPermission: details.reminder,
              }
            : item,
        ),
      };
    });
    return result;
  }, []);

  const respondToAssignment = useCallback<Ctx["respondToAssignment"]>(
    (assignmentId, response, message = "") => {
      if (response === "❓ Need Clarification" && !message.trim()) {
        return { ok: false, message: "Please add the clarification question." };
      }
      let result = { ok: false, message: "Assignment not found." };
      setDb((current) => {
        const assignment = current.assignments.find((item) => item.AssignmentID === assignmentId);
        if (!assignment || assignment.RecipientUser !== current.currentUserId) return current;
        const task = current.tasks.find((item) => item.TaskID === assignment.TaskID);
        if (!task) return current;
        const state =
          response === "📥 Received"
            ? "received"
            : response === "💤 Later / Low Capacity"
              ? "later"
              : response === "❓ Need Clarification"
                ? "clarification_needed"
                : response === "🚫 Can't Take This"
                  ? "rejected"
                  : response === "▶️ In Progress"
                    ? "accepted"
                    : "completed";
        const updated: DB = {
          ...current,
          assignments: current.assignments.map((item) =>
            item.AssignmentID === assignmentId
              ? { ...item, State: state, LastMessage: message.trim(), UpdatedAt: now() }
              : item,
          ),
          tasks: current.tasks.map((item) =>
            item.TaskID === task.TaskID
              ? {
                  ...item,
                  OwnerUser:
                    state === "accepted" || state === "completed"
                      ? assignment.RecipientUser
                      : item.OwnerUser,
                  RequestedByUser:
                    state === "accepted" || state === "completed"
                      ? assignment.RequesterUser
                      : item.RequestedByUser,
                  AssignmentResponse: response,
                  Status:
                    state === "accepted"
                      ? "In Progress"
                      : state === "rejected"
                        ? "Sorted"
                        : item.Status,
                }
              : item,
          ),
          notifications: [
            notify(
              assignment.RequesterUser,
              response === "❓ Need Clarification" ? "clarification" : "assignment_response",
              `${task.Title}: ${response}${message.trim() ? ` — ${message.trim()}` : ""}`,
              assignment.RecipientUser,
              { TaskID: task.TaskID, AssignmentID: assignmentId },
            ),
            ...current.notifications,
          ],
        };
        result = { ok: true, message: "Response sent." };
        if (state === "completed") {
          const completed = completeInDB(updated, task.TaskID);
          return completed.db;
        }
        return updated;
      });
      return result;
    },
    [],
  );

  const replyToAssignment = useCallback<Ctx["replyToAssignment"]>((assignmentId, message) => {
    if (!message.trim()) return;
    setDb((current) => {
      const assignment = current.assignments.find((item) => item.AssignmentID === assignmentId);
      if (!assignment) return current;
      const other =
        current.currentUserId === assignment.RequesterUser
          ? assignment.RecipientUser
          : assignment.RequesterUser;
      const task = current.tasks.find((item) => item.TaskID === assignment.TaskID);
      return {
        ...current,
        assignments: current.assignments.map((item) =>
          item.AssignmentID === assignmentId
            ? { ...item, LastMessage: message.trim(), UpdatedAt: now() }
            : item,
        ),
        notifications: [
          notify(
            other,
            "clarification",
            `${task?.Title ?? "Package"}: ${message.trim()}`,
            current.currentUserId,
            {
              TaskID: assignment.TaskID,
              AssignmentID: assignmentId,
            },
          ),
          ...current.notifications,
        ],
      };
    });
  }, []);

  const assignmentForTask = useCallback(
    (taskId: string) =>
      db.assignments.find(
        (item) => item.TaskID === taskId && !["rejected", "completed"].includes(item.State),
      ) ?? db.assignments.find((item) => item.TaskID === taskId),
    [db.assignments],
  );

  const markNotificationRead = useCallback<Ctx["markNotificationRead"]>((id) => {
    setDb((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.NotificationID === id && !item.ReadAt ? { ...item, ReadAt: now() } : item,
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback<Ctx["markAllNotificationsRead"]>(() => {
    setDb((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.RecipientUser === current.currentUserId && !item.ReadAt
          ? { ...item, ReadAt: now() }
          : item,
      ),
    }));
  }, []);

  const checkIn = useCallback<Ctx["checkIn"]>((mood, load, help) => {
    setDb((current) => {
      const actor = current.currentUserId;
      const recipients = current.connections
        .filter((connection) => connection.Active && connection.OwnerUser === actor)
        .map((connection) => connection.ViewerUser);
      const actorName =
        current.users.find((user) => user.UserID === actor)?.DisplayName ?? "Someone";
      return {
        ...current,
        users: current.users.map((user) =>
          user.UserID === actor
            ? {
                ...user,
                CurrentMood: mood,
                CurrentLoad: load,
                HelpNeeded: help,
                LastCheckIn: now(),
              }
            : user,
        ),
        notifications: [
          ...recipients.map((recipient) =>
            notify(
              recipient,
              "mood_check_in",
              `${actorName} checked in as ${mood}, load ${load ?? "auto"}/5${help ? ", and needs help" : ""}.`,
              actor,
            ),
          ),
          ...current.notifications,
        ],
      };
    });
  }, []);

  const sendPersimmon = useCallback<Ctx["sendPersimmon"]>((to, reason, amount = 1, task = null) => {
    setDb((current) => ({
      ...current,
      persimmons: [
        {
          EventID: uid("pe"),
          FromUser: current.currentUserId,
          ToUser: to,
          Task: task,
          Amount: amount,
          Reason: reason,
          Timestamp: now(),
        },
        {
          EventID: uid("pe"),
          FromUser: null,
          ToUser: current.currentUserId,
          Task: task,
          Amount: -amount,
          Reason: "Sent appreciation",
          Timestamp: now(),
        },
        ...current.persimmons,
      ],
      notifications: [
        notify(to, "appreciation", `You received ${amount} 🍊: ${reason}`, current.currentUserId, {
          TaskID: task,
        }),
        ...current.notifications,
      ],
    }));
  }, []);

  const buluPing = useCallback<Ctx["buluPing"]>((taskId) => {
    let result = { ok: false, message: "Package not found." };
    setDb((current) => {
      const task = current.tasks.find((item) => item.TaskID === taskId);
      const assignment = current.assignments.find(
        (item) => item.TaskID === taskId && !["rejected", "completed"].includes(item.State),
      );
      if (!task || !assignment || assignment.RequesterUser !== current.currentUserId)
        return current;
      if (assignment.ReminderPermission === "None") {
        result = { ok: false, message: "Reminders are off for this package." };
        return current;
      }
      if (balanceOf(current, current.currentUserId) < 1) {
        result = { ok: false, message: "You need 1 🍊 to send a Bulu ping." };
        return current;
      }
      const previous = current.pings
        .filter((ping) => ping.Task === taskId)
        .sort((a, b) => b.Timestamp.localeCompare(a.Timestamp))[0];
      if (assignment.ReminderPermission === "One reminder" && previous) {
        result = { ok: false, message: "The one permitted reminder was already sent." };
        return current;
      }
      if (previous && Date.now() - new Date(previous.Timestamp).getTime() < 86400000) {
        result = { ok: false, message: "Bulu allows one ping per package per 24 hours." };
        return current;
      }
      const actor = current.users.find((user) => user.UserID === current.currentUserId)!;
      const pingId = uid("ping");
      const message = `${actor.DisplayName} is checking in about ${task.Title}.`;
      result = { ok: true, message: "Bulu announcement dispatched." };
      return {
        ...current,
        pings: [
          {
            PingID: pingId,
            Task: taskId,
            FromUser: current.currentUserId,
            ToUser: assignment.RecipientUser,
            Message: message,
            Timestamp: now(),
            Response: "",
          },
          ...current.pings,
        ],
        notifications: [
          notify(assignment.RecipientUser, "reminder", message, current.currentUserId, {
            TaskID: taskId,
            AssignmentID: assignment.AssignmentID,
          }),
          ...current.notifications,
        ],
        persimmons: [
          {
            EventID: uid("pe"),
            FromUser: null,
            ToUser: current.currentUserId,
            Task: taskId,
            Amount: -1,
            Reason: "Bulu ping",
            Timestamp: now(),
          },
          ...current.persimmons,
        ],
        tasks: current.tasks.map((item) =>
          item.TaskID === taskId ? { ...item, LastReminder: now() } : item,
        ),
      };
    });
    return result;
  }, []);

  const answerPing = useCallback<Ctx["answerPing"]>((pingId, response) => {
    setDb((current) => {
      const ping = current.pings.find((item) => item.PingID === pingId);
      if (!ping || ping.ToUser !== current.currentUserId) return current;
      const task = current.tasks.find((item) => item.TaskID === ping.Task);
      return {
        ...current,
        pings: current.pings.map((item) =>
          item.PingID === pingId ? { ...item, Response: response } : item,
        ),
        notifications: [
          notify(
            ping.FromUser,
            "reminder_response",
            `${task?.Title ?? "Package"}: ${response}`,
            current.currentUserId,
            { TaskID: ping.Task },
          ),
          ...current.notifications,
        ],
      };
    });
  }, []);

  const requestSupport = useCallback<Ctx["requestSupport"]>(
    (taskId, type, helper, details, suggestedTime = null) => {
      let result = { ok: false, message: "Please add support details." };
      if (!details.trim()) return result;
      setDb((current) => {
        const duplicate = current.supportRequests.find(
          (item) => item.TaskID === taskId && item.Type === type && item.Status === "open",
        );
        if (duplicate) {
          result = { ok: false, message: "This support request is already open." };
          return current;
        }
        const id = uid("support");
        const request: SupportRequest = {
          SupportRequestID: id,
          TaskID: taskId,
          RequesterUser: current.currentUserId,
          HelperUser: helper,
          Type: type,
          Details: details.trim(),
          SuggestedTime: suggestedTime,
          Status: "open",
          CreatedAt: now(),
          UpdatedAt: now(),
        };
        const task = current.tasks.find((item) => item.TaskID === taskId);
        result = { ok: true, message: "Support request sent. Asking for help is progress. +1 🍊" };
        return {
          ...current,
          supportRequests: [request, ...current.supportRequests],
          tasks: current.tasks.map((item) =>
            item.TaskID === taskId
              ? { ...item, SupportRequested: Array.from(new Set([...item.SupportRequested, type])) }
              : item,
          ),
          notifications: helper
            ? [
                notify(
                  helper,
                  "support_requested",
                  `${task?.Title ?? "Package"}: ${type} — ${details.trim()}`,
                  current.currentUserId,
                  { TaskID: taskId, SupportRequestID: id },
                ),
                ...current.notifications,
              ]
            : current.notifications,
          persimmons: [
            {
              EventID: uid("pe"),
              FromUser: null,
              ToUser: current.currentUserId,
              Task: taskId,
              Amount: 1,
              Reason: "Asked for help — that is progress",
              Timestamp: now(),
            },
            ...current.persimmons,
          ],
        };
      });
      return result;
    },
    [],
  );

  const respondSupport = useCallback<Ctx["respondSupport"]>((id, status) => {
    setDb((current) => {
      const request = current.supportRequests.find((item) => item.SupportRequestID === id);
      if (!request || request.HelperUser !== current.currentUserId) return current;
      const task = current.tasks.find((item) => item.TaskID === request.TaskID);
      return {
        ...current,
        supportRequests: current.supportRequests.map((item) =>
          item.SupportRequestID === id ? { ...item, Status: status, UpdatedAt: now() } : item,
        ),
        notifications: [
          notify(
            request.RequesterUser,
            "support_response",
            `${task?.Title ?? "Package"}: support ${status}.`,
            current.currentUserId,
            { TaskID: request.TaskID, SupportRequestID: id },
          ),
          ...current.notifications,
        ],
      };
    });
  }, []);

  const addProject = useCallback<Ctx["addProject"]>((name, colour) => {
    const id = uid("project");
    setDb((current) => ({
      ...current,
      projects: [
        {
          ProjectID: id,
          OwnerUser: current.currentUserId,
          Name: name.trim(),
          Colour: colour,
          ArchivedAt: null,
        },
        ...current.projects,
      ],
    }));
    return id;
  }, []);

  const archiveProject = useCallback<Ctx["archiveProject"]>((id) => {
    setDb((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.ProjectID === id ? { ...item, ArchivedAt: now() } : item,
      ),
    }));
  }, []);

  const addCategory = useCallback<Ctx["addCategory"]>((name, projectId) => {
    const id = uid("cat");
    setDb((current) => ({
      ...current,
      categories: [
        {
          CategoryID: id,
          OwnerUser: current.currentUserId,
          ProjectID: projectId,
          Name: name.trim(),
          ArchivedAt: null,
        },
        ...current.categories,
      ],
    }));
    return id;
  }, []);

  const archiveCategory = useCallback<Ctx["archiveCategory"]>((id) => {
    setDb((current) => ({
      ...current,
      categories: current.categories.map((item) =>
        item.CategoryID === id ? { ...item, ArchivedAt: now() } : item,
      ),
    }));
  }, []);

  const setCharacterImage = useCallback<Ctx["setCharacterImage"]>((id, image) => {
    setDb((current) => ({
      ...current,
      characters: current.characters.map((character) =>
        character.CharacterID === id ? { ...character, Image: image } : character,
      ),
    }));
  }, []);

  const setTaskAccess = useCallback<Ctx["setTaskAccess"]>((taskId, viewerId, level) => {
    setDb((current) => {
      const rest = current.access.filter(
        (grant) => !(grant.Task === taskId && grant.ViewerUser === viewerId),
      );
      return {
        ...current,
        access: level
          ? [
              { AccessID: uid("access"), Task: taskId, ViewerUser: viewerId, DetailLevel: level },
              ...rest,
            ]
          : rest,
      };
    });
  }, []);

  const visibleTasksOf = useCallback<Ctx["visibleTasksOf"]>(
    (ownerId) =>
      db.tasks
        .filter((task) => task.OwnerUser === ownerId)
        .map((task) => viewTask(db, task, db.currentUserId))
        .filter((task): task is VisibleTask => task !== null),
    [db],
  );

  const peopleIShareWith = useCallback<Ctx["peopleIShareWith"]>(() => {
    return db.connections
      .filter((connection) => connection.Active && connection.ViewerUser === db.currentUserId)
      .map((connection) => {
        const user = db.users.find((item) => item.UserID === connection.OwnerUser)!;
        const visible = db.tasks
          .filter((task) => task.OwnerUser === user.UserID)
          .map((task) => viewTask(db, task, db.currentUserId))
          .filter((task): task is VisibleTask => task !== null);
        const open = visible.filter((task) => task.Status !== "Done");
        return {
          user,
          label: connection.RelationshipLabel,
          load: connection.CanSeeLoad ? (user.CurrentLoad ?? calculatedLoad(db, user.UserID)) : 0,
          active: open.length,
          urgent: open.filter(
            (task) =>
              !task.redacted &&
              task.Deadline &&
              new Date(task.Deadline).getTime() - Date.now() < 5 * 86400000,
          ).length,
          blocked: open.filter(
            (task) =>
              !task.redacted &&
              (task.Status === "Blocked" || task.Status === "Waiting for Someone"),
          ).length,
          hidden: open.filter((task) => task.redacted).length,
          canAssign: connection.CanAssignTasks,
        };
      });
  }, [db]);

  const myTasks = useCallback(() => {
    const assignmentTaskIds = new Set(
      db.assignments
        .filter(
          (item) =>
            item.RecipientUser === db.currentUserId &&
            !["rejected", "completed"].includes(item.State),
        )
        .map((item) => item.TaskID),
    );
    return db.tasks.filter(
      (task) => task.OwnerUser === db.currentUserId || assignmentTaskIds.has(task.TaskID),
    );
  }, [db]);

  const reset = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(OLD_KEY);
    setDb(seedDB());
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      db,
      me,
      setCurrentUser,
      setLanguage,
      addTask,
      addTasksFromDump,
      saveHoldingNote,
      updateHoldingNote,
      archiveHoldingNote,
      convertHoldingNote,
      updateTask,
      completeTask,
      splitTask,
      addStep,
      toggleStep,
      stepsOf,
      sendAssignment,
      respondToAssignment,
      replyToAssignment,
      assignmentForTask,
      markNotificationRead,
      markAllNotificationsRead,
      checkIn,
      sendPersimmon,
      buluPing,
      answerPing,
      requestSupport,
      respondSupport,
      addProject,
      archiveProject,
      addCategory,
      archiveCategory,
      setCharacterImage,
      setTaskAccess,
      peopleIShareWith,
      visibleTasksOf,
      myTasks,
      reset,
    }),
    [
      db,
      me,
      setCurrentUser,
      setLanguage,
      addTask,
      addTasksFromDump,
      saveHoldingNote,
      updateHoldingNote,
      archiveHoldingNote,
      convertHoldingNote,
      updateTask,
      completeTask,
      splitTask,
      addStep,
      toggleStep,
      stepsOf,
      sendAssignment,
      respondToAssignment,
      replyToAssignment,
      assignmentForTask,
      markNotificationRead,
      markAllNotificationsRead,
      checkIn,
      sendPersimmon,
      buluPing,
      answerPing,
      requestSupport,
      respondSupport,
      addProject,
      archiveProject,
      addCategory,
      archiveCategory,
      setCharacterImage,
      setTaskAccess,
      peopleIShareWith,
      visibleTasksOf,
      myTasks,
      reset,
    ],
  );

  return <PFContext.Provider value={value}>{children}</PFContext.Provider>;
}

export function usePF() {
  const context = useContext(PFContext);
  if (!context) throw new Error("usePF must be used inside PFProvider");
  return context;
}

export function useCharacter(id: string) {
  const { db } = usePF();
  return db.characters.find((character) => character.CharacterID === id)!;
}
