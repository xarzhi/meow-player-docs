<script setup>
// 首页 hero 里的演示：把 meow-player（Tauri 版）的前端原样挂起来。
//
// 两个要点：
// 1. 1:1 复刻 —— 画布固定成 App 的默认窗口尺寸 1250×750（源码里的
//    WINDOW_DEFAULT_WIDTH / WINDOW_DEFAULT_HEIGHT），内部所有间距字号都用原值，
//    最后整体 transform: scale() 缩到 hero 里。直接压到 1000×640 的话，
//    每个间距都被压扁，就会「挤在一起」。
// 2. 主题 + 材质 —— App 的主题里 --top-bg-color / --menu-bg-color /
//    --content-bg-color 都是占位值 transition（等于透明），原生版靠 DWM 的
//    亚克力/云母出效果。网页里没有原生材质，所以这里只做两件事：
//      · 窗口底色只跟 data-theme 走：亮色 = 亮底 + 黑字，暗色 = 暗底 + 白字；
//      · 材质由设置页的 currentMaterial 决定，在宿主元素上加 meow-mat-* class。
//        默认 classic = 不透明纯色窗口，什么玻璃效果都不加（没有壁纸，也没有默认磨砂）。
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
// 宿主元素上的材质 class：meow-mat-classic / meow-mat-acrylic / meow-mat-mica
const materialClass = ref('meow-mat-classic')
let instance = null
let observer = null
// App 挂载后才能拿到（见下面 onMounted）
let playerStore = null
let storage = null
let stopThemeWatch = null
let stopMaterialWatch = null
let mql = null
let onSystemThemeChange = null

// ---- 主题：html 上的 data-theme 是唯一的开关 --------------------------------
// 亮色 -> 亮底 + 黑字；暗色 -> 暗底 + 白字。写它的只有两条路：
//   1) App 自己的设置（store.themeMode：light / dark / system + matchMedia 监听）；
//   2) 文档站的明暗开关（演示挂在文档站首页里，跟着走更协调）。
// CSS 只看 data-theme，绝对不看 html.dark —— 那是文档站的类，
// 之前写过一次，结果「文档站一暗，播放器字全白」，踩过坑。
const { isDark } = useData()

const STORE_KEY = 'meow-store:setting.json'

// 'light' / 'dark' / 'system' -> 真正写进 data-theme 的 'light' / 'dark'
const resolveTheme = mode => {
	if (mode !== 'system') return mode === 'dark' ? 'dark' : 'light'
	const dark =
		typeof window !== 'undefined' && typeof window.matchMedia === 'function'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: false
	return dark ? 'dark' : 'light'
}

const applyTheme = mode => {
	if (typeof document === 'undefined') return
	const resolved = resolveTheme(mode)
	document.documentElement.dataset.theme = resolved
	if (playerStore) playerStore.isLight = resolved === 'light'
}

const readSetting = () => {
	try {
		return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}
	} catch {
		return {}
	}
}

// 只动这一个键，别的设置原样保留
const writeSetting = (key, value) => {
	const raw = readSetting()
	raw[key] = value
	try {
		localStorage.setItem(STORE_KEY, JSON.stringify(raw))
	} catch {
		// 隐私模式写不了就算了
	}
}

watch(
	isDark,
	dark => {
		if (typeof document === 'undefined') return
		const theme = dark ? 'dark' : 'light'
		if (playerStore) {
			// App 已经挂载：走 store，由下面 onMounted 里那个 watcher 统一写 data-theme
			playerStore.themeMode = theme
			if (storage) storage.setItem('themeMode', theme)
			else writeSetting('themeMode', theme)
			return
		}
		// App 还没挂载：先自己写，并把文档站的主题当成默认值存下来
		// （不存的话 App 启动时 initConfig 会用默认的 light 再写一遍，把首屏覆盖掉）。
		// 已经存过用户选的主题就不再覆盖，否则设置页里的选择刷新后会被文档站顶掉。
		document.documentElement.dataset.theme = theme
		if (!readSetting().themeMode) writeSetting('themeMode', theme)
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
		{ usePlayerStore },
		{ default: useStorage },
	] = await Promise.all([
		import('../meow/App.vue'),
		import('vue'),
		import('pinia'),
		import('../meow/router/index.js'),
		import('ant-design-vue'),
		// 原版在 main.js 里全局注册了 Drawer，这里自己 createApp 也要注册
		import('../meow/components/Drawer.vue'),
		import('../meow/stores/index.js'),
		import('../meow/hooks/useStorage.js'),
	])

	// meow-player 的全局样式：只在演示真的挂载时才加载
	await Promise.all([
		import('../meow/assets/index.scss'),
		import('../meow/assets/theme/index.css'),
		import('../meow/assets/fonts/iconfont/iconfont.css'),
		import('ant-design-vue/dist/reset.css'),
	])

	const pinia = createPinia()
	instance = createApp(MeowApp)
	instance.use(pinia)
	instance.use(meowRouter)
	instance.use(Antd)
	instance.component('Drawer', Drawer)
	instance.config.errorHandler = (err, _vm, info) => console.error('[meow]', info, err)
	instance.mount(host.value)

	// ---- App 挂载后接管「主题」和「材质」：store 是唯一来源 ----
	// （store 的 initConfig 是异步的：先把它读到的本地值塞回去，免得默认值闪一下。）
	playerStore = usePlayerStore(pinia)
	storage = useStorage().storage
	const saved = readSetting()
	if (saved.themeMode) playerStore.themeMode = saved.themeMode
	if (saved.currentMaterial) playerStore.currentMaterial = saved.currentMaterial

	// 跟随系统：系统明暗一变，只要当前是 system 就重算一次 data-theme
	mql = window.matchMedia('(prefers-color-scheme: dark)')
	onSystemThemeChange = () => {
		if (playerStore.themeMode === 'system') applyTheme('system')
	}
	mql.addEventListener('change', onSystemThemeChange)

	stopThemeWatch = watch(() => playerStore.themeMode, mode => applyTheme(mode), { immediate: true })
	stopMaterialWatch = watch(
		() => playerStore.currentMaterial,
		material => {
			materialClass.value = `meow-mat-${material || 'classic'}`
		},
		{ immediate: true }
	)

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
	stopThemeWatch?.()
	stopMaterialWatch?.()
	if (mql && onSystemThemeChange) mql.removeEventListener('change', onSystemThemeChange)
	mql = null
	onSystemThemeChange = null
	stopThemeWatch = null
	stopMaterialWatch = null
	playerStore = null
	storage = null
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
			<div
				ref="host"
				class="meow-host"
				:class="materialClass"
				:style="{ width: '100%', height: '100%' }"
			/>
		</div>
	</div>
</template>

<style scoped>
/* 舞台：纯色底（不铺壁纸、不铺渐变），只是给缩放后的窗口留个边框余地。
   亮色用亮底；暗色在下面那个全局块里换成暗底。 */
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

/* 画布：真实尺寸 1250×750，靠 transform 缩放（不改内部任何尺寸）。
   这里不写 backdrop-filter：默认材质（classic）就是「不透明纯色窗口」，
   窗口底色由下面的全局块按 data-theme 给，亚克力/云母才会另外加玻璃。 */
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
</style>

<!-- 主题 / 材质相关样式放在「非 scoped」的块里：
     1) 它们都要按 html[data-theme=...] 走，而 scoped 会给选择器挂上 data-v 属性，匹配不上；
     2) 文字色要覆盖 App 的 --primary-text-color，而它定义在 :root[data-theme='light'] 上，
        优先级 (0,2,0) 比 .meow-host 高，所以必须写成 html[data-theme='light'] .meow-host。
     目标：亮色 = 亮底 + 黑字，暗色 = 暗底 + 白字；
     材质只有 .meow-host 上多出 meow-mat-acrylic / meow-mat-mica 时才出玻璃。 -->
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

/* ---- 窗口底色：不透明纯色（默认材质 classic 就长这样，什么都不加）----
   取值用 App 自己的亮/暗底色，跟它的调色板一致。 */
html[data-theme='light'] .meow-host .main_window {
	background-color: #f3f5f7 !important;
}
html[data-theme='dark'] .meow-host .main_window {
	background-color: #232323 !important;
}

/* ---- 材质：只有设置页里选了才生效，默认 classic 不加任何效果 --------------
   材质 class 由 store 的 currentMaterial 驱动，加在 .meow-host 上：
     meow-mat-classic（默认） / meow-mat-acrylic / meow-mat-mica
   classic 故意不写规则 —— 不透明纯色就是它的效果。 */

/* 亚克力：半透明底 + 30px 模糊（Win11 亚克力的观感） */
html[data-theme='light'] .meow-host.meow-mat-acrylic .main_window {
	background-color: rgba(243, 245, 247, 0.55) !important;
	backdrop-filter: blur(30px) saturate(1.6);
	-webkit-backdrop-filter: blur(30px) saturate(1.6);
}
html[data-theme='dark'] .meow-host.meow-mat-acrylic .main_window {
	background-color: rgba(35, 35, 35, 0.55) !important;
	backdrop-filter: blur(30px) saturate(1.6);
	-webkit-backdrop-filter: blur(30px) saturate(1.6);
}

/* 云母：半透明底 + 更重的模糊 + 一层很淡的色调（Win11 云母偏「带底色的雾面」）。
   那层色调用 background-image 的渐变叠，不额外加 DOM，省得挡住内容。 */
html[data-theme='light'] .meow-host.meow-mat-mica .main_window {
	background-color: rgba(243, 245, 247, 0.6) !important;
	background-image: linear-gradient(rgba(120, 140, 190, 0.12), rgba(120, 140, 190, 0.12));
	backdrop-filter: blur(60px) saturate(1.4);
	-webkit-backdrop-filter: blur(60px) saturate(1.4);
}
html[data-theme='dark'] .meow-host.meow-mat-mica .main_window {
	background-color: rgba(35, 35, 35, 0.6) !important;
	background-image: linear-gradient(rgba(150, 170, 220, 0.08), rgba(150, 170, 220, 0.08));
	backdrop-filter: blur(60px) saturate(1.4);
	-webkit-backdrop-filter: blur(60px) saturate(1.4);
}

/* ---- 亚克力 / 云母的关键一步：让「舞台」变半透明 ----------------------------
   之前亚克力之所以不好看，是这里的问题：窗口背后是 .meow-stage 的**不透明纯色**，
   而 backdrop-filter: blur() 糊一块纯色等于没糊（糊完还是同一个颜色），
   看着就只是一块发白的板，不是玻璃。
   把舞台透出来一点、露出文档站的内容当「桌面」，窗口那层 blur 才是真的磨砂玻璃。
   （没有用壁纸图片 —— 只是把背后的内容透出来。） */
html[data-theme='light'] .meow-stage:has(.meow-host.meow-mat-acrylic),
html[data-theme='light'] .meow-stage:has(.meow-host.meow-mat-mica) {
	background: rgba(233, 238, 246, 0.4) !important;
}
html[data-theme='dark'] .meow-stage:has(.meow-host.meow-mat-acrylic),
html[data-theme='dark'] .meow-stage:has(.meow-host.meow-mat-mica) {
	background: rgba(20, 22, 28, 0.4) !important;
}
</style>
