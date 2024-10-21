import { AbortError, MeshNoNodeError, MeshTimeoutError } from './MeshError.js';

class MeshRequest {
  private timeoutTimer: ReturnType<typeof setTimeout>;
  private _phase: 'announced' | 'sent' | 'timedout' | 'aborted' | 'done';
  readonly id = Math.random().toString(36).slice(2);
  constructor(private props: { resolve: (res: any) => void; reject: (err: Error) => void; abortSignal?: AbortSignal; timeout: number; payload: any }) {
    this._phase = 'announced';
    this.timeoutTimer = setTimeout(this.onInternalTimeout, props.timeout);
    this.props.abortSignal?.addEventListener('abort', this.onExternalAbort);
  }

  private onExternalAbort = (ev: Event) => {
    clearTimeout(this.timeoutTimer);
    if (['announced', 'sent'].includes(this._phase)) {
      this._phase = 'aborted';
      this.props.reject((ev.currentTarget as AbortSignal).reason || new AbortError());
    }
  };

  private onInternalTimeout = () => {
    clearTimeout(this.timeoutTimer);
    if (['announced', 'sent'].includes(this._phase)) {
      this.props.reject(this._phase === 'announced' ? new MeshNoNodeError() : new MeshTimeoutError());
    }
  };

  private cleanUp() {
    clearTimeout(this.timeoutTimer);
    this.props.abortSignal?.removeEventListener('abort', this.onExternalAbort);
  }

  get phase(): 'announced' | 'sent' | 'timedout' | 'aborted' | 'done' {
    return this._phase;
  }

  get payload() {
    return this.props.payload;
  }

  ack() {
    if (this._phase !== 'announced') {
      return;
    }
    this._phase = 'sent';
  }

  done(res: any) {
    if (this._phase !== 'sent') {
      return;
    }
    this._phase = 'done';
    this.cleanUp();
    this.props.resolve(res);
  }

  fail(err: Error) {
    if (this._phase !== 'sent') {
      return;
    }
    this._phase = 'done';
    this.cleanUp();
    this.props.reject(err);
  }
}

export default MeshRequest;
