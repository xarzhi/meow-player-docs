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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { initBackend } from '../meow-shim/backend.js'

const CANVAS_W = 1250
const CANVAS_H = 750

const stage = ref(null)
const host = ref(null)
const scale = ref(0.8)
let instance = null
let observer = null

// 播放器的主题跟着文档站的明暗开关走：
//   亮色 -> 亮底 + 黑字；暗色 -> 暗底 + 白字
// 实现上只有「html 上的 data-theme」这一个来源：
//   这里按 isDark 写它，App 自己顶栏那个太阳/月亮按钮也写它，CSS 只看它。
// （CSS 里绝对不能再写 html.dark —— 那是文档站的类，会和这里打架。）
const { isDark } = useData()
watch(
  isDark,
  (dark) => {
    if (typeof document === 'undefined') return
    const theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    // 顺便把 App 自己存的主题（localStorage）也改成一致：
    // App 启动时 initConfig 会用这个值再写一次 data-theme，不一致的话首屏会被它覆盖。
    try {
      const KEY = 'meow-store:setting.json'
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
      raw.themeMode = theme
      localStorage.setItem(KEY, JSON.stringify(raw))
    } catch {
      // 隐私模式写不了就算了
    }
  },
  { immediate: true }
)

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
	background: #e9eef6;
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
	background-color: rgba(255, 255, 255, 0.55) !important;
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
	background-color: rgba(255, 255, 255, 0.6) !important;
	backdrop-filter: blur(20px) saturate(1.4);
	-webkit-backdrop-filter: blur(20px) saturate(1.4);
}
</style>

<!-- 主题色单独放一个「非 scoped」的块：
     1) scoped 里写 :global(html.dark) 匹配不上，实测暗色下窗口还是全透明；
     2) 文字色要覆盖 App 的 --primary-text-color，而它定义在 :root[data-theme='light'] 上，
        优先级 (0,2,0) 比 .meow-host 高，所以必须写成 html[data-theme='light'] .meow-host。
     目标就是：亮色 = 亮底 + 黑字，暗色 = 暗底 + 白字。 -->
<style>
/* 只认 App 自己的 data-theme！
   千万不要写 html.dark —— 那是文档站（VitePress）的暗色类，
   一写就会「文档站切暗色 → 播放器跟着变暗、字全白」，实测踩过。 */

/* ---- 亮色：亮底 + 黑字 ---- */
html[data-theme='light'] .meow-host {
	--primary-text-color: #000;
	--sub-text-color: rgba(0, 0, 0, 0.6);
	--player-title-text-color: #000;
	--player-artist-text-color: rgba(0, 0, 0, 0.6);
	--menu-active-text-color: #000;
}

/* ---- 暗色：暗底 + 白字 ---- */
html[data-theme='dark'] .meow-stage {
	background: #14161c !important;
}
html[data-theme='dark'] .meow-host {
	--primary-text-color: #fff;
	--sub-text-color: rgba(255, 255, 255, 0.65);
	--player-title-text-color: #fff;
	--player-artist-text-color: rgba(255, 255, 255, 0.65);
	--menu-active-text-color: #fff;
}
html[data-theme='dark'] .meow-host .main_window {
	background-color: rgba(22, 24, 30, 0.72) !important;
}
html[data-theme='dark'] .meow-host .top {
	background-color: rgba(255, 255, 255, 0.06) !important;
}
html[data-theme='dark'] .meow-host .main_view {
	background-color: rgba(255, 255, 255, 0.04) !important;
}
html[data-theme='dark'] .meow-host .player_box {
	background-color: rgba(30, 32, 40, 0.78) !important;
}
</style>
