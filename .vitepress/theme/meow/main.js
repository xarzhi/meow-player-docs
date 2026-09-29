import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router/index.js'
import { invoke } from '@/utils/api.js'
import Antd from 'ant-design-vue'
import Drawer from '@components/Drawer.vue'

import '@/assets/index.scss'
import '@/assets/theme/index.css'
import '@/assets/fonts/iconfont/iconfont.css'
import 'ant-design-vue/dist/reset.css'

const store = createPinia()

const app = createApp(App)
app.use(router)
app.use(store)
app.use(Antd)
app.component('Drawer', Drawer)
app.config.errorHandler = (err, vm, info) => {
	console.error('[Vue Error]', info, err)
}

app.mount( '#app' )

