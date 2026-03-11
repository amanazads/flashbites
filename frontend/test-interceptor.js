const axios = require('axios');
const FormData = require('form-data');
const instance = axios.create();
instance.interceptors.request.use(config => {
  try {
    delete config.headers['Content-Type'];
    delete config.headers.post['Content-Type'];
  } catch (e) {
    console.error('ERROR TYPE:', e.message);
  }
  return config;
});

const f = new FormData();
instance.post('https://httpbin.org/post', f).catch(e => console.error("FINAL ERROR:", e.message));
