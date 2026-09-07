import {
  limitToLast,
  onValue,
  push,
  query,
  ref,
  serverTimestamp,
} from "firebase/database";
import { connection } from "./firebase";
import { isChatPresetId, type ChatPresetId } from "./chatPresets";

export interface QuickChatMessage {
  id: string;
  uid: string;
  presetId: ChatPresetId;
  createdAt: number;
}

export async function watchQuickChat(
  code: string,
  onMessages: (messages: QuickChatMessage[]) => void,
  onError: (error: Error) => void,
) {
  const { db } = await connection();
  return onValue(
    query(ref(db, `quickChat/${code}`), limitToLast(50)),
    (snapshot) => {
      const messages: QuickChatMessage[] = [];
      snapshot.forEach((child) => {
        const value = child.val();
        if (
          child.key &&
          value &&
          typeof value.uid === "string" &&
          isChatPresetId(value.presetId) &&
          typeof value.createdAt === "number"
        )
          messages.push({ id: child.key, ...value });
      });
      onMessages(messages);
    },
    onError,
  );
}

export async function sendQuickChat(code: string, presetId: ChatPresetId) {
  if (!isChatPresetId(presetId)) throw new Error("INVALID CHAT PRESET");
  const { db, uid } = await connection();
  await push(ref(db, `quickChat/${code}`), {
    uid,
    presetId,
    createdAt: serverTimestamp(),
  });
}
