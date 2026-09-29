<template>
	<div class="common scroll_bar">
		<div class="setting_box">
			<Collapse :collapse="isDark">
				<template #header>
					<div class="single_set">
						<div class="left">
							<div class="title">主题色</div>
						</div>
					</div>
					<div class="themeItem_box" style="margin-bottom: 20px">
						<button
							v-for="(item, index) in themeList"
							:key="index"
							:class="{
								materialItem: true,
								active: themeMode === item.themeColor,
							}"
							@click="changeThemeColor(item.themeColor)"
						>
							{{ item.label }}
						</button>
					</div>
				</template>
				<div class="single_set">
					<div class="left">
						<div class="title">暗色主题暗色程度</div>
						<div class="desc">切换为暗色主题时，背景变暗的程度，默认为0.2</div>
					</div>
					<div class="right">
						<a-slider
							v-model:value="darkness"
							:min="0"
							:max="1"
							style="width: 200px"
							:step="0.1"
							@change="darknessChange"
						/>
					</div>
				</div>
			</Collapse>
		</div>
		<div class="setting_box">
			<div class="single_set">
				<div class="left">
					<div class="title">材质</div>
				</div>
			</div>
			<div class="material_box">
				<button
					v-for="(item, index) in materialList"
					:key="index"
					:disabled="needBg"
					:class="{
						materialItem: true,
						active: currentMaterial === item.material,
					}"
					@click="changeMaterial(item.material)"
				>
					{{ item.label }}
				</button>
			</div>
		</div>
		<div class="setting_box bg">
			<Collapse :collapse="needBg">
				<template #header>
					<div class="single_set">
						<div class="left">
							<div class="title">壁纸</div>
						</div>
						<div class="right">
							<a-switch v-model:checked="needBg" @change="needBgChange"></a-switch>
						</div>
					</div>
				</template>
				<div class="collapse_box">
					<div class="drop_box">
						<Drop
							title="点击或拖入文件以添加壁纸"
							@selected="selected"
							:extensions="['jpg', 'jpeg', 'png', 'gif', 'mp4', 'png']"
							multiple
						>
							<template #desc>
								<div class="desc">支持格式：jpg、jpeg、png、gif、mp4</div>
							</template>
						</Drop>
					</div>
					<a-spin :spinning="bgLoading">
						<div class="bgList scroll_bar" ref="bgListRef" @mouseleave="bgListMouseLeave">
							<div
								class="active_bd"
								v-if="backgrounds.length"
								:style="{
									left: active_bd.left + 'px',
									top: active_bd.top + 'px',
									width: active_bd.width + 'px',
									height: active_bd.height + 'px',
								}"
							>
								<div class="tl"></div>
								<div class="tr"></div>
								<div class="bl"></div>
								<div class="br"></div>
							</div>
							<div
								:class="{ bgItem: true, active: item.path === playerStore.currentBgItem.path }"
								v-for="(item, index) in backgrounds"
								:data-path="item.path"
								:key="index"
								ref="bgItem"
								@click="handleChangeWallpaper($event, item)"
								@mouseenter="bgItemMouseEnter"
							>
								<MediaItem :item="item"></MediaItem>
								<div class="delete" @click.stop="handleDeleteBg(item)">
									<i class="iconfont icon-delete"></i>
								</div>
								<div class="assetsType">
									<i :class="['iconfont', item.kind === 'img' ? 'icon-picture' : 'icon-video']"></i>
								</div>
							</div>
							<i v-for="_ in 4"></i>
						</div>
					</a-spin>

					<div class="single_set">
						<div class="left">
							<div class="title">
								<span style="margin-right: 5px">自适应主题</span>
								<a-popover placement="top">
									<template #content>
										<div class="pop" style="padding: 5px 10px">
											根据图片所有像素值求取平均值判断明暗，自动切换明暗主题<br />
											若壁纸为视频，则获取视频第一帧的图片像素值计算
										</div>
									</template>
									<i class="iconfont icon-question" style="font-size: 14px; cursor: pointer"> </i>
								</a-popover>
							</div>

							<div class="desc">根据壁纸颜色自动切换明/暗主题</div>
						</div>
						<div class="right">
							<a-switch v-model:checked="adaptive"></a-switch>
						</div>
					</div>
					<div class="single_set">
						<div class="left">
							<div class="title">壁纸自动切换</div>
							<div class="desc"></div>
						</div>
						<div class="right">
							<a-switch
								v-model:checked="needAutoChangeBg"
								@change="playerStore.setAutoChangeBg(needAutoChangeBg)"
							></a-switch>
						</div>
					</div>
					<div class="single_set">
						<div class="left">
							<div class="title">壁纸换时间间隔</div>
							<div class="desc"></div>
						</div>
						<div class="right">
							<a-input
								:min="0"
								v-model:value="timeGap"
								type="number"
								style="margin-right: 10px; width: 80px"
								:disabled="!needAutoChangeBg"
								@change="timeGapChange"
							></a-input>
							<a-select
								:options="playerStore.unitOptions"
								v-model:value="timeUnit"
								type="number"
								style="width: 80px"
								:disabled="!needAutoChangeBg"
								@change="timeUnitChange"
							></a-select>
						</div>
					</div>
					<div class="single_set">
						<div class="left">
							<div class="title">壁纸切换模式</div>
							<div class="desc"></div>
						</div>
						<div class="right">
							<a-select
								:options="changeModeOptions"
								v-model:value="changeMode"
								type="number"
								style="width: 170px"
								:disabled="!needAutoChangeBg"
								@change="changeModeChange"
							></a-select>
						</div>
					</div>
				</div>
			</Collapse>
		</div>
		<div class="setting_box">
			<div class="single_set">
				<div class="left">
					<div class="title">液态玻璃效果</div>
				</div>
				<div class="right">
					<a-switch></a-switch>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { open } from '@tauri-apps/plugin-dialog'
import useStorage from '@/hooks/useStorage'
import { onMounted, reactive, toRefs, ref, onUnmounted, watch } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@utils/api'
import useWallpaperTheme from '@/hooks/useWallpaperTheme'
import Collapse from '@/components/Collapse.vue'
import Drop from '@/components/Drop.vue'
import MediaItem from '@/components/MediaItem.vue'

const window = getCurrentWindow()
const playerStore = usePlayerStore()
const wallpaperTheme = useWallpaperTheme()
const { storage } = useStorage()
const {
	needBg,
	currentMaterial,
	themeMode,
	timeGap,
	timeUnit,
	changeMode,
	needAutoChangeBg,
	adaptive,
	darkness,
} = toRefs(playerStore)

const backgrounds = ref([])
const bgLoading = ref(false)
const isDark = ref(false)
const bgItem = ref(null)
const bgListRef = ref(null)
const observer = ref(null)
// “跟随系统”用的 matchMedia（挂载时建，卸载时摘掉监听）
let mql = null
const active_bd = reactive({
	left: 0,
	top: 0,
	width: 0,
	height: 0,
})
const realActiveBd = reactive({
	left: 0,
	top: 0,
})
const tempActiveBd = reactive({
	left: 0,
	top: 0,
})
const changeModeOptions = [
	{ value: 'next', label: '顺序切换' },
	{ value: 'random', label: '随机切换' },
]
onMounted(async () => {
	await loadBackgrounds()
	observer.value = new ResizeObserver(entries => {
		setActiveBgPos()
	})
	observer.value.observe(bgListRef.value)
	isDark.value = resolveThemeMode(playerStore.themeMode) === 'dark'
	// “跟随系统”要监听系统明暗的变化（globalThis：全局 window 被上面的同名变量盖住了）
	mql = globalThis.matchMedia('(prefers-color-scheme: dark)')
	mql.addEventListener('change', onSystemThemeChange)
})

onUnmounted(() => {
	observer.value.disconnect()
	mql?.removeEventListener('change', onSystemThemeChange)
	mql = null
})

watch(
	() => playerStore.currentBgItem,
	() => {
		setActiveBgPos()
	}
)

const darknessChange = val => {
	document.documentElement.style.setProperty('--darkness', val)
	storage.setItem('darkness', val)
}

const setActiveBgPos = () => {
	const active = bgItem.value.find(item => item.dataset.path === playerStore.currentBgItem.path)
	const rect = active.getBoundingClientRect()

	active_bd.width = rect.width + 8
	active_bd.height = rect.height + 8
	active_bd.left = active.offsetLeft - 4
	active_bd.top = active.offsetTop - 4
	realActiveBd.left = active.offsetLeft - 4
	realActiveBd.top = active.offsetTop - 4
}

// 设置窗口材质
const setEffects = async material => {
	try {
		await getCurrentWindow().setEffects({
			effects: [material],
			state: 'active',
			radius: 12,
		})
	} catch (err) {
		console.log(err)
	}
}
const selected = async paths => {
	const res = await invoke('add_backgrounds', { paths })
	if (res) {
		loadBackgrounds()
	}
}
const changeMaterial = material => {
	currentMaterial.value = material
	storage.setItem('currentMaterial', material)
	// 经典 = 不透明纯色窗口，不去向原生窗口要任何材质效果
	if (material !== 'classic') setEffects(material)
}

const needBgChange = val => {
	storage.setItem('needBg', val)
}

const timeGapChange = e => {
	storage.setItem('timeGap', e.target.value)
}
const timeUnitChange = val => {
	storage.setItem('timeUnit', val)
}
const changeModeChange = val => {
	storage.setItem('changeMode', val)
}

// light / dark / system -> 真正写进 data-theme 的 light / dark
// 注意：这个文件顶部 `const window = getCurrentWindow()` 把全局 window 盖掉了，
// 所以这里必须用 globalThis.matchMedia，写成 window.matchMedia 会报「不是函数」。
const resolveThemeMode = mode => {
	if (mode !== 'system') return mode === 'dark' ? 'dark' : 'light'
	return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
// 主题只认 html 上的 data-theme（绝不能写成 html.dark —— 那是文档站的类）
const applyThemeMode = mode => {
	const resolved = resolveThemeMode(mode)
	document.documentElement.dataset.theme = resolved
	playerStore.isLight = resolved === 'light'
	isDark.value = resolved === 'dark'
}
// 系统明暗变了：只有当前是“跟随系统”才重算
const onSystemThemeChange = () => {
	if (playerStore.themeMode === 'system') applyThemeMode('system')
}

const changeThemeColor = themeColor => {
	// 复用原逻辑：写 store / localStorage / isLight，并通知原生窗口和迷你播放器
	wallpaperTheme.changeTheme(themeColor)
	// 但 hook 里 'system' 那一支把 matchMedia 的结果写反了、也不会监听系统变化，
	// 所以这里按 themeMode 再统一重算一次 data-theme
	// （PlayerDemo 里还有一份全局的 watcher + 系统监听，两边算出来是一样的）。
	applyThemeMode(themeColor)
}
const bgItemMouseEnter = e => {
	tempActiveBd.left = event.target.offsetLeft - 4
	tempActiveBd.top = event.target.offsetTop - 4
	active_bd.top = tempActiveBd.top
	active_bd.left = tempActiveBd.left
}
const handleChangeWallpaper = (e, item) => {
	wallpaperTheme.changeBg(item)
	const active = bgItem.value.find(item => item.dataset.path === playerStore.currentBgItem.path)

	realActiveBd.left = active.offsetLeft - 4
	realActiveBd.top = active.offsetTop - 4
	active_bd.top = realActiveBd.top
	active_bd.left = realActiveBd.left
}
const bgListMouseLeave = () => {
	active_bd.top = realActiveBd.top
	active_bd.left = realActiveBd.left
}
const addBg = () => {
	open({
		multiple: true,
		directory: false,
		title: '请选择背景文件',
		filters: [
			{
				name: 'Audio Files',
				extensions: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'png'],
			},
		],
	}).then(async paths => {
		const res = await invoke('add_backgrounds', { paths })
		if (res) {
			loadBackgrounds()
		}
	})
}
const loadBackgrounds = async () => {
	bgLoading.value = true
	try {
		const list = await invoke('get_backgrounds')
		backgrounds.value = list
		bgLoading.value = false
	} catch (err) {
		console.log(err)
		bgLoading.value = false
	}
}

const handleDeleteBg = async item => {
	const res = await invoke('delete_bg_by_id', { item })
	if (res) {
		loadBackgrounds()
	}
}

const materialList = [
	{
		label: '亚克力',
		material: 'acrylic',
	},
	{
		label: '云母',
		material: 'mica',
	},
	{
		label: '经典',
		material: 'classic',
	},
]
const themeList = [
	{
		label: '浅色',
		themeColor: 'light',
	},
	{
		label: '深色',
		themeColor: 'dark',
	},
	{
		label: '跟随系统',
		themeColor: 'system',
	},
]
</script>

<style lang="scss" scoped>
.common {
	padding: 10px 10px;
	height: 100%;
	overflow: auto;
	.setting_box {
		border-radius: 8px;
		padding: 10px 30px;
		margin-bottom: 20px;
		background-color: var(--setting-box-bg);
		box-shadow: 1px 1px 5px 0 rgba($color: #000000, $alpha: 0.1);
		backdrop-filter: blur(10px);
		box-sizing: border-box;

		.line {
			border-bottom: 1px solid #fafafa;
		}

		.single_set {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 10px 0;
			.left {
				.title {
					font-weight: 600;
					color: var(--primary-text-color);
					height: 100%;
					display: flex;
					align-items: center;
				}
				.desc {
					color:var(--sub-text-color);
					margin-top: 5px;
					font-size: 14px;
				}
			}
			.right {
				display: flex;
			}
		}
		.drop_box {
			margin-bottom: 10px;
		}
		.themeItem_box,
		.material_box {
			display: flex;
			justify-content: space-between;
			.themeItem,
			.materialItem {
				height: 50px;
				border-radius: 5px;
				border: 1px solid #000;
				cursor: pointer;
				display: flex;
				justify-content: center;
				align-items: center;
				flex: 1;
				background-color: transparent;

				&:nth-child(-n + 2) {
					margin-inline-end: 10px;
				}
				transition:
					border 0.2s,
					color 0.2s;
				&:hover {
					border: 1px solid lighten($color: #1677ff, $amount: 10);
					color: lighten($color: #1677ff, $amount: 10);
				}
				&.active {
					border: 1px solid #1677ff;
					color: #1677ff;
				}

				&[disabled] {
					height: 50px;
					border-radius: 5px;
					border: 1px solid gray;
					color: gray;
					cursor: not-allowed;
					&:hover {
						border: 1px solid gray;
						color: gray;
					}
				}
			}
		}
		.bgList {
			height: 500px;
			overflow-y: auto;
			overflow-x: hidden;
			margin-bottom: 10px;
			position: relative;
			padding: 5px;
			box-sizing: border-box;
			display: flex;
			flex-flow: wrap;
			justify-content: space-between;
			align-content: start;
			& > i {
				width: 23%;
			}
			.bgItem {
				width: 23%;
				border-radius: 5px;
				overflow: hidden;
				cursor: pointer;
				position: relative;
				z-index: 2;
				margin-bottom: 10px;
				aspect-ratio: 16 / 9;
				img,
				video {
					width: 100%;
					height: 100%;
					object-fit: cover;
					transition: transform 0.2s;
				}
				&:hover {
					.delete {
						opacity: 1;
					}
				}
				.assetsType {
					position: absolute;
					top: 10px;
					background-color: rgba($color: #000, $alpha: 0.5);
					border-radius: 3px;
					left: 10px;
					width: 30px;
					height: 30px;
					display: flex;
					justify-content: center;
					align-items: center;
					color: #fff;
				}
				.delete {
					position: absolute;
					transition: opacity 0.3s;
					opacity: 0;
					right: 10px;
					top: 10px;
					width: 30px;
					height: 30px;
					border-radius: 3px;
					background-color: rgba($color: #fff, $alpha: 0.8);
					display: flex;
					justify-content: center;
					align-items: center;
					transition: background-color 0.2s;
					border: 1px solid rgba($color: #fff, $alpha: 0.8);

					i {
						color: #333;
						transition: color 0.2s;
					}
					&:hover {
						background-color: rgba($color: #000, $alpha: 0.6);
						border: 1px solid #fff;

						i {
							color: #fff;
						}
					}
				}
			}
			.active_bd {
				position: absolute;
				z-index: 1;
				transition:
					left 0.3s,
					top 0.3s;
				& > div {
					position: absolute;
					border-color: var(--primary-text-color);
					transition: border-color 0.3s;
					border-width: 2px;
					width: 20px;
					height: 20px;
				}
				.tl {
					top: 0;
					left: 0;
					border-top-style: solid;
					border-left-style: solid;
				}
				.tr {
					top: 0;
					right: 0;
					border-top-style: solid;
					border-right-style: solid;
				}
				.bl {
					bottom: 0;
					left: 0;
					border-bottom-style: solid;
					border-left-style: solid;
				}
				.br {
					bottom: 0;
					right: 0;
					border-bottom-style: solid;
					border-right-style: solid;
				}
			}
		}
	}
}
</style>
