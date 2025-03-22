export class PendingTaskEvent extends Event {
  constructor(complete) {
    super("pending-task", { bubbles: true, composed: true });
    this.complete = complete;
  }
}
