import { createApp } from 'vue'
import { Quasar, Dialog, Loading, Notify, setCssVar } from 'quasar'
import App from './App.vue'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import './style.css'

setCssVar('primary', '#171717')
setCssVar('secondary', '#5e5e5e')
setCssVar('accent', '#171717')
createApp(App).use(Quasar, { plugins: { Dialog, Loading, Notify } }).mount('#app')
