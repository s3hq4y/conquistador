import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../ui/EntryPage.vue')
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('../ui/GamePage.vue')
  },
  {
    path: '/beta',
    name: 'beta',
    component: () => import('../beta/BetaEntryPage.vue')
  },
  {
    path: '/beta/pathfinding',
    name: 'beta-pathfinding',
    component: () => import('../beta/completed/pathfinding/BetaPage.vue')
  },
  {
    path: '/beta/movement-range',
    name: 'beta-movement-range',
    component: () => import('../beta/movement-range/BetaPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
