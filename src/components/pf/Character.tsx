import { usePF } from "@/lib/pf/store";
import { cn } from "@/lib/utils";

const FALLBACK: Record<string, string> = {
  riedan: "🐦",
  falco: "🧸",
  elster: "🐼",
  tottie: "🐈‍⬛",
  dulcie: "🐕",
  goldie: "🐤",
};

export function characterName(
  character: { CharacterID: string; EnglishName: string; ChineseName: string } | undefined,
  zh: boolean,
) {
  if (!character) return "";
  if (!zh) return character.EnglishName;
  if (character.CharacterID === "elster") return `${character.ChineseName}（柿務總管）`;
  if (character.CharacterID === "tottie") return `${character.ChineseName}（連環九殺貓）`;
  return character.ChineseName;
}

/** Single source of character artwork: CHARACTERS -> Image. */
export function CharacterAvatar({
  id,
  size = "md",
  className,
}: {
  id: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { db } = usePF();
  const char = db.characters.find((c) => c.CharacterID === id);
  if (db.layoutMode === "simple") return null;
  const dims =
    size === "sm" ? "size-10 text-lg" : size === "lg" ? "size-24 text-4xl" : "size-16 text-2xl";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-secondary ring-1 ring-border overflow-hidden",
        dims,
        className,
      )}
      aria-hidden
    >
      {char?.Image ? (
        <img src={char.Image} alt="" className="size-full object-cover" />
      ) : (
        <span>{FALLBACK[id] ?? "🍊"}</span>
      )}
    </div>
  );
}

export function CharacterSays({
  id,
  children,
  tone = "default",
}: {
  id: string;
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  const { db } = usePF();
  const char = db.characters.find((c) => c.CharacterID === id);
  const zh = db.language === "zh-HK";
  if (db.layoutMode === "simple") {
    return <div className="rounded-2xl border bg-card p-3 text-sm leading-relaxed">{children}</div>;
  }
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-3xl p-4 ring-1",
        tone === "accent" ? "bg-accent ring-accent-foreground/10" : "bg-card ring-border",
      )}
    >
      <CharacterAvatar id={id} size="lg" />
      <div className="min-w-0 pt-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          {characterName(char, zh)}
        </p>
        <div className="mt-1 text-sm leading-relaxed text-foreground">{children}</div>
      </div>
    </div>
  );
}
