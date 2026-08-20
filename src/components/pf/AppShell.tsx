import { Link } from "@tanstack/react-router";
import { usePF, balanceOf } from "@/lib/pf/store";
import { useI18n } from "@/lib/pf/i18n";
import { BuluInbox } from "./BuluInbox";
import { CharacterWorkshop } from "./CharacterWorkshop";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { db, me, setCurrentUser, setLanguage, setLayoutMode } = usePF();
  const { t } = useI18n();
  const balance = balanceOf(db, me.UserID);
  const tabs = [
    { to: "/", label: t("Landing Patch", "卸貨區"), icon: "🛬" },
    { to: "/sorting", label: t("Sorting Line", "整理區"), icon: "📦" },
    { to: "/floor", label: t("Warehouse Floor", "工作區"), icon: "📋" },
    { to: "/harvest", label: t("Harvest", "收成區"), icon: "🍊" },
  ] as const;

  return (
    <div className="paper min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold leading-tight">
                Elster's Persimmon Warehouse
              </h1>
              <p className="text-xs text-muted-foreground">依斯特的柿子倉庫</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground">
                🍊 {balance}
              </span>
              <BuluInbox />
              <CharacterWorkshop />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("Demo: view as", "示範：切換用戶")}
            </span>
            <Select value={me.UserID} onValueChange={setCurrentUser}>
              <SelectTrigger className="h-9 flex-1 rounded-xl bg-card text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {db.users.map((u) => (
                  <SelectItem key={u.UserID} value={u.UserID}>
                    {u.DisplayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl px-2 text-xs"
              onClick={() => setLanguage(db.language === "en" ? "zh-HK" : "en")}
            >
              {db.language === "en" ? "繁中" : "EN"}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full rounded-xl text-xs"
            onClick={() => setLayoutMode(db.layoutMode === "character" ? "simple" : "character")}
          >
            {db.layoutMode === "character"
              ? t("Switch to simple word-only view", "切換至純文字簡潔模式")
              : t("Switch to character view", "切換至角色模式")}
          </Button>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <ul className="grid grid-cols-4">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  activeOptions={{ exact: tab.to === "/" }}
                  activeProps={{
                    className: "text-primary bg-secondary/70",
                  }}
                  inactiveProps={{ className: "text-muted-foreground" }}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold"
                >
                  <span className="text-xl leading-none">{tab.icon}</span>
                  <span className="text-center leading-tight">{tab.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
