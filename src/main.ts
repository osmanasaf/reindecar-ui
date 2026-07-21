import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import './assets/styles/variables.css'
import './assets/styles/rc-tokens.css'
import './assets/styles/rc-components.css'
import './assets/styles/rc-primitives.css'
import './assets/styles/rc-shell.css'
import './assets/styles/rc-customers.css'
import './assets/styles/rc-vehicles.css'
import './assets/styles/rc-rentals.css'
import './assets/styles/rc-accounting.css'
import './assets/styles/rc-settings.css'
import './assets/styles/rc-documents.css'
import './assets/styles/rc-datepicker.css'
import './assets/styles/rc-bridge.css'
import './assets/styles/rc-motion.css'
import { clickOutside } from './directives'
import { initTheme } from './composables/useTheme'

initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.directive('click-outside', clickOutside)

app.mount('#app')
