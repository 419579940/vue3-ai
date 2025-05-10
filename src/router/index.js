import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/index.vue'),
    meta: {
      title: 'Home',
      icon: 'HomeFilled',
      affix: true,
      keepAlive: true
    }
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
