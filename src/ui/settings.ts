import { getLocale, setLocale, t, type Locale } from "../i18n/i18n";
import type { Theme } from "./theme";

export interface SettingsControls {
  getSound:()=>boolean;
  setSound:(value:boolean)=>void;
  getTheme:()=>Theme;
  setTheme:(value:Theme)=>void;
  changed:()=>void;
}

export function openSettings(controls:SettingsControls) {
  const dialog=document.createElement("dialog");dialog.className="tutorial settings";dialog.setAttribute("aria-labelledby","settings-title");
  const close=()=>{dialog.close();dialog.remove()};
  const render=()=>{
    dialog.replaceChildren();
    const closeButton=document.createElement("button");closeButton.className="settings-close";closeButton.textContent="×";closeButton.setAttribute("aria-label",getLocale()==="ko"?"설정 닫기":"Close settings");closeButton.onclick=close;dialog.append(closeButton);
    const title=document.createElement("h2");title.id="settings-title";title.textContent=t("settings.title");dialog.append(title);
    const content=document.createElement("div");content.className="settings-content";
    const group=(label:string,values:[string,string][],select:(value:string)=>void,current:string)=>{
      const section=document.createElement("section");section.className="settings-group";
      const heading=document.createElement("p");heading.className="settings-label";heading.textContent=label;section.append(heading);
      const options=document.createElement("div");options.className="settings-options";
      for(const [value,text] of values){const button=document.createElement("button");button.type="button";button.dataset.value=value;button.textContent=text;button.setAttribute("aria-pressed",String(value===current));button.onclick=()=>{select(value);render();controls.changed()};options.append(button)}
      section.append(options);content.append(section);
    };
    group(t("settings.language"),[["ko","한국어"],["en","English"]],value=>setLocale(value as Locale),getLocale());
    group(t("settings.appearance"),[["light",t("settings.light")],["dark",t("settings.dark")]],value=>controls.setTheme(value as Theme),controls.getTheme());
    group(t("settings.sound"),[["on",t("settings.on")],["off",t("settings.off")]],value=>controls.setSound(value==="on"),controls.getSound()?"on":"off");
    dialog.append(content);
  };
  dialog.addEventListener("cancel",event=>{event.preventDefault();close()});document.body.append(dialog);render();dialog.showModal();return dialog;
}
