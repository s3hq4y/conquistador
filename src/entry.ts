import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import i18n from './locales';
import App from './ui/App.vue';
import './styles/entry.postcss';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

app.mount('#app');
