import MeshRequest from './MeshRequest.js';
import { assertEndpoinIsValid, assertPatternIsValid, match } from './utils.js';

export { MeshTimeoutError, MeshNoNodeError, AbortError } from './MeshError.js';

const MESH_PROTO = 'mesh-comm:';

enum MeshEventType {
  BROADCAST = 1,
  ANNOUNCE,
  ACKNOWLEDGE,
  REQUEST,
  RESPONSE,
}

type MeshEventData =
  | {
      t: MeshEventType.BROADCAST;
      payload: any;
    }
  | {
      t: MeshEventType.REQUEST;
      rId: string;
      nId: string;
      payload: any;
    }
  | {
      t: MeshEventType.ACKNOWLEDGE;
      rId: string;
      nId: string;
    }
  | ({
      t: MeshEventType.RESPONSE;
      rId: string;
    } & (
      | {
          res: true;
          payload: any;
        }
      | {
          res: false;
          err: string;
        }
    ))
  | { t: MeshEventType.ANNOUNCE; rId: string };

const send = (name: string, pattern: string, data: MeshEventData) => {
  const tgt = `${MESH_PROTO}//${name}/${pattern.replace(/^\/+|\/+$/gi, '')}`;
  window.postMessage({ tgt: tgt.toString(), ...data }, window.origin);
};

const createInternalListener = (
  name: string,
  nodeId: string,
  endpoint: string,
  listener: (msg: any) => any | Promise<any>,
  requests: Map<string, MeshRequest>
) => {
  return async (ev: MessageEvent) => {
    const data = ev.data as MeshEventData;
    if (!data || ev.source !== window || ev.origin !== window.origin) {
      return;
    }
    const tgt = (data as MeshEventData & { tgt: string }).tgt;
    if (tgt?.indexOf(`${MESH_PROTO}//${name}/`) !== 0) {
      return;
    }

    const pattern = tgt.slice(12 + name.length);

    switch (data.t) {
      case MeshEventType.BROADCAST: {
        if (!match(endpoint, pattern)) {
          return;
        }
        listener(data.payload);
        return;
      }

      case MeshEventType.REQUEST: {
        if (!data.rId || data.nId !== nodeId || pattern !== '/') {
          return;
        }
        const requestId = data.rId;
        try {
          const res = await listener(data.payload);
          send(name, `/`, { t: MeshEventType.RESPONSE, res: true, rId: requestId, payload: res });
        } catch (error) {
          send(name, `/`, { t: MeshEventType.RESPONSE, res: false, err: (error as Error)?.message, rId: requestId });
        }
        return;
      }

      case MeshEventType.RESPONSE: {
        const requestId = data.rId;
        if (!requestId || !requests.has(requestId) || pattern !== '/') {
          return;
        }
        const request = requests.get(requestId)!;
        requests.delete(requestId);
        if (data.res) {
          request.done(data.payload);
        } else {
          request.fail(new Error(data.err || 'Target node failed to process request'));
        }
        return;
      }

      case MeshEventType.ANNOUNCE: {
        if (!match(endpoint, pattern) || !data.rId) {
          return;
        }
        send(name, `/`, { t: MeshEventType.ACKNOWLEDGE, nId: nodeId, rId: data.rId });
        return;
      }

      case MeshEventType.ACKNOWLEDGE: {
        const request = requests.get(data.rId);
        if (!request || !data.nId || pattern !== '/') {
          return;
        }
        // Let's slightly randomise what node handles it when any nodes can handle it, because window.postMessage:
        // - delivers messages in the order then are posted
        // - notifies listeners in the order they subscribed
        setTimeout(() => {
          if (request.phase !== 'announced') {
            return;
          }
          request.ack();
          send(name, `/`, { t: MeshEventType.REQUEST, nId: data.nId, rId: data.rId, payload: request.payload });
        }, Math.random() * 7);
        return;
      }
    }
  };
};

const MeshComm = (name: string) => {
  const nodeId = Math.random().toString(36).slice(2);
  const requests = new Map<string, MeshRequest>();

  return {
    add(endpoint: string, listener: (msg: any) => any | Promise<any>) {
      assertEndpoinIsValid(endpoint);
      const internalListener = createInternalListener(name, nodeId, endpoint, listener, requests);
      window.addEventListener('message', internalListener);
      return () => window.removeEventListener('message', internalListener);
    },

    send(pattern: string, msg: any) {
      assertPatternIsValid(pattern);
      send(name, pattern, { t: MeshEventType.BROADCAST, payload: msg });
    },

    request(pattern: string, msg: any, opts?: { abortSignal?: AbortSignal; timeout?: number }) {
      assertPatternIsValid(pattern);
      return new Promise((resolve, reject) => {
        const request = new MeshRequest({ resolve, reject, abortSignal: opts?.abortSignal, timeout: opts?.timeout || 5_000, payload: msg });
        requests.set(request.id, request);
        send(name, pattern, { t: MeshEventType.ANNOUNCE, rId: request.id });
      });
    },
  };
};
export default MeshComm;
