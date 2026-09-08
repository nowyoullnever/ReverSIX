import { countdownValue, type TimeoutState } from "../game/session";
import { t } from "../i18n/i18n";

export function updateCountdown(root:HTMLElement,endsAt:number,now:number){
  const overlay=root.querySelector<HTMLElement>(".countdown-overlay")!,value=countdownValue(endsAt,now);
  overlay.hidden=value===0;
  if(value&&overlay.dataset.value!==String(value)){
    overlay.dataset.value=String(value);
    const number=document.createElement("span");number.textContent=String(value);overlay.replaceChildren(number);
  }
  if(!value)delete overlay.dataset.value;
  return value>0;
}

export function updateTimeoutDialog(root:HTMLElement,timeout:TimeoutState,canDecide:boolean,decide?:(continueGame:boolean)=>void){
  const dialog=root.querySelector<HTMLDialogElement>(".timeout-dialog")!;
  if(!timeout.pendingFor){dialog.removeAttribute("open");dialog.replaceChildren();return}
  const title=document.createElement("h2");title.textContent=t("timeout.title");
  const message=document.createElement("p");message.textContent=t(canDecide?"timeout.continue":"timeout.waiting");
  dialog.replaceChildren(title,message);
  if(canDecide){
    const actions=document.createElement("div");actions.className="timeout-actions";
    const yes=document.createElement("button");yes.textContent=t("timeout.yes");yes.onclick=()=>decide?.(true);
    const no=document.createElement("button");no.textContent=t("timeout.no");no.onclick=()=>decide?.(false);
    actions.append(yes,no);dialog.append(actions);
  }
  dialog.setAttribute("open","");
}
