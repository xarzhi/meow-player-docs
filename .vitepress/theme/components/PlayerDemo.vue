<script setup>
// 首页 hero 里的演示：把 meow-player（Tauri 版）的前端原样挂起来。
//
// 两个要点：
// 1. 1:1 复刻 —— 画布固定成 App 的默认窗口尺寸 1250×750（源码里的
//    WINDOW_DEFAULT_WIDTH / WINDOW_DEFAULT_HEIGHT），内部所有间距字号都用原值，
//    最后整体 transform: scale() 缩到 hero 里。直接压到 1000×640 的话，
//    每个间距都被压扁，就会「挤在一起」。
// 2. 磨砂 —— 原生版是靠 DWM 的亚克力/云母做的，而 App 的主题里
//    --top-bg-color / --menu-bg-color / --content-bg-color 都是占位值 transition（等于透明）。
//    网页里没有原生材质，所以这里自己补：舞台铺一层彩色底 -> 窗口根节点 backdrop-filter 糊它。
//
// 依赖里有 wasm 和一堆浏览器 API，所以整个演示只在客户端挂载（SSR 时这里是个空 div）。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { initBackend } from '../meow-shim/backend.js'

const CANVAS_W = 1250
const CANVAS_H = 750

const stage = ref(null)
const host = ref(null)
const scale = ref(0.8)
let instance = null
let observer = null

function fit() {
	const el = stage.value
	if (!el) return
	const w = el.clientWidth
	const h = el.clientHeight
	if (!w || !h) return
	// 等比缩放到正好放进舞台，最大 1（不放大）
	scale.value = Math.min(w / CANVAS_W, h / CANVAS_H, 1)
}

onMounted(async () => {
	// 把构建时扫好的音乐库和 base 交给网页后端
	const { theme, site } = useData()
	initBackend({
		songs: theme.value?.songs || [],
		base: site.value?.base || '/',
	})

	const [
		{ default: MeowApp },
		{ createApp },
		{ createPinia },
		{ default: meowRouter },
		{ default: Antd },
		{ default: Drawer },
	] = await Promise.all([
		import('../meow/App.vue'),
		import('vue'),
		import('pinia'),
		import('../meow/router/index.js'),
		import('ant-design-vue'),
		// 原版在 main.js 里全局注册了 Drawer，这里自己 createApp 也要注册
		import('../meow/components/Drawer.vue'),
	])

	// meow-player 的全局样式：只在演示真的挂载时才加载
	await Promise.all([
		import('../meow/assets/index.scss'),
		import('../meow/assets/theme/index.css'),
		import('../meow/assets/fonts/iconfont/iconfont.css'),
		import('ant-design-vue/dist/reset.css'),
	])

	instance = createApp(MeowApp)
	instance.use(createPinia())
	instance.use(meowRouter)
	instance.use(Antd)
	instance.component('Drawer', Drawer)
	instance.config.errorHandler = (err, _vm, info) => console.error('[meow]', info, err)
	instance.mount(host.value)

	fit()
	if (typeof ResizeObserver !== 'undefined') {
		observer = new ResizeObserver(fit)
		observer.observe(stage.value)
	}
	if (typeof window !== 'undefined') window.addEventListener('resize', fit)
})

onBeforeUnmount(() => {
	observer?.disconnect()
	if (typeof window !== 'undefined') window.removeEventListener('resize', fit)
	try {
		instance?.unmount()
	} catch {
		// 忽略
	}
	instance = null
})
</script>

<template>
	<div ref="stage" class="meow-stage">
		<div class="meow-scaler" :style="{ width: '100%', height: '100%' }">
			<div ref="host" class="meow-host" :style="{ width: '100%', height: '100%' }" />
		</div>
	</div>
</template>

<style scoped>
/* 舞台：给磨砂玻璃一层「有东西可糊」的底（相当于 App 里开着壁纸） */
.meow-stage {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	overflow: hidden;
	border-radius: 12px;
	background:
		radial-gradient(55% 50% at 14% 8%, #c7d2fe 0%, rgba(199, 210, 254, 0) 62%),
		radial-gradient(48% 46% at 88% 18%, #fbcfe8 0%, rgba(251, 207, 232, 0) 62%),
		radial-gradient(58% 55% at 62% 98%, #bae6fd 0%, rgba(186, 230, 253, 0) 64%),
		linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%);
	box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.meow-scaler {
	position: relative;
	flex-shrink: 0;
}

/* 画布：真实尺寸 1250×750，靠 transform 缩放（不改内部任何尺寸） */
.meow-host {
	position: absolute;
	top: 0;
	left: 0;
	overflow: hidden;
	transform-origin: top left;
	border-radius: 10px;
}

/* App 的根节点原本是 100vw/100vh（整个原生窗口），这里改成填满画布 */
.meow-host :deep(.main_window),
.meow-host :deep(.music_box) {
	width: 100% !important;
	height: 100% !important;
}

/* ---- 磨砂玻璃：补上原生窗口材质那一层 ----------------------------------
   --top-bg-color / --menu-bg-color / --content-bg-color 在 App 的主题里是占位值
   transition（也就是透明），原生版靠 DWM 的亚克力/云母出效果。网页里只能用
   backdrop-filter 把舞台那层彩色底糊一下，做出同样的观感。 */
.meow-host :deep(.main_window) {
	background-color: transparent !important;
	backdrop-filter: blur(30px) saturate(1.6);
	-webkit-backdrop-filter: blur(30px) saturate(1.6);
}

/* 顶栏 / 内容区：一层很淡的白，让「磨砂玻璃」有面儿 */
.meow-host :deep(.top) {
	background-color: rgba(255, 255, 255, 0.28) !important;
	backdrop-filter: blur(18px);
	-webkit-backdrop-filter: blur(18px);
}
.meow-host :deep(.main_view) {
	background-color: rgba(255, 255, 255, 0.2) !important;
}

/* 播放条本来就有 --player-bg-color: rgba(255,255,255,.8)，再补一点模糊 */
.meow-host :deep(.player_box) {
	backdrop-filter: blur(20px) saturate(1.4);
	-webkit-backdrop-filter: blur(20px) saturate(1.4);
}

/* 深色主题（App 会把 data-theme 设在 html 上）：舞台底也压暗，不然白底配亮字 */
:global(html[data-theme='dark']) .meow-stage {
	background:
		radial-gradient(55% 50% at 14% 8%, rgba(76, 29, 149, 0.55) 0%, rgba(76, 29, 149, 0) 62%),
		radial-gradient(48% 46% at 88% 18%, rgba(131, 24, 67, 0.5) 0%, rgba(131, 24, 67, 0) 62%),
		radial-gradient(58% 55% at 62% 98%, rgba(12, 74, 110, 0.55) 0%, rgba(12, 74, 110, 0) 64%),
		linear-gradient(135deg, #171b26 0%, #0d1017 100%);
}
:global(html[data-theme='dark']) .meow-host :deep(.top) {
	background-color: rgba(255, 255, 255, 0.06) !important;
}
:global(html[data-theme='dark']) .meow-host :deep(.main_view) {
	background-color: rgba(255, 255, 255, 0.04) !important;
}
</style>
