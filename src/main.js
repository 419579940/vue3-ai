import { createApp } from 'vue'
import App from './App.vue'
import '@/assets/styles/index.scss'

import pinia from './pinia'
import router from './router'

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
