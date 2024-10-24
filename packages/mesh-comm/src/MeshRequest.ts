import { AbortError, MeshNoNodeError, MeshTimeoutError } from './MeshError.js';

class MeshRequest {
  private timeoutTimer!: ReturnType<typeof setTimeout>;
  private _phase: 'proposed' | 'sent' | 'timedout' | 'aborted' | 'done';
  constructor(
    public readonly id: string,
    private props: {
      pattern: string;
      resolve: (res: any) => void;
      reject: (err: Error) => void;
      abortSignal?: AbortSignal;
      timeout: number;
      payload: any;
    }
  ) {
    this._phase = 'proposed';
    // N.B. setTimeout accepts int32, when we pass anything greater than 2^32 it fires immediately, which could be really unexpected when passing in timeout: Number.MAX_SAFE_INTEGER
    if (props.timeout < 0x7fffffff) {
      this.timeoutTimer = setTimeout(this.onInternalTimeout, props.timeout);
    }
    this.props.abortSignal?.addEventListener('abort', this.onExternalAbort);
  }

  private onExternalAbort = (ev: Event) => {
    clearTimeout(this.timeoutTimer);
    if (['proposed', 'sent'].includes(this._phase)) {
      this._phase = 'aborted';
      this.props.reject((ev.currentTarget as AbortSignal).reason || new AbortError());
    }
  };

  private onInternalTimeout = () => {
    clearTimeout(this.timeoutTimer);
    if (['proposed', 'sent'].includes(this._phase)) {
      this.props.reject(
        this._phase === 'proposed'
          ? new MeshNoNodeError(`No node responded to ${this.id} from endpoints matching "${this.props.pattern}"`)
          : new MeshTimeoutError(`No response received for request ${this.id} within within ${this.props.timeout} ms`)
      );
    }
  };

  private cleanUp() {
    clearTimeout(this.timeoutTimer);
    this.props.abortSignal?.removeEventListener('abort', this.onExternalAbort);
  }

  get phase(): 'proposed' | 'sent' | 'timedout' | 'aborted' | 'done' {
    return this._phase;
  }

  get payload() {
    return this.props.payload;
  }

  get pattern() {
    return this.props.pattern;
  }

  ack() {
    if (this._phase !== 'proposed') {
      return;
    }
    this._phase = 'sent';
  }

  resolve(res: any) {
    if (this._phase !== 'sent') {
      return;
    }
    this._phase = 'done';
    this.cleanUp();
    this.props.resolve(res);
  }

  reject(err: Error) {
    if (this._phase !== 'sent') {
      return;
    }
    this._phase = 'done';
    this.cleanUp();
    this.props.reject(err);
  }
}

export default MeshRequest;
