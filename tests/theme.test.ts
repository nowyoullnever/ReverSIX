// @vitest-environment jsdom
import { beforeEach,expect,it,vi } from "vitest";
import { setLocale } from "../src/i18n/i18n";
import { openSettings } from "../src/ui/settings";
import { applyTheme,getTheme,hasThemeOverride,setTheme,THEME_KEY,watchSystemTheme,type Theme } from "../src/ui/theme";

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

it("updates theme and sound selected states immediately from live getters",()=>{
  let sound=false,theme:Theme="light";const changed=vi.fn();applyTheme(theme);
  const dialog=openSettings({getSound:()=>sound,setSound:value=>{sound=value},getTheme:()=>theme,setTheme:value=>{theme=value;applyTheme(value)},changed});
  const button=(value:string)=>dialog.querySelector<HTMLButtonElement>(`button[data-value="${value}"]`)!;
  expect(button("off").getAttribute("aria-pressed")).toBe("true");button("on").click();
  expect(sound).toBe(true);expect(button("on").getAttribute("aria-pressed")).toBe("true");expect(button("off").getAttribute("aria-pressed")).toBe("false");
  button("dark").click();expect(theme).toBe("dark");expect(document.documentElement.dataset.theme).toBe("dark");expect(button("dark").getAttribute("aria-pressed")).toBe("true");expect(button("light").getAttribute("aria-pressed")).toBe("false");
  button("off").click();expect(sound).toBe(false);expect(button("off").getAttribute("aria-pressed")).toBe("true");expect(changed).toHaveBeenCalledTimes(3);
});
