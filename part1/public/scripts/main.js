import { createApp, ref } from '../../node_modules/vue';

createApp({
  setup() {
    return {
      count: ref(0)
    };
  }
}).mount('#app');
