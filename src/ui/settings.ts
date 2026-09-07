import { getLocale, setLocale, t, type Locale } from "../i18n/i18n";
export function openSettings(sound:boolean, setSound:(value:boolean)=>void, changed:()=>void) {
 const dialog=document.createElement("dialog"); dialog.className="tutorial settings"; dialog.setAttribute("aria-labelledby","settings-title");
 const close=()=>{dialog.close();dialog.remove();};
 const render=()=>{ dialog.replaceChildren(); const closeButton=document.createElement("button");closeButton.className="settings-close";closeButton.textContent="×";closeButton.setAttribute("aria-label",getLocale()==="ko"?"설정 닫기":"Close settings");closeButton.onclick=close;dialog.append(closeButton); const title=document.createElement("h2"); title.id="settings-title"; title.textContent=t("settings.title"); dialog.append(title); const content=document.createElement("div");content.className="settings-content";
  const group=(label:string, values:[string, string][], select:(v:string)=>void, current:string)=>{ const section=document.createElement("section");section.className="settings-group"; const p=document.createElement("p");p.className="settings-label"; p.textContent=label; section.append(p);const options=document.createElement("div");options.className="settings-options"; values.forEach(([value,text])=>{const b=document.createElement("button");b.textContent=text;b.setAttribute("aria-pressed",`${value===current}`);b.onclick=()=>{select(value);render();changed();};options.append(b);});section.append(options); content.append(section); };
  group(t("settings.language"),[["ko","한국어"],["en","English"]],v=>setLocale(v as Locale),getLocale());
  group(t("settings.sound"),[["on",t("settings.on")],["off",t("settings.off")]],v=>setSound(v==="on"),sound?"on":"off");
  dialog.append(content);
 }; dialog.addEventListener("cancel",e=>{e.preventDefault();close();});document.body.append(dialog);render();dialog.showModal(); return dialog;
}
