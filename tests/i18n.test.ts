// @vitest-environment jsdom
import { expect, it } from "vitest";
import { localizeEvent, setLocale, t } from "../src/i18n/i18n";
it("switches UI translations without changing canonical events",()=>{ setLocale("ko"); expect(t("game.room",{code:"ABC234"})).toBe("ABC234번 방"); expect(localizeEvent("CHECK!")).toBe("체크!"); expect("CHECK!").toBe("CHECK!"); setLocale("en"); expect(t("game.room",{code:"ABC234"})).toBe("ROOM ABC234"); expect(localStorage.getItem("reversix-language")).toBe("en"); });
