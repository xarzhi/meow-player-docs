<template>
	<div class="main_window">
		<router-view v-slot="{ Component }">
			<transition name="slide">
				<component :is="Component" :key="transiKey" />
			</transition>
		</router-view>
		<div class="bg_box" v-if="playerStore.needBg && currentWin.label === 'main'">
			<Transition name="fade">
				<div class="bg" :key="playerStore.currentBgItem.id">
					<img
						class="bgItem"
						:src="formatPath(playerStore.currentBgItem.path)"
						v-if="playerStore.currentBgItem.kind === 'img'"
						@error="error"
					/>
					<video
						class="bgItem"
						:src="formatPath(playerStore.currentBgItem.path)"
						v-else-if="playerStore.currentBgItem.kind === 'video'"
						autoplay
						muted
						Loop
						@error="error"
					/>
				</div>
			</Transition>
		</div>
	</div>
</template>

<script setup>
import { invoke } from '@tauri-apps/api/core'
import { onMounted, watch, ref } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { convertFileSrc } from '@utils/api'
import { useRoute } from 'vue-router'
import { getCurrentWebviewWindow } from '@utils/api'

const route = useRoute()
const playerStore = usePlayerStore()
const transiKey = ref('')
const currentWin = ref(null)

onMounted(async () => {
	requestAnimationFrame(() => {
		invoke('show_window')
	})
	currentWin.value = await getCurrentWebviewWindow()
})

watch(route, n => {
	if (n.path.includes('/main_window/main')) {
		transiKey.value = 'a'
	} else if (n.path.includes('/setting')) {
		transiKey.value = 'b'
	}
})

playerStore.initConfig()

const formatPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}

const error = e => {
	console.log(e)
	event.target.style.display = 'none'
}
window.addEventListener('unhandledrejection', event => {
	console.error('[Unhandled Promise]', event.reason, event)
})
</script>

<style lang="scss" scoped>
.main_window {
	width: 100%;
	height: 100%;
	position: relative;
	.bg_box {
		position: absolute;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		z-index: -1;
		top: 0;
		left: 0;
		.bg {
			width: 100%;
			height: 100%;
			.bgItem {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}
	}
}
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}
.fade-leave-active {
	position: absolute;
	inset: 0;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
	transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-leave-active {
	position: absolute;
	inset: 0;
}
.slide-enter-from {
	opacity: 0;
}

.slide-leave-to {
	opacity: 0;
	// display: none;
}
</style>
