const {createApp, ref} = require('../../node_modules/vue');


createApp({
  setup() {
    return {
      count: ref(0)
    };
  }
}).mount('#app');
