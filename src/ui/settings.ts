import { getLocale, setLocale, t, type Locale } from "../i18n/i18n";
export function openSettings(sound:boolean, setSound:(value:boolean)=>void, changed:()=>void) {
 const dialog=document.createElement("dialog"); dialog.className="tutorial settings"; dialog.setAttribute("aria-labelledby","settings-title");
 const render=()=>{ dialog.replaceChildren(); const title=document.createElement("h2"); title.id="settings-title"; title.textContent=t("settings.title"); dialog.append(title);
  const group=(label:string, values:[string, string][], select:(v:string)=>void, current:string)=>{ const section=document.createElement("section"); const p=document.createElement("p"); p.textContent=label; section.append(p); values.forEach(([value,text])=>{const b=document.createElement("button");b.textContent=text;b.setAttribute("aria-pressed",`${value===current}`);b.onclick=()=>{select(value);render();changed();};section.append(b);}); dialog.append(section); };
  group(t("settings.language"),[["ko","한국어"],["en","English"]],v=>setLocale(v as Locale),getLocale());
  group(t("settings.sound"),[["on",t("settings.on")],["off",t("settings.off")]],v=>setSound(v==="on"),sound?"on":"off");
  const close=document.createElement("button");close.className="text-button";close.textContent=t("settings.close");close.onclick=()=>{dialog.close();dialog.remove();};dialog.append(close);
 }; dialog.addEventListener("cancel",e=>{e.preventDefault();dialog.close();dialog.remove();});document.body.append(dialog);render();dialog.showModal(); return dialog;
}
