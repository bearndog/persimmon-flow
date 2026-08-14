import { usePF } from "./store";

export function useI18n() {
  const { db } = usePF();
  const zh = db.language === "zh-HK";
  return {
    language: db.language,
    zh,
    t: (english: string, chinese: string) => (zh ? chinese : english),
    date: (value: string) =>
      new Intl.DateTimeFormat(zh ? "zh-HK" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value)),
  };
}

export function moodLabel(mood: string, zh: boolean) {
  if (!zh) return mood;
  const labels: Record<string, string> = {
    "Neuna / overwhelmed": "Neuna－不知所措、過度刺激",
    "Teddi / exhausted": "Teddi－筋疲力盡、低能量",
    "Elster / focused": "Elster－專注、執行中",
    "Goldie / energetic": "Goldie－精力充沛、好奇",
    Fine: "Panda－平穩、顯示全部",
  };
  return labels[mood] ?? mood;
}

export function relativeTime(value: string, zh: boolean) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return zh ? "剛剛" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return zh ? `${minutes} 分鐘前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return zh ? `${hours} 小時前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return zh ? `${days} 日前` : `${days}d ago`;
}

export function uiLabel(value: string, zh: boolean) {
  if (!zh) return value;
  const labels: Record<string, string> = {
    Inbox: "收件區",
    Sorted: "已分類",
    "In Progress": "進行中",
    Blocked: "受阻",
    "Waiting for Someone": "等待他人",
    "Split into packages": "已拆成多個包裹",
    Done: "完成",
    Today: "今天",
    Soon: "即將",
    Later: "稍後",
    "No deadline": "沒有期限",
    Custom: "自訂",
    None: "不允許提醒",
    "One reminder": "一次提醒",
    "Every 3 days": "每三天一次",
    "📥 Received": "📥 已收到",
    "💤 Later / Low Capacity": "💤 稍後／能量不足",
    "❓ Need Clarification": "❓ 需要澄清",
    "🚫 Can't Take This": "🚫 無法接下",
    "▶️ In Progress": "▶️ 進行中",
    "✅ Done": "✅ 完成",
    pending: "等待回覆",
    received: "已收到",
    later: "稍後／能量不足",
    clarification_needed: "需要澄清",
    accepted: "已接受",
    rejected: "已拒絕",
    completed: "已完成",
    "Practical help": "實際協助",
    "Body doubling": "陪伴工作",
    Encouragement: "鼓勵",
    "Remind me": "提醒我",
    "Help me start": "幫我開始",
    "Just acknowledge me": "只需肯定我",
    "Give me space": "給我空間",
    "I don't know where to start": "我不知道從哪裡開始",
    "Too many steps": "步驟太多",
    "I need information": "我需要資料",
    "I'm afraid of doing it wrong": "我害怕做錯",
    "It's boring / I can't initiate": "太沉悶／無法開始",
    "I'm waiting for someone": "我正在等候別人",
    Other: "其他",
    "Work / Study": "工作／學習",
    Family: "家庭",
    Household: "家務",
    "Money / Admin": "金錢／行政",
    Health: "健康",
    Social: "社交",
    Errands: "雜務",
    "JUST ME": "只有我",
    "MY CONNECTIONS": "我的連結",
    "SELECTED PEOPLE": "指定人士",
    "LOAD ONLY": "只顯示負荷",
    FULL: "完整資料",
  };
  return labels[value] ?? value;
}
