// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { updateTimeoutDialog } from "../src/ui/timingView";

function root(){
  const root=document.createElement("main");
  root.innerHTML='<dialog class="timeout-dialog"></dialog>';
  return root;
}

it("keeps timeout decision controls mounted through repeated renders",()=>{
  const page=root(),decide=vi.fn(),timeout={pendingFor:"black" as const,continueWithoutClock:false};
  updateTimeoutDialog(page,timeout,true,decide);
  const yes=page.querySelector<HTMLButtonElement>(".timeout-yes")!,no=page.querySelector<HTMLButtonElement>(".timeout-no")!;
  for(let render=0;render<20;render++) updateTimeoutDialog(page,timeout,true,decide);
  expect(page.querySelector(".timeout-yes")).toBe(yes);
  expect(page.querySelector(".timeout-no")).toBe(no);
  yes.click();yes.click();no.click();
  expect(decide).toHaveBeenCalledTimes(1);expect(decide).toHaveBeenCalledWith(true);
});

it("uses waiting UI without decision buttons for the other online player",()=>{
  const page=root();
  updateTimeoutDialog(page,{pendingFor:"black",continueWithoutClock:false},false,vi.fn());
  expect(page.querySelector(".timeout-actions")).toBeNull();
  expect(page.querySelector(".timeout-dialog")?.textContent).toContain("Waiting for their response");
});

it("closes and resets controls when the timeout is resolved",()=>{
  const page=root();
  updateTimeoutDialog(page,{pendingFor:"white",continueWithoutClock:false},true,vi.fn());
  updateTimeoutDialog(page,{pendingFor:"",continueWithoutClock:true},false);
  const dialog=page.querySelector<HTMLDialogElement>(".timeout-dialog")!;
  expect(dialog.open).toBe(false);expect(dialog.dataset.timeoutKey).toBeUndefined();expect(dialog.childElementCount).toBe(0);
});
