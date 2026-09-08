import {
  onValue,
  onDisconnect,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import { connection } from "./firebase";
import { normalizeRoom, type Room } from "./rooms";
export async function watchRoom(
  code: string,
  onRoom: (room: Room | null, uid: string) => void,
  onPresence: (ids: string[], connected: boolean) => void,
  onError: (error: Error) => void,
) {
  const { db, uid } = await connection();
  let active = true,
    connected = false,
    ids: string[] = [];
  const entries: ReturnType<typeof ref>[] = [];
  const roomOff = onValue(
    ref(db, `rooms/${code}`),
    (snap) => onRoom(snap.exists() ? normalizeRoom(snap.val()) : null, uid),
    onError,
  );
  const presenceOff = onValue(
    ref(db, `presence/${code}`),
    (snap) => {
      ids = Object.keys(snap.val() ?? {});
      onPresence(ids, connected);
    },
    onError,
  );
  const connectedOff = onValue(
    ref(db, ".info/connected"),
    (snap) => {
      connected = snap.val() === true;
      onPresence(ids, connected);
      if (connected)
        void (async () => {
          const entry = push(ref(db, `presence/${code}/${uid}`));
          entries.push(entry);
          await onDisconnect(entry).remove();
          if (active) {
            await set(entry, true);
            if (!active) await remove(entry);
          }
        })().catch(onError);
    },
    onError,
  );
  return () => {
    active = false;
    roomOff();
    presenceOff();
    connectedOff();
    for (const entry of entries) void remove(entry).catch(() => {});
  };
}

export async function watchServerOffset(onOffset: (offset: number) => void) {
  const { db } = await connection();
  return onValue(ref(db, ".info/serverTimeOffset"), snap =>
    onOffset(typeof snap.val() === "number" ? snap.val() : 0),
  );
}
