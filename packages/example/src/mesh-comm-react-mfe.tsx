import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import MeshComm from 'mesh-comm';

MeshComm.logger.enable();

const mesh = MeshComm('my-mesh');

let cnt = 1;

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: () => {
    const [messages, setMessages] = useState<string[]>([]);
    const logEntry = (msg: any) => setMessages((msgs) => [...msgs, typeof msg === 'string' ? msg : JSON.stringify(msg)]);
    useEffect(() => {
      const remove = mesh.add('/mfe/react', async (msg) => {
        if (msg.message.indexOf('Question') === 0) {
          if (Math.random() > 0.66) {
            logEntry(`rejecting "${msg.message}"...`);
            throw new Error(`React MFE rejects "${msg.message}"`);
          }
          logEntry(`responding to "${msg.message}"...`);
          return { message: `Response to "${msg.message}" from React MFE!` };
        } else {
          logEntry(msg);
        }
        return;
      });
      return remove;
    }, []);

    return (
      <>
        <h1>Hello from React MFE!</h1>
        <p>This is a microfrontend powered by React.js</p>
        <p>
          Endpoint: <b>/mfe/react</b>
        </p>
        <form
          className="send"
          onSubmit={(ev) => {
            ev.preventDefault();
            const data = new FormData(ev.target as HTMLFormElement);
            const method = data.get('method') as string;
            const pattern = data.get('pattern') as string;
            switch (method) {
              case 'send':
                mesh.send(pattern, { message: `Broadcast #${cnt++} from React MFE!` });
                return;
              case 'request':
                mesh
                  .request(pattern, { message: `Question #${cnt++} from React MFE!` })
                  .then((res: any) => logEntry(res))
                  .catch((err) => {
                    console.error(err);
                    logEntry('Rejected with: ' + err.toString());
                  });
                return;
            }
          }}
        >
          <select name="method">
            <option>send</option>
            <option>request</option>
          </select>
          <input name="pattern" defaultValue="/*" />
          <button type="submit">submit</button>
        </form>
        <div className="log">
          {messages.map((msg) => (
            <div>{msg}</div>
          ))}
        </div>
      </>
    );
  },
  errorBoundary: (err: Error, _info: React.ErrorInfo, _props) => {
    return <>{err.message}</>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
