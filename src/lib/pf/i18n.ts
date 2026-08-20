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
  const labels: Record<string, [string, string]> = {
    "Neuna / overwhelmed": ["Falco — carrying pain or overwhelmed", "隼隼－感到難受或負荷過重"],
    "Teddi / exhausted": ["Dulcie — needs comfort or low energy", "朵詩－需要安慰或能量偏低"],
    "Elster / focused": ["Elster — quietly focused", "依斯特－安靜專注"],
    "Goldie / energetic": ["Goldie — playful and curious", "小今－想玩、想探索"],
    "Tottie / boundaries": ["Tottie — needs clearer boundaries", "托蒂－需要理清界線"],
    Fine: ["Riedan — steady and connected", "阿笛－狀態平穩、想與人連結"],
  };
  return labels[mood]?.[zh ? 1 : 0] ?? mood;
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
    Inbox: "待整理",
    Sorted: "已整理",
    "In Progress": "進行中",
    Blocked: "受阻",
    "Waiting for Someone": "等待他人",
    "Split into packages": "已拆成多個包裹",
    Done: "完成",
    Today: "今天",
    Soon: "短期內",
    Later: "稍後",
    "No deadline": "不設限期",
    Custom: "自訂",
    None: "不設提醒",
    "One reminder": "只提醒一次",
    "Every 3 days": "每 3 天提醒一次",
    "📥 Received": "📥 已收到",
    "💤 Later / Low Capacity": "💤 稍後／能量不足",
    "❓ Need Clarification": "❓ 需要澄清",
    "🚫 Can't Take This": "🚫 未能接手",
    "▶️ In Progress": "▶️ 進行中",
    "✅ Done": "✅ 完成",
    pending: "等待回覆",
    received: "已收到",
    later: "稍後／能量不足",
    clarification_needed: "需要澄清",
    accepted: "已接受",
    rejected: "已拒絕",
    completed: "已完成",
    open: "等待回覆",
    resolved: "已解決",
    "Practical help": "實際協助",
    "Body doubling": "陪伴開工",
    Encouragement: "鼓勵",
    "Remind me": "提醒我",
    "Help me start": "幫我開始",
    "Just acknowledge me": "回應我一下就好",
    "Give me space": "讓我靜一靜",
    "I don't know where to start": "我不知道怎樣開始",
    "Too many steps": "步驟太多",
    "I need information": "我需要資料",
    "I'm afraid of doing it wrong": "我害怕做錯",
    "It's boring / I can't initiate": "太沉悶／提不起勁開始",
    "I'm waiting for someone": "我要等別人回覆或行動",
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
