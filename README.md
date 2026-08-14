# **Persimmon Flow**

Elster's Persimmon Factory

Build a **mobile-first shared task and communication app** called:

# Elster's Persimmon Factory

## 柿務總管工廠

This is an early functional prototype for approximately **3–6 trusted users**, primarily used on iPhones.

The prototype is designed to demonstrate a broader concept around:

- ADHD/executive-function support;

- brain dumping;

- making invisible/background workload visible;

- task prioritisation;

- breaking overwhelming tasks into small actions;

- reducing overthinking and procrastination;

- communicating why something matters to another person;

- seeing other people's capacity without invading their privacy;

- requesting practical help;

- appreciating effort and progress;

- playful character-based emotional/executive-function interfaces.

This is **not a therapy app** and should not make clinical claims.

The priority is:

> Make the simplest version that actually works.

Do not stop because a requested interaction is technically complex. Replace it with the simplest working approximation.

---

# 1. DESIGN

Create a mobile-first interface suitable for iPhone.

Style:

- clean;

- playful;

- low visual clutter;

- large touch targets;

- soft factory/logistics aesthetic;

- persimmon motifs;

- warm but not excessively childish;

- characters appear as functional guides.

Use **maximum four main navigation tabs**:

1. 🛬 Landing Patch

2. 🏭 Sorting Line

3. 📊 Factory Floor

4. 🍊 Harvest

Do not create separate tabs for individual characters.

---

# 2. CHARACTERS

Create a CHARACTERS collection/table.

Fields:

- CharacterID

- DisplayName

- EnglishName

- ChineseName

- Nickname

- Role

- Image

- ShortPrompt

Create these six characters.

## Bulu 紅耳布嚕

Role:

- control tower;

- reminders;

- announcements;

- noticing forgotten or unfinished things;

- checking task progress.

Typical message:

> "Control Tower: 4 unsorted packages are waiting."

---

## Teddi 喊包塔塔

Role:

- very-low-energy mode;

- shutdown;

- exhaustion;

- lying down / crying;

- helping users choose minimum viable actions without shame.

Typical message:

> "Minimum viable worker mode. One tiny thing is enough."

---

## Elster 伊斯特 (柿務總管)

Role:

- factory operations;

- execution;

- logistics;

- completion;

- persimmon economy;

- dry celebrations.

Typical message:

> "Shipment completed. Acceptable. Here is a persimmon."

---

## Neuna 連環九殺貓

Role:

- breaking down tasks;

- organisation;

- prioritisation;

- stopping spiralling;

- turning vague worries into concrete actions.

Typical message:

> "Are we actually solving the task, or wasting time thinking about the task?"

---

## Nuffel 攬枕狗

Role:

- actionable support;

- body doubling;

- practical help;

- encouragement;

- asking what kind of support would actually help.

Typical message:

> "What kind of support helps here?"

---

## Goldie 小今

Role:

- play;

- novelty;

- curiosity;

- enjoyable tasks;

- maintaining aliveness and interest.

Typical message:

> "Anything interesting hiding in the pile?"

---

# 3. CHARACTER VISUALS

For V1 use **one image per character**.

The app owner will upload the final character artwork later.

Every screen should reference the image stored in:

CHARACTERS → Image

Do not hard-code character images individually into many screens.

This way replacing one character image updates the character everywhere.

Do not generate character artwork automatically.

Do not require multiple moods/poses in V1.

---

# 4. DATABASE

Create these collections/tables:

## USERS

Fields:

- UserID

- Email

- DisplayName

- ProfileImage

- CurrentMood

- CurrentLoad

- HelpNeeded

- PersimmonBalance

- LastCheckIn

CurrentMood options:

- Neuna / overwhelmed

- Teddi / exhausted

- Elster / focused

- Goldie / energetic

- Fine

CurrentLoad:

1–5

---

## TASKS

Fields:

- TaskID

- Title

- Description

- OwnerUser

- RequestedByUser

- Category

- Deadline

- Priority

- ExpectedLoad

- WhyImportant

- Status

- Visibility

- DetailLevel

- ProgressPercent

- BlockerType

- ParkedThoughts

- SupportRequested

- ReminderPermission

- LastReminder

- CreatedAt

- CompletedAt

Category options:

- Work / Study

- Family

- Household

- Money / Admin

- Health

- Social

- Errands

- Other

Status options:

- Inbox

- Sorted

- In Progress

- Blocked

- Waiting for Someone

- Done

Priority:

1–5

ExpectedLoad:

1–5

---

## TASK\_STEPS

Fields:

- StepID

- Task

- StepOrder

- StepText

- IsDone

---

## CONNECTIONS

This is extremely important.

The app must NOT assume everyone belongs to one shared family/group.

Fields:

- ConnectionID

- OwnerUser

- ViewerUser

- RelationshipLabel

- CanSeeProfile

- CanSeeLoad

- CanAssignTasks

- Active

Connections must be selective.

Example:

User A can connect to:

- Mum

- Dad

- Partner

But:

- Mum must not automatically see Partner;

- Dad must not automatically see Partner;

- Partner must not automatically see Mum or Dad.

Users connected to the same person must **not become connected to each other automatically**.

There should be no public user directory.

---

## TASK\_ACCESS

If needed for privacy, create a separate TASK\_ACCESS collection.

Fields:

- AccessID

- Task

- ViewerUser

- DetailLevel

Use it when the owner selects specific people who may see a task.

---

## PERSIMMON\_EVENTS

Fields:

- EventID

- FromUser

- ToUser

- Task

- Amount

- Reason

- Timestamp

Persimmon balance should equal:

incoming persimmons\

minus\

spent persimmons.

---

## CHARACTERS

Use the fields and characters described above.

---

# 5. TAB 1 — LANDING PATCH

Purpose:

> Let ADHD brains dump everything before organising anything.

Display:

# What's flying around your brain?

Subtext:

> Dump it here. Organisation can happen later.

Provide:

- large multiline text box;

- "Dump it" button;

- "+ Add one package" button.

If technically easy, allow each line of the brain dump to become a separate task.

If this is difficult, simply save the dump and let users create tasks from it manually.

A task only needs a TITLE to exist.

Everything else is optional.

Optional fields:

- Category

- Deadline

- Who is it for?

- Expected load

- Why it matters

New tasks start with:

Status = Inbox

Show Bulu:

> "Control Tower: X unsorted packages are waiting."

Never use shame language.

---

# 6. TAB 2 — SORTING LINE

Show unsorted tasks one at a time as large cards.

For each task allow the user to set:

## WHO

Owner:

- Me

- connected user

Requested by:

- optional connected user

---

## WHEN

- Today

- Soon

- Later

- No deadline

- Custom date

---

## PRIORITY

1–5 (sliding scale button)

---

## EXPECTED LOAD

1–5 (sliding scale button)

This represents how expensive the task feels, not just objective time.

---

## WHY THIS MATTERS

Optional text:

> "Why does this matter to you?"

Examples:

> "It is only HK$300, but unresolved money makes me anxious."

or:

> "This task looks small, but switching tasks is difficult for me today."

This field is central to the app.

---

# 7. Have "NEUNA TOOL — BREAK THIS DOWN" as part of the option under each each task, that users can pick. If they tick it, then the details of the tool appears

Button:

# Ask Neuna to break this down

Do NOT require AI in V1.

Use a guided form.

Question 1:

> What's blocking you?

Options:

- I don't know where to start

- Too many steps

- I need information

- I'm afraid of doing it wrong

- It's boring / I can't initiate

- I'm waiting for someone

- Other

Question 2:

> What is the smallest physical action you could do in five minutes?

Allow the user to create 1–5 small Task Steps.

Show the first incomplete Task Step prominently on the task.

Example:

TASK:

> Deal with insurance

becomes:

1. Find policy number

2. Find phone number

3. Call

4. Upload document

---

# 8. Another "NEUNA TOOL — STOP SPIRALLING" for tasks to tick

Button:

# Neuna: Stop Spiralling

Show three fields:

## FACT

> What actually needs to happen?

## NEXT

> What can you physically do in five minutes?

## PARK

> What are you thinking about that does not need solving right now?

Save PARK as ParkedThoughts.

Do not automatically convert ParkedThoughts into new tasks.

Display:

> "Neuna has confiscated these thoughts for later."

---

# 9. another option for tasks to tick "NUFFEL SUPPORT REQUEST"

Button:

# Ask Nuffel for support

Options:

- Practical help

- Body doubling

- Encouragement

- Remind me

- Help me start

- Just acknowledge me

- Give me space

Save to:

SupportRequested

If another connected user is allowed to help with this task, allow them to see the requested support type.

---

# 10. another option for tasks to tick "BULU REMINDERS"

Each task can set ReminderPermission:

- None

- One reminder

- Every 3 days

For V1, reminders can appear **inside the app**.

Do not require native push notifications.

Display Bulu reminder cards such as:

> "Control Tower: this package has been sitting here for three days."

---

# 11. TAB 3 — FACTORY FLOOR

Create two views:

# MY FACTORY

Show the user's own tasks.

Filters:

- Today

- Urgent

- High priority

- Low-load / quick tasks

- Blocked

- Waiting for Someone

- Category

- Deadline

- Status

Tasks with subtasks show progress.

ProgressPercent:

completed task steps / total task steps.

If no task steps exist, use task Status.

---

# 12. FACTORY FLOOR — FAMILY / CONNECTION VIEW

Call this:

# People I Share With

Only show users who have an explicit active Connection.

For each visible person display:

- Name

- Current Load 1–5

- Active task count

- Urgent task count

- Blocked task count

- Hidden background task count

Example:

# MIKE

Current Load: 🔴 5/5

Active shipments: 8\

Urgent: 2\

Blocked: 1\

Hidden background work: 3

The purpose is:

> Make invisible workload visible without requiring disclosure of private details.

---

# 13. SELECTIVE PRIVACY

Every task must have:

## Visibility

Options:

### JUST ME

Only owner can access the task.

### MY CONNECTIONS

Only explicitly authorized connections may access it.

### SELECTED PEOPLE

Owner manually chooses connected users.

---

## DetailLevel

Options:

### FULL

Authorized viewer sees:

- task title

- WhyImportant

- workload

- progress

- deadline

- status

### LOAD ONLY

Viewer sees only:

> Private background task

plus:

- workload;

- optionally progress/status.

Viewer must NOT see:

- task title;

- description;

- requester;

- private notes;

- other viewers;

- relationship source.

Example:

If Partner assigns User a private task:

Parents may see:

> "Private background task — load 4"

They must NOT be able to determine:

- Partner exists;

- Partner assigned it;

- what the task is.

---

# 14. PRIVACY MUST BE REAL

Do not merely hide components visually.

Unauthorized users must not be able to retrieve private records.

Restrict access to:

- private tasks;

- partner identities;

- hidden connection records;

- requester identity;

- task descriptions;

- private notes.

The most important privacy acceptance test is:

User A connects with Mum, Dad and Partner.

User A sees all three.

Mum sees User A.

Partner sees User A.

Mum cannot discover Partner through:

- profiles;

- connections;

- tasks;

- requester fields;

- hidden task metadata.

Partner cannot discover Mum or Dad unless explicitly connected.

---

# 15. TASKS ASSIGNED TO ANOTHER PERSON

A connected user may assign a task if:

CanAssignTasks = true.

The request should contain:

- Task

- Why this matters to requester

- Expected load

- Deadline

- Reminder permission

Recipient can respond:

- 📥 Received

- 💤 Later / Low Capacity

- ❓ Need Clarification

- 🚫 Can't Take This

- ▶️ In Progress

- ✅ Done

Requester should be able to see this status without repeatedly asking the recipient.

---

# 16. BULU CHECK-IN

At the top of Factory Floor periodically show:

# How is the factory running?

Mood choices on sliding scales

## Neuna

Overwhelmed, overstimulated

## Teddi

Exhausted, shutdown

## Elster

Focused, stop talking, doing things

## Goldie

Energetic, playful, novelty-seeking

## Fine

Normal

Also ask:

> Current Load: 1–5 (sliding scale)

and:

> Need help? Yes / No

---

# 17. ADAPT VIEW TO MOOD

These should be suggestions, never restrictions.

## NEUNA MODE

Show prominently:

- urgent tasks;

- lowest-load actions;

- first next steps.

Hide unnecessary clutter.

Message:

> "Too much input. Let's reduce the field."

---

## TEDDI MODE

Show one tiny achievable task.

Show Nuffel support prominently.

Message:

> "Minimum viable worker mode. One tiny action is enough."

---

## ELSTER MODE

Show compact productivity dashboard sorted by:

- priority;

- deadline.

Message:

> "Factory operational."

---

## GOLDIE MODE

Include:

- interesting tasks;

- optional tasks;

- enjoyable tasks;

- novelty.

Message:

> "Use the energy while it exists."

---

# 18. WORKLOAD

Current Load must have two forms:

## Calculated load

Estimate based on:

- unfinished tasks;

- ExpectedLoad;

- urgent deadlines;

- blocked tasks.

Display as a simple 1–5 result.

## Self-reported load

Users can override the calculated score.

Subjective capacity matters more than pure task count.

Example:

Someone may have three tasks and still report:

5/5 overloaded.

---

# 19. TAB 4 — HARVEST

When a task is completed, show a celebration.

Display Elster.

Example:

> "Shipment completed. Acceptable."

Award persimmons.

Do not reward only completion.

Persimmons can be earned for:

- completing tasks;

- completing difficult subtasks;

- starting something avoided;

- accurately marking a blocker;

- asking for help;

- updating another person honestly;

- helping somebody;

- acknowledging somebody else's work.

The purpose is:

> Reward executive-function progress and communication, not moral worth.

---

# 20. PERSIMMON REWARD

Simple completion formula:

Base completion = 1 🍊

Plus ExpectedLoad:

1–5 🍊

Maximum task-completion reward:

6 🍊

Allow manual appreciation:

# Send 🍊

A connected user may send another user one appreciation persimmon.

Examples:

> "I noticed how much work that took."

> "One thing off your plate."

---

# 21. BABY BEAR PING / BULU PING

A requester may spend:

1 🍊

to create one Bulu in-app reminder for the task owner.

Only allow this if:

ReminderPermission permits reminders.

Limit:

maximum one paid ping per task every 24 hours.

Do not allow repeated harassment.

Example:

> 🎙 Bulu announcement:\

> "Mum is still waiting for the insurance shipment."

Buttons:

- 📥 Got it

- 💤 Later

---

# 22. STARTER DEMO USERS

Create demo accounts/data for:

- Me

- Mum

- Dad

- Partner

Create Connections so:

Me → Mum\

Me → Dad\

Me → Partner

But Mum and Dad have NO connection to Partner.

Partner has NO connection to Mum or Dad.

---

# 23. STARTER DEMO SCENARIO

Dad requests:

# Recover HK$300 reimbursement

WhyImportant:

> "I dislike unresolved money and want loose financial matters closed."

ExpectedLoad:

2

Meanwhile Me has:

- Thesis deadline — Load 5

- Application paperwork — Load 4

- Private background task — Load 4

- Buy toothpaste — Load 1

- HK$300 reimbursement — Load 2

Show:

> Me: Current Load 5/5

Dad should be able to see that the user's workload is very high.

The app should demonstrate:

Dad's HK$300 request can genuinely matter to him.

AND

the recipient can simultaneously be overloaded by larger background work.

Do not label either perspective wrong.

This is a core communication principle of the app.

---

# 24. CORE PRODUCT PRINCIPLES

The app should repeatedly reinforce:

## A task can be small but important.

## A person can care about your task and still have low capacity.

## Invisible work still counts.

## Acknowledgement is different from completion.

## "Received" is different from "I can do it now."

## Asking for help is progress.

## Updating a blocker is progress.

## Privacy does not mean workload becomes invisible.

## People connected to the same user do not automatically gain access to each other.

---

# 25. DO NOT BUILD IN V1

Do NOT add:

- public social profiles;

- social feed;

- family chat;

- complex AI;

- automatic therapy;

- diagnostic features;

- advanced NLP;

- automatic interpretation of brain-dump text;

- elaborate character animation;

- multiple character poses;

- complex games;

- marketplaces;

- payments;

- public user search;

- complicated analytics;

- native push notifications.

Use simple forms, buttons, databases, filters and conditional displays.

---

# 26. V1 SUCCESS CRITERIA

The prototype is successful if a user can complete this flow:

### 1.

Brain dump:

> "Thesis\

> Email professor\

> Dad reimbursement\

> Buy toothpaste"

### 2.

Convert these into packages/tasks.

### 3.

Use Neuna to break one difficult task into small steps.

### 4.

Mark why Dad's reimbursement matters to Dad.

### 5.

Assign tasks and display progress.

### 6.

Show that the user has heavy invisible workload.

### 7.

Allow Dad to see:

> "Current load: 5/5"

without seeing private task details.

### 8.

Allow Partner to see only information explicitly shared with Partner.

### 9.

Prevent Mum/Dad from discovering Partner through the app.

### 10.

Request Nuffel support.

### 11.

Use mood check-in to simplify the task display.

### 12.

Finish one package.

### 13.

Receive an Elster celebration and persimmons.

### 14.

Allow another connected user to send an appreciation persimmon.

If these functions work, V1 is complete.

Do not add more features before these flows work reliably.

---

# 27. FINAL BUILD INSTRUCTION

Build the **simplest functional implementation** of everything above.

If any interaction is too technically complicated:

1. preserve the underlying purpose;

2. implement the simplest version available in Adalo;

3. continue building;

4. do not add unnecessary complexity;

5. do not stop the entire build because one feature cannot be automated.

Optimize for:

> functional prototype > perfect technology.

The finished prototype should make this idea immediately understandable:

> Panda's Persimmon Factory helps people externalize their workload, turn executive-function chaos into actionable steps, understand why other people's priorities matter, see invisible workload without invading privacy, and appreciate progress through a shared playful character system.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://persimmon-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8057a438-8454-4adb-9be7-5174f84c2531).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
