import singleSpaHtml from 'single-spa-html';
import $ from 'jquery';
import MeshComm from 'mesh-comm';

const mesh = MeshComm('my-mesh');

const lifecycles = singleSpaHtml({
  template:
    '<div>' +
    '<h1>Hello from a JQuery MFE!</h1>' +
    '<p>This is a microfrontend powered by JQuery</p>' +
    '<p>Endpoint: <b>/mfe/vanilla</b></p>' +
    '<form class="send" id="jq_rc_1">' +
    '<select name="method">' +
    '<option>send</option>' +
    '<option>request</option>' +
    '</select>' +
    '<input name="pattern" value="/*" />' +
    '<button type="submit">submit</button>' +
    '</form>' +
    '<div id="jq_rl_1" class="log"></div>' +
    '<div>',
});

let cnt = 1;

export const mount = async (props: any) => {
  await lifecycles.mount(props);
  const logEntry = (msg: any) => $('#jq_rl_1').append(`<div>${typeof msg === 'string' ? msg : JSON.stringify(msg)}</div>`);

  mesh.add('/mfe/vanilla', async (msg) => {
    if (msg.message.indexOf('Question') === 0) {
      if (Math.random() > 0.66) {
        logEntry(`rejecting "${msg.message}"...`);
        throw new Error(`Vanilla MFE rejects "${msg.message}"`);
      }
      logEntry(`responding to "${msg.message}"...`);
      return { message: `Response to "${msg.message}" from Vanilla MFE!` };
    } else {
      logEntry(msg);
    }
    return;
  });

  const $root = $('#jquery-root');

  $root.html(`
    <h1>Hello from jQuery MFE!</h1>
    <button id="click-me-btn">Click Me</button>
    <p id="message"></p>
  `);

  $('#jq_rc_1').on('submit', (ev) => {
    ev.preventDefault();
    console.log(ev);
    const data = new FormData(ev.target as HTMLFormElement);
    const method = data.get('method') as string;
    const pattern = data.get('pattern') as string;
    switch (method) {
      case 'send':
        mesh.send(pattern, { message: `Broadcast #${cnt++} from Vanilla MFE!` });

        return;
      case 'request':
        mesh
          .request(pattern, { message: `Question #${cnt++} from Vanilla MFE!` })
          .then((res: any) => logEntry(res))
          .catch((err) => {
            console.error(err);
            logEntry('Rejected with: ' + err.toString());
          });
        return;
    }
  });
};
//
// export const unmount = async () => {
//   console.log('jQuery-based MFE unmounted');
//
//   $('#jquery-root').empty();
// };

export const { bootstrap, unmount } = lifecycles;
