export type Locale = "ko" | "en";
const KEY = "reversix-language";
let locale: Locale = readLocale();
function readLocale(): Locale {
  try { const saved = localStorage.getItem(KEY); if (saved === "ko" || saved === "en") return saved; } catch {}
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}
export function getLocale() { return locale; }
export function setLocale(next: Locale) {
  locale = next;
  try { localStorage.setItem(KEY, next); } catch {}
  document.documentElement.lang = next;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", t("meta.description"));
}
const ko: Record<string, string> = {
  "meta.description":"REVERSIX! 한 턴에 두 수를 두고 정확히 여섯 개로 체크를 거는 2인용 리버시 전략 게임.",
  "lobby.create":"새로운 방 만들기","lobby.joinLabel":"코드를 사용하여 들어가기","lobby.code":"6자리 코드","lobby.join":"들어가기","lobby.how":"게임 방법","lobby.settings":"설정","lobby.creating":"방 만드는 중","lobby.joining":"방으로 들어가는 중","lobby.reconnecting":"다시 연결하는 중","lobby.unconfigured":"온라인 연결이 설정되어있지 않습니다. 호스트의 firebase 셋업이 설정되어 있지 않습니다. 잠시 후 다시 시도해 주세요.",
  "game.room":"{code}번 방","game.copy":"복사하기","game.copied":"복사됨","game.select":"코드를 선택해 주세요","game.waiting":"상대방을 기다리는 중","game.draw":"비겼다..!","game.win":"이겼다!!","game.lose":"졌다...","game.turn":"{color} 차례 - {move} / {total}","game.black":"흑돌","game.white":"백돌","game.check":"체크!","game.defend":"체크! 방어하세요!","game.survived":"상대가 방어를 실패했습니다!","game.remained":"방어를 실패했습니다...","game.you":"당신은 {color}입니다. 흑 {black}개 / 백 {white}개","game.connection":"인터넷 연결 에러","game.disconnected":"상대의 연결이 해제되어 있습니다","game.back":"로비로 돌아가기","game.undo":"되돌리기","game.soundOn":"소리 켜기","game.soundOff":"소리 끄기",
  "settings.title":"설정","settings.language":"언어","settings.sound":"소리","settings.on":"켜기","settings.off":"끄기","settings.close":"닫기",
  "tutorial.count":"게임 방법 · {page} / 6","tutorial.back":"이전","tutorial.next":"다음","tutorial.play":"완료","tutorial.close":"닫기",
  "board.label":"10×10 게임판","board.cell":"{row}행 {column}열: {state}","board.empty":"빈칸","board.legal":"둘 수 있는 칸","board.forbidden":"더블 SIX 규칙으로 둘 수 없는 칸","board.first":"첫 번째 새 흑돌","board.second":"두 번째 새 흑돌",
};
const en: Record<string, string> = {
  "meta.description":"REVERSIX! A private two-player Reversi game with two moves and SIX checks.","lobby.create":"CREATE PRIVATE GAME","lobby.joinLabel":"JOIN PRIVATE GAME","lobby.code":"6-LETTER CODE","lobby.join":"JOIN","lobby.how":"HOW TO PLAY","lobby.settings":"SETTINGS","lobby.creating":"CREATING ROOM","lobby.joining":"JOINING ROOM","lobby.reconnecting":"RECONNECTING TO ROOM","lobby.unconfigured":"ONLINE PLAY IS NOT CONFIGURED. The host must finish Firebase setup.","game.room":"ROOM {code}","game.copy":"COPY","game.copied":"COPIED","game.select":"SELECT CODE","game.waiting":"WAITING FOR PLAYER","game.draw":"DRAW","game.win":"YOU WIN","game.lose":"YOU LOSE","game.turn":"{color}'S TURN — MOVE {move} / {total}","game.black":"BLACK","game.white":"WHITE","game.check":"CHECK!","game.defend":"CHECK! YOU ARE IN CHECK","game.survived":"SIX SURVIVED","game.remained":"SIX REMAINED","game.you":"YOU ARE {color} · BLACK {black} / WHITE {white}","game.connection":"CONNECTION LOST — RECONNECTING","game.disconnected":"OPPONENT DISCONNECTED","game.back":"BACK TO LOBBY","game.undo":"UNDO","game.soundOn":"SOUND ON","game.soundOff":"SOUND OFF","settings.title":"SETTINGS","settings.language":"LANGUAGE","settings.sound":"SOUND","settings.on":"ON","settings.off":"OFF","settings.close":"CLOSE","tutorial.count":"HOW TO PLAY · {page} / 6","tutorial.back":"BACK","tutorial.next":"NEXT","tutorial.play":"PLAY","tutorial.close":"CLOSE","board.label":"10 by 10 game board","board.cell":"Row {row}, column {column}: {state}","board.empty":"empty","board.legal":"legal move","board.forbidden":"forbidden by double-six rule","board.first":"first new black stone","board.second":"second new black stone",
};
export function t(key: string, vars: Record<string,string|number> = {}) { const value = (locale === "ko" ? ko[key] : en[key]) ?? en[key] ?? key; return value.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? "")); }
const events: Record<string, [string,string]> = {"PLAYER JOINED":["PLAYER JOINED","상대방이 들어왔습니다!"],"CHECK!":["CHECK!","체크!"],"COUNTER CHECK!":["COUNTER CHECK!","카운터 체크!"],"CHECK DEFENDED":["CHECK DEFENDED","체크 해제!"],"OPPONENT DISCONNECTED":["OPPONENT DISCONNECTED","상대방의 연결이 끊어졌습니다"],"OPPONENT RECONNECTED":["OPPONENT RECONNECTED","상대방의 연결이 돌아왔습니다."],"BLACK PASS":["BLACK PASS","흑돌을 더 이상 둘 곳이 없습니다."],"WHITE PASS":["WHITE PASS","백돌을 더 이상 둘 곳이 없습니다."],"BLACK SECOND MOVE SKIPPED":["BLACK SECOND MOVE SKIPPED","흑돌을 더 이상 둘 곳이 없습니다."],"WHITE SECOND MOVE SKIPPED":["WHITE SECOND MOVE SKIPPED","백돌을 더 이상 둘 곳이 없습니다."]};
export function localizeEvent(event:string) { return events[event]?.[locale === "ko" ? 1 : 0] ?? event; }
const errors: Record<string,string> = {"ROOM NOT FOUND":"방을 찾을 수 없습니다. 다시 한번 확인해 주세요.","ILLEGAL MOVE":"둘 수 없는 곳입니다.","UNDO IS NOT AVAILABLE":"되돌리기를 할 수 없어요.","ROOM FULL":"누가 이 방에 이미 있어요..!","NOT YOUR TURN":"아직 당신의 차례가 아니에요!","STATE CHANGED — TRY AGAIN":"서버 게임 revision이 바뀌었습니다. 다시 시도해 주세요.","ENTER A VALID 6-CHARACTER CODE":"6자리 코드를 입력해 주세요!!"};
export function localizeError(error:string) { if (locale === "en") return errors[error] ? error : "A NETWORK ERROR OCCURRED. PLEASE TRY AGAIN LATER."; return errors[error] ?? "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."; }
