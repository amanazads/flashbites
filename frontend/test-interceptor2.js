const axios = require('axios');
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
instance.post('https://httpbin.org/post', {}).catch(e => console.error("FINAL ERROR:", e.message));
