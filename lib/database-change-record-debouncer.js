// DatabaseChangeRecordDebouncer.accumulate is a guarded version of trigger that can accumulate changes.
// This means that even if you're a bad person and call \`persistModel\` 100 times
// from 100 task objects queued at the same time, it will only create one
// \`trigger\` event. This is important since the database triggering impacts
// the entire application.
export default class DatabaseChangeRecordDebouncer {
  constructor({onTrigger, maxTriggerDelay}) {
    this._options = {onTrigger, maxTriggerDelay};
    this._record = null;
  }

  _flushAfterDelay() {
    this._cancelFlush();
    this._flushTimer = setTimeout(() => this._flush(), this._options.maxTriggerDelay);
  }

  _cancelFlush() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
  }

  _flush() {
    if (!this._record) {
      return;
    }

    this._cancelFlush();
    this._options.onTrigger(this._record);
    this._record = null;

    if (this._promiseResolve) {
      this._promiseResolve();
      this._promiseResolve = null;
      this._promise = null;
    }
  }

  accumulate(change) {
    this._promise = this._promise || new Promise((resolve) => {
      this._promiseResolve = resolve;
    });

    if (this._record && this._record.canAppend(change)) {
      this._record.append(change);
    } else {
      this._flush();
      this._record = change;
      this._flushAfterDelay();
    }

    return this._promise;
  }
}
