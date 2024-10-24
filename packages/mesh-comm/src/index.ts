import MeshRequest from './MeshRequest.js';
import { assertEndpoinIsValid, assertPatternIsValid, extractPattern, isMeshEvent, match } from './utils.js';
import Logger from './logger.js';
import { MESH_PROTO } from './const.js';
import { MeshEventData, MeshEventType } from './types.js';

export { MeshTimeoutError, MeshNoNodeError, AbortError } from './MeshError.js';

const send = (name: string, pattern: string, data: MeshEventData) => {
  const tgt = `${MESH_PROTO}//${name}/${pattern.replace(/^\/+|\/+$/gi, '')}`;
  window.postMessage({ tgt: tgt.toString(), ...data }, window.origin);
};

const createInternalListener = (name: string, nodeId: string, endpoint: string, listener: (msg: any) => any | Promise<any>) => {
  return async (ev: MessageEvent) => {
    if (!isMeshEvent(ev, name) || ev.source !== window || ev.origin !== window.origin) {
      return;
    }
    const data = ev.data;

    const pattern = extractPattern(ev, name);

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
          send(name, `/`, { t: MeshEventType.RESPONSE, res: true, rId: requestId, payload: res, s: nodeId });
        } catch (error) {
          send(name, `/`, { t: MeshEventType.RESPONSE, res: false, err: (error as Error)?.message, rId: requestId, s: nodeId });
        }
        return;
      }

      case MeshEventType.PROPOSE: {
        if (!match(endpoint, pattern) || !data.rId) {
          return;
        }
        send(name, `/`, { t: MeshEventType.ACKNOWLEDGE, nId: nodeId, rId: data.rId, s: nodeId });
        return;
      }
    }
  };
};

function MeshComm(name: string) {
  const requests = new Map<string, MeshRequest>();
  const connId = `conn#${Math.random().toString(36).slice(2)}`;

  // Let's add the utility listener
  window.addEventListener('message', (ev: MessageEvent) => {
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
      case MeshEventType.ANNOUNCE: {
        // a new node is added, let's see if we need to retry requests
        if (!data.ep || pattern !== '/') {
          return;
        }
        [...requests.values()]
          .filter((req) => req.phase === 'proposed' && match(data.ep, req.pattern))
          .forEach((req) => {
            send(name, req.pattern, { t: MeshEventType.PROPOSE, rId: req.id, s: connId });
          });
        return;
      }
      case MeshEventType.ACKNOWLEDGE: {
        // one of nodes acknowledged it's ready to accept a request, let's see if it's one of ours requests
        const request = requests.get(data.rId);
        if (!request || !data.nId || pattern !== '/') {
          return;
        }
        // Let's slightly randomise what node handles it when any nodes can handle it, because window.postMessage:
        // - delivers messages in the order then are posted
        // - notifies listeners in the order they subscribed
        setTimeout(() => {
          if (request.phase !== 'proposed') {
            return;
          }
          request.ack();
          send(name, `/`, { t: MeshEventType.REQUEST, nId: data.nId, rId: data.rId, payload: request.payload, s: connId });
        }, Math.random() * 7);
        return;
      }
      case MeshEventType.RESPONSE: {
        // we've got a response for one of requests, let's see if it's one of ours
        const requestId = data.rId;
        if (!requestId || !requests.has(requestId) || pattern !== '/') {
          return;
        }
        const request = requests.get(requestId)!;
        requests.delete(requestId);
        if (data.res) {
          request.resolve(data.payload);
        } else {
          request.reject(new Error(data.err || 'Target node failed to process request'));
        }
        return;
      }
    }
  });

  return {
    add(endpoint: string, listener: (msg: any) => void | any | Promise<any>, _opts?: { exclusive?: boolean }) {
      const nodeId = `node#${Math.random().toString(36).slice(2)}@${endpoint}::${connId}`;
      assertEndpoinIsValid(endpoint);
      const internalListener = createInternalListener(name, nodeId, endpoint, listener);
      window.addEventListener('message', internalListener);
      send(name, '/', { t: MeshEventType.ANNOUNCE, ep: endpoint, s: nodeId });
      return () => window.removeEventListener('message', internalListener);
    },

    send(pattern: string, msg: any) {
      assertPatternIsValid(pattern);
      send(name, pattern, { t: MeshEventType.BROADCAST, payload: msg, s: connId });
    },

    request<R = unknown>(pattern: string, msg: any, opts?: { abortSignal?: AbortSignal; timeout?: number }) {
      assertPatternIsValid(pattern);
      return new Promise<R>((resolve, reject) => {
        const timeout = opts?.timeout || 5_000;
        const request = new MeshRequest(`req#${Math.random().toString(36).slice(2)}::${connId}`, {
          pattern,
          resolve,
          reject,
          abortSignal: opts?.abortSignal,
          timeout,
          payload: msg,
        });
        requests.set(request.id, request);
        send(name, pattern, { t: MeshEventType.PROPOSE, rId: request.id, s: connId });
      });
    },
  };
}

namespace MeshComm {
  export const logger = Logger;
}

export default MeshComm;
