<template>
	<div
		:data-tauri-drag-region="dragRegion"
		:class="{
			topbar: true,
			top: true,
			is_player_fullscreen,
		}"
	>
		<div class="left">
			<div class="logo_box" v-if="!is_player_fullscreen">
				<div class="logo" @click="toggleMenu" @dblclick="toggleFullScreen">
					<img src="/logo.png" alt="" />
				</div>
				<div class="title">Meow Player</div>
			</div>
			<div class="btn_box">
				<div :class="{ back_btn: true, light_icon: is_player_fullscreen }" @click="back" v-if="backBtnShow">
					<i class="iconfont icon-left-arrow"></i>
				</div>
				<div
					:class="{ 'titlebar-button': true, light_icon: is_player_fullscreen }"
					@click="down"
					v-if="is_player_fullscreen"
				>
					<i class="iconfont icon-down-arrow"></i>
				</div>
			</div>
		</div>

		<div class="right">
			<div
				:class="{ 'titlebar-button': true, theme: true, light_icon: is_player_fullscreen }"
				v-if="!is_player_fullscreen"
				@click="changeTheme()"
			>
				<div
					class="rotate_box"
					:style="{
						transform: `rotate(${isLight ? 0 : 180}deg)`,
					}"
				>
					<i class="iconfont icon-light"></i>
					<i class="iconfont icon-dark"> </i>
				</div>
			</div>
			<div
				:class="{ 'titlebar-button': true, setting: true, light_icon: is_player_fullscreen, setting_btn: true }"
				v-if="!is_player_fullscreen"
				@click="gotoSetting"
			>
				<i class="iconfont icon-setting" v-if="isHome"> </i>
				<i class="iconfont icon-home" v-else> </i>
			</div>
			<div
				:class="{ 'titlebar-button': true, theme: true, light_icon: is_player_fullscreen }"
				id="titlebar-minimize"
				@click="minimize"
			>
				<i class="iconfont icon-minimize"></i>
			</div>
			<div
				:class="{ 'titlebar-button': true, theme: true, light_icon: is_player_fullscreen }"
				id="titlebar-maximize"
				@click="toggleMaximize"
			>
				<i class="iconfont icon-maximize"></i>
			</div>
			<div
				:class="{ 'titlebar-button': true, theme: true, light_icon: is_player_fullscreen }"
				id="titlebar-close"
				@click="close"
			>
				<i class="iconfont icon-close"></i>
			</div>
		</div>
	</div>
</template>

<script setup>
import { Window } from '@tauri-apps/api/window'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/index.js'
import { computed, ref, toRefs, watch } from 'vue'
import useStorage from '@/hooks/useStorage'
import useWallpaperTheme from '@/hooks/useWallpaperTheme'
import { getCurrentWindow } from '@tauri-apps/api/window'

const wallpaperTheme = useWallpaperTheme()
const playerStore = usePlayerStore()
const router = useRouter()
const route = useRoute()
const { storage } = useStorage()

const dragRegion = ref(true)
const { is_player_fullscreen, isLight, isWindowAllwaysOntop, menuCollapase } = toRefs(playerStore)

const appWindow = new Window('main')

const isHome = computed(() => {
	return route.path.includes('/main_window/main')
})
const backBtnShow = computed(() => {
	const path =
		route.path.includes('setting') ||
		route.path === '/main_window/main/album' ||
		route.path === '/main_window/main/artist'
	return path && !is_player_fullscreen.value
})

watch(
	() => playerStore.is_app_fullscreen,
	newV => {
		dragRegion.value = !newV
	}
)

const down = () => {
	is_player_fullscreen.value = false
}

const back = () => {
	if (route.path.includes('setting')) {
		router.push('/main_window/main/musiclist')
	} else if (route.path === '/main_window/main/album') {
		router.push('/main_window/main/albumlist')
	} else if (route.path === '/main_window/main/artist') {
		router.push('/main_window/main/artistlist')
	}
}

const gotoSetting = () => {
	const path = isHome.value ? '/main_window/setting' : '/main_window/main/musiclist'
	router.push(path)
}

const minimize = () => {
	appWindow.minimize()
}
let timer = null

const delay = 200

const toggleMenu = () => {
	clearTimeout(timer)
	timer = setTimeout(async () => {
		timer = null
		menuCollapase.value = !menuCollapase.value
		storage.setItem('menuCollapase', menuCollapase.value)
	}, delay)
}
const toggleFullScreen = async () => {
	clearTimeout(timer)
	timer = null
	const window = getCurrentWindow()
	const isAlwaysOnTop = await window.isAlwaysOnTop()
	await window.setAlwaysOnTop(!isAlwaysOnTop)
	storage.setItem('isWindowAllwaysOntop', isWindowAllwaysOntop.value)
}

const toggleMaximize = () => {
	appWindow.toggleMaximize()
}

const close = () => {
	if (playerStore.closeBehavior === 'tray') {
		appWindow.hide()
	} else {
		appWindow.close()
	}
}
const changeTheme = () => {
	const theme = playerStore.themeMode === 'dark' ? 'light' : 'dark'
	wallpaperTheme.changeTheme(theme)
}
</script>

<style lang="scss" scoped>
.top {
	box-shadow: var(--top-shaow);
	position: relative;
	z-index: 1;
	padding-right: 20px;
	box-sizing: border-box;
	width: 100%;
}

.topbar {
	height: var(--top-height);
	background: var(--top-bg-color);
	border-bottom: 1px solid var(--top-border-color);
	user-select: none;
	display: flex;
	justify-content: space-between;
	align-items: center;
	transition: all 0.3s;
}

.left {
	display: flex;
	box-sizing: border-box;
	flex-shrink: 0;

	.logo_box {
		width: 218px;
		display: flex;
		align-items: center;
		padding-left: 12px;
		.logo {
			width: 35px;
			height: 35px;
			margin-right: 10px;
			border-radius: 5px;
			overflow: hidden;
			display: flex;
			justify-content: center;
			align-items: center;
			// background-color: #fff;
			cursor: pointer;
			filter: drop-shadow(1px 1px 3px rgba(255, 255, 255, 0.3));
			img {
				width: 28px;
				height: 28px;
			}
			&:hover {
				background-color: rgba($color: #000000, $alpha: 0.2);
			}
			&:active {
				transform: scale(0.98);
				background-color: rgba($color: #000000, $alpha: 0.4);
			}
		}
		.title {
			color: var(--primary-text-color);
			font-family: 'Comfortaa';
			font-size: 14px;
		}
	}
	.btn_box {
		padding-left: 10px;
	}
}

.is_player_fullscreen {
	background-color: transparent;
	box-shadow: none;
	border-bottom: none;
}

.right {
	display: flex;
	align-items: center;
}
.back_btn {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 36px;
	height: 36px;
	cursor: pointer;

	i {
		transition: text-shadow 0.3s;
		color: var(--primary-text-color);
	}

	&:hover {
		i {
			text-shadow: 0 0 5px #ddd;
		}
	}
}
.titlebar-button {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 36px;
	height: 36px;
	user-select: none;
	-webkit-user-select: none;
	border-radius: 5px;
	cursor: pointer;
	overflow: hidden;
	transition: all 0.1s;

	i {
		transition: color 0.3s;
		color: var(--primary-text-color);
	}

	&:hover {
		background: var(--icon-bg-color);
	}

	&:active {
		transform: scale(0.9);
	}
}

.setting,
.theme {
	i {
		font-size: 16px;
	}
}
@keyframes rotate {
	0% {
		transform: rotate(0);
	}
	100% {
		transform: rotate(360deg);
	}
}
.setting_btn {
	&:hover {
		.icon-setting {
			animation: rotate 1s;
		}
	}
}

@keyframes ro {
	0% {
		transform: rotate(0);
	}
	100% {
		transform: rotate(360deg);
	}
}
.rotate_box {
	width: 100%;
	height: 100%;
	transition: transform 0.3s;
	transform: rotate(180deg);
	transform-origin: bottom center;
	i {
		width: 100%;
		height: 100%;
		display: block;
		display: flex;
		justify-content: center;
		align-items: center;
		&.icon-dark {
			transform: rotate(180deg);
		}
	}
}
</style>
