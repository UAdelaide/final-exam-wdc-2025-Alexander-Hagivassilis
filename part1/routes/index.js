var express = require('express');
var router = express.Router();
import { createApp, ref } from 'vue';

createApp({
  setup() {
    return {
      count: ref(0)
    }
  }
}).mount('#app');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
