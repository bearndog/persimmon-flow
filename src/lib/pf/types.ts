export type Mood =
  | "Neuna / overwhelmed"
  | "Teddi / exhausted"
  | "Elster / focused"
  | "Goldie / energetic"
  | "Fine";

export type Category =
  | "Work / Study"
  | "Family"
  | "Household"
  | "Money / Admin"
  | "Health"
  | "Social"
  | "Errands"
  | "Other";

export type Status =
  | "Inbox"
  | "Sorted"
  | "In Progress"
  | "Blocked"
  | "Waiting for Someone"
  | "Done";

export type Visibility = "JUST ME" | "MY CONNECTIONS" | "SELECTED PEOPLE";
export type DetailLevel = "FULL" | "LOAD ONLY";

export type ReminderPermission = "None" | "One reminder" | "Every 3 days";

export type SupportType =
  | "Practical help"
  | "Body doubling"
  | "Encouragement"
  | "Remind me"
  | "Help me start"
  | "Just acknowledge me"
  | "Give me space";

export type BlockerType =
  | "I don't know where to start"
  | "Too many steps"
  | "I need information"
  | "I'm afraid of doing it wrong"
  | "It's boring / I can't initiate"
  | "I'm waiting for someone"
  | "Other"
  | "";

export type AssignmentResponse =
  | "📥 Received"
  | "💤 Later / Low Capacity"
  | "❓ Need Clarification"
  | "🚫 Can't Take This"
  | "▶️ In Progress"
  | "✅ Done"
  | "";

export interface User {
  UserID: string;
  Email: string;
  DisplayName: string;
  ProfileImage: string | null;
  CurrentMood: Mood;
  CurrentLoad: number | null; // self reported, null = use calculated
  HelpNeeded: boolean;
  LastCheckIn: string | null;
}

export interface Task {
  TaskID: string;
  Title: string;
  Description: string;
  OwnerUser: string;
  RequestedByUser: string | null;
  Category: Category | "";
  Deadline: string | null; // ISO date
  DeadlineBucket: "Today" | "Soon" | "Later" | "No deadline" | "Custom";
  Priority: number;
  ExpectedLoad: number;
  WhyImportant: string;
  Status: Status;
  Visibility: Visibility;
  DetailLevel: DetailLevel;
  BlockerType: BlockerType;
  ParkedThoughts: string;
  SupportRequested: SupportType[];
  ReminderPermission: ReminderPermission;
  LastReminder: string | null;
  AssignmentResponse: AssignmentResponse;
  Interesting: boolean;
  CreatedAt: string;
  CompletedAt: string | null;
}

export interface TaskStep {
  StepID: string;
  Task: string;
  StepOrder: number;
  StepText: string;
  IsDone: boolean;
}

export interface Connection {
  ConnectionID: string;
  OwnerUser: string;
  ViewerUser: string;
  RelationshipLabel: string;
  CanSeeProfile: boolean;
  CanSeeLoad: boolean;
  CanAssignTasks: boolean;
  Active: boolean;
}

export interface TaskAccess {
  AccessID: string;
  Task: string;
  ViewerUser: string;
  DetailLevel: DetailLevel;
}

export interface PersimmonEvent {
  EventID: string;
  FromUser: string | null;
  ToUser: string;
  Task: string | null;
  Amount: number;
  Reason: string;
  Timestamp: string;
}

export interface CharacterRow {
  CharacterID: string;
  DisplayName: string;
  EnglishName: string;
  ChineseName: string;
  Nickname: string;
  Role: string;
  Image: string | null;
  ShortPrompt: string;
}

export interface Ping {
  PingID: string;
  Task: string;
  FromUser: string;
  ToUser: string;
  Message: string;
  Timestamp: string;
  Response: "" | "📥 Got it" | "💤 Later";
}

export interface BrainDump {
  DumpID: string;
  User: string;
  Text: string;
  CreatedAt: string;
}

export interface DB {
  users: User[];
  tasks: Task[];
  steps: TaskStep[];
  connections: Connection[];
  access: TaskAccess[];
  persimmons: PersimmonEvent[];
  characters: CharacterRow[];
  pings: Ping[];
  dumps: BrainDump[];
  currentUserId: string;
}

/** What a viewer is actually allowed to receive about a task. */
export type VisibleTask =
  | {
      redacted: false;
      TaskID: string;
      OwnerUser: string;
      Title: string;
      WhyImportant: string;
      ExpectedLoad: number;
      Priority: number;
      Progress: number;
      Status: Status;
      Deadline: string | null;
      Category: Category | "";
      SupportRequested: SupportType[];
      RequestedByUser: string | null;
      AssignmentResponse: AssignmentResponse;
    }
  | {
      redacted: true;
      TaskID: string;
      OwnerUser: string;
      Title: "Private background task";
      ExpectedLoad: number;
      Progress: number;
      Status: "Active" | "Done";
    };
