export type Language = "en" | "zh-HK";

export type Mood =
  "Neuna / overwhelmed" | "Teddi / exhausted" | "Elster / focused" | "Goldie / energetic" | "Fine";

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
  | "Split into packages"
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

export type AssignmentState =
  "pending" | "received" | "later" | "clarification_needed" | "accepted" | "rejected" | "completed";

export type NotificationType =
  | "task_assigned"
  | "assignment_response"
  | "clarification"
  | "support_requested"
  | "support_response"
  | "mood_check_in"
  | "task_completed"
  | "reminder"
  | "reminder_response"
  | "appreciation"
  | "announcement";

export interface User {
  UserID: string;
  Email: string;
  DisplayName: string;
  ProfileImage: string | null;
  CurrentMood: Mood;
  CurrentLoad: number | null;
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
  CategoryID: string | null;
  ProjectID: string | null;
  ParentTaskID: string | null;
  Deadline: string | null;
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

export interface Project {
  ProjectID: string;
  OwnerUser: string;
  Name: string;
  Colour: string;
  ArchivedAt: string | null;
}

export interface CategoryRow {
  CategoryID: string;
  OwnerUser: string;
  ProjectID: string | null;
  Name: string;
  ArchivedAt: string | null;
}

export interface AssignmentRequest {
  AssignmentID: string;
  TaskID: string;
  RequesterUser: string;
  RecipientUser: string;
  WhyImportant: string;
  ExpectedLoad: number;
  Deadline: string | null;
  ReminderPermission: ReminderPermission;
  State: AssignmentState;
  LastMessage: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface SupportRequest {
  SupportRequestID: string;
  TaskID: string;
  RequesterUser: string;
  HelperUser: string | null;
  Type: SupportType;
  Details: string;
  SuggestedTime: string | null;
  Status: "open" | "accepted" | "resolved";
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ActivityNotification {
  NotificationID: string;
  ActorUser: string | null;
  RecipientUser: string;
  Type: NotificationType;
  TaskID: string | null;
  AssignmentID: string | null;
  SupportRequestID: string | null;
  Message: string;
  CreatedAt: string;
  ReadAt: string | null;
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
  DefaultImage?: string | null;
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
  Kind: "holding" | "converted";
  ResultTaskIDs: string[];
  CreatedAt: string;
  UpdatedAt: string;
  ArchivedAt: string | null;
}

export interface DB {
  schemaVersion: 2;
  language: Language;
  users: User[];
  tasks: Task[];
  steps: TaskStep[];
  projects: Project[];
  categories: CategoryRow[];
  assignments: AssignmentRequest[];
  supportRequests: SupportRequest[];
  notifications: ActivityNotification[];
  connections: Connection[];
  access: TaskAccess[];
  persimmons: PersimmonEvent[];
  characters: CharacterRow[];
  pings: Ping[];
  dumps: BrainDump[];
  currentUserId: string;
}

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
