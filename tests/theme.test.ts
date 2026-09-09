// @vitest-environment jsdom
import { beforeEach,expect,it,vi } from "vitest";
import { setLocale } from "../src/i18n/i18n";
import { openSettings } from "../src/ui/settings";
import { applyTheme,getTheme,hasThemeOverride,setTheme,THEME_KEY,watchSystemTheme,type Theme } from "../src/ui/theme";
import { applyCheckRingSetting,CHECK_RING_KEY,getCheckRingEnabled,setCheckRingEnabled } from "../src/ui/checkRing";

let systemDark=false,systemListener:(event:MediaQueryListEvent)=>void=()=>{};
beforeEach(()=>{
  localStorage.clear();document.documentElement.removeAttribute("data-theme");document.documentElement.style.colorScheme="";setLocale("en");
  Object.defineProperty(window,"matchMedia",{configurable:true,value:vi.fn(()=>({matches:systemDark,media:"(prefers-color-scheme: dark)",addEventListener:(_:string,listener:(event:MediaQueryListEvent)=>void)=>{systemListener=listener},removeEventListener:vi.fn()}))});
  HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};systemDark=false;
});

it("uses the system theme until the user stores an override",()=>{
  systemDark=true;expect(getTheme()).toBe("dark");const stop=watchSystemTheme();expect(document.documentElement.dataset.theme).toBe("dark");
  systemDark=false;systemListener({matches:false} as MediaQueryListEvent);expect(document.documentElement.dataset.theme).toBe("light");
  setTheme("dark");expect(localStorage.getItem(THEME_KEY)).toBe("dark");expect(hasThemeOverride()).toBe(true);
  systemListener({matches:false} as MediaQueryListEvent);expect(document.documentElement.dataset.theme).toBe("dark");expect(getTheme()).toBe("dark");stop();
});

it("updates theme, sound, check ring, and BGM selected states from live getters",()=>{
  let sound=false,checkRing=true,bgm=true,theme:Theme="light";const changed=vi.fn();applyTheme(theme);
  const dialog=openSettings({getSound:()=>sound,setSound:value=>{sound=value},getTheme:()=>theme,setTheme:value=>{theme=value;applyTheme(value)},getCheckRing:()=>checkRing,setCheckRing:value=>{checkRing=value;setCheckRingEnabled(value)},getBgm:()=>bgm,setBgm:value=>{bgm=value},changed});
  const button=(value:string)=>dialog.querySelector<HTMLButtonElement>(`button[data-value="${value}"]`)!;
  expect(button("off").getAttribute("aria-pressed")).toBe("true");button("on").click();
  expect(sound).toBe(true);expect(button("on").getAttribute("aria-pressed")).toBe("true");expect(button("off").getAttribute("aria-pressed")).toBe("false");
  button("dark").click();expect(theme).toBe("dark");expect(document.documentElement.dataset.theme).toBe("dark");expect(button("dark").getAttribute("aria-pressed")).toBe("true");expect(button("light").getAttribute("aria-pressed")).toBe("false");
  button("off").click();expect(sound).toBe(false);expect(button("off").getAttribute("aria-pressed")).toBe("true");expect(changed).toHaveBeenCalledTimes(3);
  const checkRingSection=[...dialog.querySelectorAll<HTMLElement>(".settings-group")].find(section=>section.querySelector(".settings-label")?.textContent==="CHECK RING")!;
  checkRingSection.querySelector<HTMLButtonElement>('button[data-value="off"]')!.click();
  expect(checkRing).toBe(false);expect(document.documentElement.dataset.checkRing).toBe("off");expect(localStorage.getItem(CHECK_RING_KEY)).toBe("false");
  const bgmSection=[...dialog.querySelectorAll<HTMLElement>(".settings-group")].find(section=>section.querySelector(".settings-label")?.textContent==="BGM")!;
  bgmSection.querySelector<HTMLButtonElement>('button[data-value="off"]')!.click();
  expect(bgm).toBe(false);expect([...dialog.querySelectorAll<HTMLElement>(".settings-group")].find(section=>section.querySelector(".settings-label")?.textContent==="BGM")!.querySelector<HTMLButtonElement>('button[data-value="off"]')?.getAttribute("aria-pressed")).toBe("true");
});

it("defaults the check ring to on and restores the saved setting",()=>{
  expect(getCheckRingEnabled()).toBe(true);applyCheckRingSetting();expect(document.documentElement.dataset.checkRing).toBe("on");
  setCheckRingEnabled(false);expect(getCheckRingEnabled()).toBe(false);applyCheckRingSetting();expect(document.documentElement.dataset.checkRing).toBe("off");
});
