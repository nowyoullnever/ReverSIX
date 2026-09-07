import type { Room } from "../online/rooms";
import { moveTransition, type BoardChange } from "./transitions";
export const MOVE_ANIMATION_MS = 620;
// One ordered presentation queue serves local and remote Firebase updates.
// It never writes game data and has no Firebase subscriptions of its own.
export class RoomPresenter {
  private queue: Room[] = [];
  private latestRevision = -1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  room: Room | null = null;
  locked = false;
  constructor(
    private changed: (
      previous: Room | null,
      next: Room,
      change: BoardChange | undefined,
    ) => void,
    private unlocked: () => void,
    private reducedMotion: () => boolean = () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  ) {}
  receive(room: Room) {
    if (room.game.revision < this.latestRevision) return;
    this.latestRevision = room.game.revision;
    if (
      this.queue.length &&
      this.queue.at(-1)!.game.revision === room.game.revision
    )
      this.queue[this.queue.length - 1] = room;
    else if (this.locked && this.room?.game.revision === room.game.revision) {
      this.room = room;
      return;
    } else this.queue.push(room);
    this.advance();
  }
  private advance() {
    if (this.locked || !this.queue.length) return;
    const previous = this.room,
      next = this.queue.shift()!;
    const change = moveTransition(previous, next);
    this.room = next;
    this.locked = Boolean(change) && !this.reducedMotion();
    this.changed(previous, next, this.locked ? change : undefined);
    if (this.locked)
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.locked = false;
        this.advance();
        if (!this.locked) this.unlocked();
      }, MOVE_ANIMATION_MS);
    else {
      this.advance();
      this.unlocked();
    }
  }
  reset() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.queue = [];
    this.latestRevision = -1;
    this.room = null;
    this.locked = false;
  }
}
