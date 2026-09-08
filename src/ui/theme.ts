export type Theme = "light" | "dark";
export const THEME_KEY = "reversix-theme";
const QUERY = "(prefers-color-scheme: dark)";

function storedTheme():Theme|undefined{
  try{const value=localStorage.getItem(THEME_KEY);return value==="light"||value==="dark"?value:undefined}catch{return undefined}
}
export function hasThemeOverride(){return Boolean(storedTheme())}
export function getTheme():Theme{return storedTheme()??(window.matchMedia?.(QUERY).matches?"dark":"light")}
export function applyTheme(theme:Theme){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}
export function setTheme(theme:Theme){try{localStorage.setItem(THEME_KEY,theme)}catch{}applyTheme(theme)}
export function watchSystemTheme(){
  const media=window.matchMedia?.(QUERY);applyTheme(getTheme());
  if(!media)return()=>{};
  const changed=(event:MediaQueryListEvent)=>{if(!hasThemeOverride())applyTheme(event.matches?"dark":"light")};
  media.addEventListener?.("change",changed);
  return()=>media.removeEventListener?.("change",changed);
}
