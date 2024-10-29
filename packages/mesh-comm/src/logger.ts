import { isMeshEvent } from './utils.js';
import { MeshEventType } from './types.js';

const getLoggerInstance = () => {
  return (
    (window as any).__MESH_COMM_LOGGER__ ||
    ((window as any).__MESH_COMM_LOGGER__ = (() => {
      const listener = (ev: MessageEvent) => {
        if (!isMeshEvent(ev)) {
          return;
        }
        switch (ev.data.t) {
          case MeshEventType.BROADCAST:
            console.debug(`[MeshComm] (${ev.data.s}) BROADCAST -> ${ev.data.tgt}`, ev.data.payload);
            break;
          case MeshEventType.ANNOUNCE:
            console.debug(`[MeshComm] (${ev.data.s}) ANNOUNCE ${ev.data.ep}`);
            break;
          case MeshEventType.PROPOSE:
            console.debug(`[MeshComm] (${ev.data.s}) PROPOSE ${ev.data.rId}`);
            break;
          case MeshEventType.ACKNOWLEDGE:
            console.debug(`[MeshComm] (${ev.data.s}) ACKNOWLEDGE ${ev.data.rId}`);
            break;
          case MeshEventType.REQUEST:
            console.debug(`[MeshComm] (${ev.data.s}) REQUEST ${ev.data.rId} -> ${ev.data.nId}`, ev.data.payload);
            break;
          case MeshEventType.RESPONSE:
            if (ev.data.res) {
              console.debug(`[MeshComm] (${ev.data.s}) RESPONSE ${ev.data.rId} OK`, ev.data.payload);
            } else {
              console.warn(`[MeshComm] (${ev.data.s}) RESPONSE ${ev.data.rId} ERR`, ev.data.err);
            }
            break;
          default:
            console.debug('[MeshComm]', ev.data);
        }
      };
      return (enable: boolean) => {
        if (enable) {
          window.addEventListener('message', listener);
        } else {
          window.removeEventListener('message', listener);
        }
      };
    })())
  );
};

const logger = {
  enable() {
    getLoggerInstance()(true);
  },
  disable() {
    getLoggerInstance()(false);
  },
};

export default logger;
