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

export function updateTimeoutDialog(root:HTMLElement,timeout:TimeoutState,canDecide:boolean,decide?:(continueGame:boolean)=>void,decisionBusy=false){
  const dialog=root.querySelector<HTMLDialogElement>(".timeout-dialog")!;
  if(!timeout.pendingFor){
    dialog.removeAttribute("open");
    delete dialog.dataset.timeoutKey;
    delete dialog.dataset.decisionBusy;
    dialog.replaceChildren();
    return;
  }
  const key=`${timeout.pendingFor}:${canDecide?"decide":"waiting"}`;
  if(dialog.dataset.timeoutKey!==key){
    const title=document.createElement("h2");
    const message=document.createElement("p");
    dialog.replaceChildren(title,message);
    if(canDecide){
      const submit=(continueGame:boolean)=>{
        if(dialog.dataset.decisionBusy) return;
        dialog.dataset.decisionBusy="true";
        dialog.querySelectorAll<HTMLButtonElement>(".timeout-actions button").forEach(button=>button.disabled=true);
        decide?.(continueGame);
      };
    const actions=document.createElement("div");actions.className="timeout-actions";
      const yes=document.createElement("button");yes.className="timeout-yes";yes.textContent=t("timeout.yes");yes.onclick=()=>submit(true);
      const no=document.createElement("button");no.className="timeout-no";no.textContent=t("timeout.no");no.onclick=()=>submit(false);
      actions.append(yes,no);dialog.append(actions);
    }
    dialog.dataset.timeoutKey=key;
  }
  dialog.querySelector("h2")!.textContent=t("timeout.title");
  dialog.querySelector("p")!.textContent=t(canDecide?"timeout.continue":"timeout.waiting");
  if(!decisionBusy) delete dialog.dataset.decisionBusy;
  dialog.querySelectorAll<HTMLButtonElement>(".timeout-actions button").forEach(button=>button.disabled=Boolean(decisionBusy||dialog.dataset.decisionBusy));
  dialog.setAttribute("open","");
}
