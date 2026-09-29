import DefaultTheme from 'vitepress/theme'
import './style/index.css'
import './style/home.scss'
import './style/nav.scss'
import './style/blur.css'
// import mouseClick from './utils/mouse-click-particles'
// import mediumZoom from 'medium-zoom'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute, useData, useRouter } from 'vitepress'
import { h } from 'vue'
import Layout from './Layout.vue'
// import useClickParticles from './hooks/useClickParticles.js'

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('Layout', Layout)
		// 这里原来有一句 register(app)，但整个主题里没有 register 这个函数，
		// 执行到就抛 ReferenceError: register is not defined。
		// window.$app 原本写在下方 setup() 里，那里拿不到 app，同样会抛错，故挪到这里。
		if (typeof window !== 'undefined') window.$app = app
	},
	Layout: () => {
		const props = {}
		const { frontmatter } = useData()
		/* 添加自定义 class */
		if (frontmatter.value?.layoutClass) {
			props.class = frontmatter.value.layoutClass
		}
		return h(Layout, props)
	},
	setup() {
		const route = useRoute()
		const router = useRouter()
		// useClickParticles()

		// initZoom 的定义被删掉了，但下面 watch 里还在调用它，
		// 结果是切换页面时抛 ReferenceError: initZoom is not defined。
		// 这里把定义补回来（mediumZoom 本来就是注释状态，所以是个空操作）。
		const initZoom = () => {
			// mediumZoom('.main img,div:not(a) > img', {
			// 	background: 'rgba(0, 0, 0, 0.6)',
			// })
		}

		onMounted(() => {})

		watch(
			() => route.path,
			() =>
				nextTick(() => {
					initZoom()
				})
		)
	},
}
