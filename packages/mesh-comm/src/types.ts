export enum MeshEventType {
  BROADCAST = 'BRD',
  ANNOUNCE = 'ANN',
  PROPOSE = 'PRO',
  ACKNOWLEDGE = 'ACK',
  REQUEST = 'REQ',
  RESPONSE = 'RES',
}

export type MeshEventData = { s: string } & (
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
  | { t: MeshEventType.PROPOSE; rId: string }
  | { t: MeshEventType.ANNOUNCE; ep: string }
);
