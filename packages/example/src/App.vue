<template>
  <div>
    <h1>Hello from Vue MFE!</h1>
    <p>This is a microfrontend powered by Vue.js</p>
    <p>Endpoint: <b>/mfe/vue</b></p>
    <form class="send" @submit="handleSubmit">
      <select name="method">
        <option>send</option>
        <option>request</option>
      </select>
      <input name="pattern" value="/*" />
      <button type="submit">submit</button>
    </form>

    <div class="log">
      <div v-for="(msg, index) in messages" :key="index">{{ msg }}</div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import MeshComm from 'mesh-comm';

MeshComm.logger.enable();

const mesh = MeshComm('my-mesh');
let cnt = 1;

export default defineComponent({
  setup() {
    const messages = ref([]);

    const logEntry = (msg) => {
      messages.value.push(typeof msg === 'string' ? msg : JSON.stringify(msg));
    };

    const handleSubmit = (ev) => {
      ev.preventDefault();
      const formData = new FormData(ev.target);
      const method = formData.get('method');
      const pattern = formData.get('pattern');

      switch (method) {
        case 'send':
          mesh.send(pattern, { message: `Broadcast #${cnt++} from Vue MFE!` });
          break;
        case 'request':
          mesh
            .request(pattern, { message: `Question #${cnt++} from Vue MFE!` })
            .then((res) => logEntry(res))
            .catch((err) => {
              console.error(err);
              logEntry('Rejected with: ' + err.toString());
            });
          break;
      }
    };

    onMounted(() => {
      const remove = mesh.add('/mfe/vue', async (msg) => {
        if (msg.message.startsWith('Question')) {
          if (Math.random() > 0.66) {
            logEntry(`rejecting "${msg.message}"...`);
            throw new Error(`Vue MFE rejects "${msg.message}"`);
          }
          logEntry(`responding to "${msg.message}"...`);
          return { message: `Response to "${msg.message}" from Vue MFE!` };
        } else {
          logEntry(msg);
        }
      });

      onBeforeUnmount(() => {
        remove();
      });
    });

    return {
      messages,
      handleSubmit,
    };
  },
});
</script>

<style scoped>
/* Add your styles here */
</style>
