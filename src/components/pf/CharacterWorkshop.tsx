import { useState } from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";
import { usePF } from "@/lib/pf/store";
import { useI18n } from "@/lib/pf/i18n";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CharacterAvatar } from "./Character";

export function CharacterWorkshop() {
  const { db, setCharacterImage } = usePF();
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  function loadFile(characterId: string, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("Please choose an image file.", "請選擇圖片檔案。"));
      return;
    }
    if (file.size > 800_000) {
      toast(
        t(
          "Please use an image smaller than 800 KB for this browser demo.",
          "此瀏覽器示範請使用小於 800 KB 的圖片。",
        ),
      );
      return;
    }
    setBusy(characterId);
    const reader = new FileReader();
    reader.onload = () => {
      setCharacterImage(characterId, String(reader.result));
      setBusy(null);
      toast(t("Drawing saved on this device.", "繪圖已儲存在此裝置。"));
    };
    reader.onerror = () => {
      setBusy(null);
      toast(t("That image could not be read.", "無法讀取該圖片。"));
    };
    reader.readAsDataURL(file);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="h-9 rounded-xl px-3">
          <Palette className="size-4" />
          <span className="sr-only">{t("Character Workshop", "角色工作室")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Character Workshop", "角色工作室")}</SheetTitle>
          <SheetDescription>
            {t(
              "Replace a character with your own drawing. It is saved only in this browser for the demo.",
              "以你的繪圖取代角色。示範版只會儲存在此瀏覽器。",
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-3">
          {db.characters.map((character) => (
            <article
              key={character.CharacterID}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border"
            >
              <CharacterAvatar id={character.CharacterID} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{character.DisplayName}</p>
                <p className="text-xs text-muted-foreground">
                  {character.Image
                    ? t("Custom drawing", "自訂繪圖")
                    : t("Default character", "預設角色")}
                </p>
                <div className="mt-2 flex gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">
                    {busy === character.CharacterID
                      ? t("Saving…", "儲存中…")
                      : t("Replace drawing", "更換繪圖")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={busy !== null}
                      onChange={(event) => loadFile(character.CharacterID, event.target.files?.[0])}
                    />
                  </label>
                  {character.Image ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCharacterImage(character.CharacterID, character.DefaultImage ?? null)
                      }
                    >
                      {t("Restore", "還原")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
