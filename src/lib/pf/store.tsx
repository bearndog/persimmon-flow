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
  DB,
  Mood,
  SupportType,
  Task,
  TaskStep,
  User,
  VisibleTask,
} from "./types";

const KEY = "epf.db.v1";

function load(): DB {
  if (typeof window === "undefined") return seedDB();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seedDB();
    const parsed = JSON.parse(raw) as DB;
    // always refresh the character table from code (V1 artwork is swappable)
    return { ...seedDB(), ...parsed, characters: seedDB().characters };
  } catch {
    return seedDB();
  }
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

/* ---------------- access control ---------------- */

function activeConnection(db: DB, ownerId: string, viewerId: string) {
  return db.connections.find(
    (c) => c.Active && c.OwnerUser === ownerId && c.ViewerUser === viewerId,
  );
}

export function progressOf(db: DB, task: Task) {
  const steps = db.steps.filter((s) => s.Task === task.TaskID);
  if (task.Status === "Done") return 100;
  if (steps.length === 0) {
    switch (task.Status) {
      case "Inbox":
        return 0;
      case "Sorted":
        return 10;
      case "In Progress":
        return 50;
      case "Blocked":
      case "Waiting for Someone":
        return 30;
      default:
        return 0;
    }
  }
  return Math.round((steps.filter((s) => s.IsDone).length / steps.length) * 100);
}

/** The single gate: returns only the data a viewer is authorised to receive. */
export function viewTask(db: DB, task: Task, viewerId: string): VisibleTask | null {
  const progress = progressOf(db, task);
  if (task.OwnerUser === viewerId) return full(task, progress);

  let detail: "FULL" | "LOAD ONLY" | null = null;

  if (task.Visibility === "JUST ME") return null;
  if (task.Visibility === "MY CONNECTIONS") {
    const conn = activeConnection(db, task.OwnerUser, viewerId);
    if (!conn || !conn.CanSeeProfile) return null;
    detail = task.DetailLevel;
  }
  if (task.Visibility === "SELECTED PEOPLE") {
    const grant = db.access.find(
      (a) => a.Task === task.TaskID && a.ViewerUser === viewerId,
    );
    if (!grant) return null;
    detail = grant.DetailLevel;
  }
  if (detail === null) return null;
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
  const open = db.tasks.filter(
    (t) => t.OwnerUser === userId && t.Status !== "Done",
  );
  if (open.length === 0) return 1;
  const loadSum = open.reduce((a, t) => a + t.ExpectedLoad, 0);
  const urgent = open.filter(
    (t) =>
      t.Deadline && new Date(t.Deadline).getTime() - Date.now() < 5 * 86400000,
  ).length;
  const blocked = open.filter(
    (t) => t.Status === "Blocked" || t.Status === "Waiting for Someone",
  ).length;
  const score = loadSum / 4 + urgent * 0.7 + blocked * 0.5;
  return Math.max(1, Math.min(5, Math.round(score)));
}

export function balanceOf(db: DB, userId: string) {
  return db.persimmons
    .filter((p) => p.ToUser === userId)
    .reduce((a, p) => a + p.Amount, 0)
    .valueOf();
}

/* ---------------- context ---------------- */

interface Ctx {
  db: DB;
  me: User;
  setCurrentUser: (id: string) => void;
  addTask: (t: Partial<Task> & { Title: string }) => string;
  addTasksFromDump: (text: string, asLines: boolean) => number;
  updateTask: (id: string, patch: Partial<Task>) => void;
  completeTask: (id: string) => { persimmons: number };
  addStep: (taskId: string, text: string) => void;
  toggleStep: (stepId: string) => void;
  stepsOf: (taskId: string) => TaskStep[];
  checkIn: (mood: Mood, load: number | null, help: boolean) => void;
  sendPersimmon: (toUser: string, reason: string, amount?: number, task?: string | null) => void;
  buluPing: (taskId: string) => { ok: boolean; message: string };
  answerPing: (pingId: string, response: "📥 Got it" | "💤 Later") => void;
  requestSupport: (taskId: string, types: SupportType[]) => void;
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

  const me = db.users.find((u) => u.UserID === db.currentUserId) ?? db.users[0]!;

  const setCurrentUser = useCallback(
    (id: string) => setDb((d) => ({ ...d, currentUserId: id })),
    [],
  );

  const addTask = useCallback<Ctx["addTask"]>((partial) => {
    const id = uid("t");
    setDb((d) => ({
      ...d,
      tasks: [
        {
          Description: "",
          OwnerUser: d.currentUserId,
          RequestedByUser: null,
          Category: "" as const,
          Deadline: null,
          DeadlineBucket: "No deadline" as const,
          Priority: 3,
          ExpectedLoad: 3,
          WhyImportant: "",
          Status: "Inbox" as const,
          Visibility: "JUST ME" as const,
          DetailLevel: "FULL" as const,
          BlockerType: "" as const,
          ParkedThoughts: "",
          SupportRequested: [],
          ReminderPermission: "None" as const,
          LastReminder: null,
          AssignmentResponse: "" as const,
          Interesting: false,
          CreatedAt: new Date().toISOString(),
          CompletedAt: null,
          ...partial,
          TaskID: id,
        },
        ...d.tasks,
      ],
    }));
    return id;
  }, []);

  const addTasksFromDump = useCallback<Ctx["addTasksFromDump"]>(
    (text, asLines) => {
      const lines = asLines
        ? text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : [text.trim()].filter(Boolean);
      if (lines.length === 0) return 0;
      setDb((d) => ({
        ...d,
        dumps: [
          {
            DumpID: uid("dump"),
            User: d.currentUserId,
            Text: text,
            CreatedAt: new Date().toISOString(),
          },
          ...d.dumps,
        ],
        tasks: [
          ...lines.map((line) => ({
            TaskID: uid("t"),
            Title: line,
            Description: "",
            OwnerUser: d.currentUserId,
            RequestedByUser: null,
            Category: "" as const,
            Deadline: null,
            DeadlineBucket: "No deadline" as const,
            Priority: 3,
            ExpectedLoad: 3,
            WhyImportant: "",
            Status: "Inbox" as const,
            Visibility: "JUST ME" as const,
            DetailLevel: "FULL" as const,
            BlockerType: "" as const,
            ParkedThoughts: "",
            SupportRequested: [],
            ReminderPermission: "None" as const,
            LastReminder: null,
            AssignmentResponse: "" as const,
            Interesting: false,
            CreatedAt: new Date().toISOString(),
            CompletedAt: null,
          })),
          ...d.tasks,
        ],
      }));
      return lines.length;
    },
    [],
  );

  const updateTask = useCallback<Ctx["updateTask"]>((id, patch) => {
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.TaskID === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const completeTask = useCallback<Ctx["completeTask"]>((id) => {
    let awarded = 0;
    setDb((d) => {
      const task = d.tasks.find((t) => t.TaskID === id);
      if (!task || task.Status === "Done") return d;
      awarded = 1 + task.ExpectedLoad;
      return {
        ...d,
        tasks: d.tasks.map((t) =>
          t.TaskID === id
            ? {
                ...t,
                Status: "Done" as const,
                AssignmentResponse: t.RequestedByUser ? ("✅ Done" as const) : t.AssignmentResponse,
                CompletedAt: new Date().toISOString(),
              }
            : t,
        ),
        persimmons: [
          {
            EventID: uid("pe"),
            FromUser: null,
            ToUser: task.OwnerUser,
            Task: id,
            Amount: awarded,
            Reason: `Shipment completed: ${task.Title}`,
            Timestamp: new Date().toISOString(),
          },
          ...d.persimmons,
        ],
      };
    });
    return { persimmons: awarded };
  }, []);

  const addStep = useCallback<Ctx["addStep"]>((taskId, text) => {
    setDb((d) => ({
      ...d,
      steps: [
        ...d.steps,
        {
          StepID: uid("st"),
          Task: taskId,
          StepOrder: d.steps.filter((s) => s.Task === taskId).length + 1,
          StepText: text,
          IsDone: false,
        },
      ],
    }));
  }, []);

  const toggleStep = useCallback<Ctx["toggleStep"]>((stepId) => {
    setDb((d) => ({
      ...d,
      steps: d.steps.map((s) =>
        s.StepID === stepId ? { ...s, IsDone: !s.IsDone } : s,
      ),
    }));
  }, []);

  const checkIn = useCallback<Ctx["checkIn"]>((mood, loadValue, help) => {
    setDb((d) => ({
      ...d,
      users: d.users.map((u) =>
        u.UserID === d.currentUserId
          ? {
              ...u,
              CurrentMood: mood,
              CurrentLoad: loadValue,
              HelpNeeded: help,
              LastCheckIn: new Date().toISOString(),
            }
          : u,
      ),
    }));
  }, []);

  const sendPersimmon = useCallback<Ctx["sendPersimmon"]>(
    (toUser, reason, amount = 1, task = null) => {
      setDb((d) => ({
        ...d,
        persimmons: [
          {
            EventID: uid("pe"),
            FromUser: d.currentUserId,
            ToUser: toUser,
            Task: task,
            Amount: amount,
            Reason: reason,
            Timestamp: new Date().toISOString(),
          },
          {
            EventID: uid("pe"),
            FromUser: null,
            ToUser: d.currentUserId,
            Task: task,
            Amount: -amount,
            Reason: `Sent appreciation`,
            Timestamp: new Date().toISOString(),
          },
          ...d.persimmons,
        ],
      }));
    },
    [],
  );

  const buluPing = useCallback<Ctx["buluPing"]>((taskId) => {
    let result = { ok: false, message: "" };
    setDb((d) => {
      const task = d.tasks.find((t) => t.TaskID === taskId);
      if (!task) return d;
      if (task.ReminderPermission === "None") {
        result = { ok: false, message: "This package does not allow reminders." };
        return d;
      }
      if (balanceOf(d, d.currentUserId) < 1) {
        result = { ok: false, message: "You need 1 🍊 to send a Bulu ping." };
        return d;
      }
      const last = d.pings
        .filter((p) => p.Task === taskId)
        .sort((a, b) => b.Timestamp.localeCompare(a.Timestamp))[0];
      if (last && Date.now() - new Date(last.Timestamp).getTime() < 86400000) {
        result = {
          ok: false,
          message: "Bulu allows one paid ping per package per 24 hours.",
        };
        return d;
      }
      const from = d.users.find((u) => u.UserID === d.currentUserId)!;
      result = { ok: true, message: "Bulu announcement dispatched." };
      return {
        ...d,
        pings: [
          {
            PingID: uid("ping"),
            Task: taskId,
            FromUser: d.currentUserId,
            ToUser: task.OwnerUser,
            Message: `${from.DisplayName} is still waiting for the ${task.Title.toLowerCase()} shipment.`,
            Timestamp: new Date().toISOString(),
            Response: "",
          },
          ...d.pings,
        ],
        persimmons: [
          {
            EventID: uid("pe"),
            FromUser: null,
            ToUser: d.currentUserId,
            Task: taskId,
            Amount: -1,
            Reason: "Bulu ping",
            Timestamp: new Date().toISOString(),
          },
          ...d.persimmons,
        ],
        tasks: d.tasks.map((t) =>
          t.TaskID === taskId
            ? { ...t, LastReminder: new Date().toISOString() }
            : t,
        ),
      };
    });
    return result;
  }, []);

  const answerPing = useCallback<Ctx["answerPing"]>((pingId, response) => {
    setDb((d) => ({
      ...d,
      pings: d.pings.map((p) =>
        p.PingID === pingId ? { ...p, Response: response } : p,
      ),
    }));
  }, []);

  const requestSupport = useCallback<Ctx["requestSupport"]>((taskId, types) => {
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.TaskID === taskId ? { ...t, SupportRequested: types } : t,
      ),
      persimmons: types.length
        ? [
            {
              EventID: uid("pe"),
              FromUser: null,
              ToUser: d.currentUserId,
              Task: taskId,
              Amount: 1,
              Reason: "Asked for help — that is progress",
              Timestamp: new Date().toISOString(),
            },
            ...d.persimmons,
          ]
        : d.persimmons,
    }));
  }, []);

  const visibleTasksOf = useCallback<Ctx["visibleTasksOf"]>(
    (ownerId) =>
      db.tasks
        .filter((t) => t.OwnerUser === ownerId)
        .map((t) => viewTask(db, t, db.currentUserId))
        .filter((t): t is VisibleTask => t !== null),
    [db],
  );

  const peopleIShareWith = useCallback<Ctx["peopleIShareWith"]>(() => {
    return db.connections
      .filter((c) => c.Active && c.ViewerUser === db.currentUserId)
      .map((c) => {
        const user = db.users.find((u) => u.UserID === c.OwnerUser)!;
        const visible = db.tasks
          .filter((t) => t.OwnerUser === user.UserID)
          .map((t) => viewTask(db, t, db.currentUserId))
          .filter((t): t is VisibleTask => t !== null);
        const open = visible.filter((v) =>
          v.redacted ? v.Status !== "Done" : v.Status !== "Done",
        );
        return {
          user,
          label: c.RelationshipLabel,
          load: c.CanSeeLoad
            ? (user.CurrentLoad ?? calculatedLoad(db, user.UserID))
            : 0,
          active: open.length,
          urgent: open.filter(
            (v) =>
              !v.redacted &&
              v.Deadline &&
              new Date(v.Deadline).getTime() - Date.now() < 5 * 86400000,
          ).length,
          blocked: open.filter(
            (v) =>
              !v.redacted &&
              (v.Status === "Blocked" || v.Status === "Waiting for Someone"),
          ).length,
          hidden: open.filter((v) => v.redacted).length,
          canAssign: c.CanAssignTasks,
        };
      });
  }, [db]);

  const myTasks = useCallback(
    () => db.tasks.filter((t) => t.OwnerUser === db.currentUserId),
    [db],
  );

  const stepsOf = useCallback(
    (taskId: string) =>
      db.steps
        .filter((s) => s.Task === taskId)
        .sort((a, b) => a.StepOrder - b.StepOrder),
    [db],
  );

  const reset = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setDb(seedDB());
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      db,
      me,
      setCurrentUser,
      addTask,
      addTasksFromDump,
      updateTask,
      completeTask,
      addStep,
      toggleStep,
      stepsOf,
      checkIn,
      sendPersimmon,
      buluPing,
      answerPing,
      requestSupport,
      peopleIShareWith,
      visibleTasksOf,
      myTasks,
      reset,
    }),
    [
      db,
      me,
      setCurrentUser,
      addTask,
      addTasksFromDump,
      updateTask,
      completeTask,
      addStep,
      toggleStep,
      stepsOf,
      checkIn,
      sendPersimmon,
      buluPing,
      answerPing,
      requestSupport,
      peopleIShareWith,
      visibleTasksOf,
      myTasks,
      reset,
    ],
  );

  return <PFContext.Provider value={value}>{children}</PFContext.Provider>;
}

export function usePF() {
  const ctx = useContext(PFContext);
  if (!ctx) throw new Error("usePF must be used inside PFProvider");
  return ctx;
}

export function useCharacter(id: string) {
  const { db } = usePF();
  return db.characters.find((c) => c.CharacterID === id)!;
}
