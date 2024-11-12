import { createApp } from 'vue'
import App from './App.vue'
import './style/index.scss'
import { i18n } from './locales/schema';

let urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('lang')) {
  let locale = urlParams.get('lang') ?? "en-us"
  i18n.global.locale = locale as "en-US" | "pt-BR";
}

const app = createApp(App)
app.use(i18n)
app.mount('#app')
