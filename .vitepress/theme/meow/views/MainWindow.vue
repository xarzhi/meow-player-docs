<template>
	<div class="music_box">
		<Top />
		<div class="main_view">
			<router-view v-slot="{ Component }">
				<keep-alive>
					<component :is="Component" />
				</keep-alive>
			</router-view>
		</div>
		<Player></Player>
	</div>
</template>

<script setup>
import Top from '@/components/Top.vue'
import Player from '@/components/Player.vue'
import { onMounted, ref, toRefs } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { getCurrentWindow } from '@tauri-apps/api/window'
import usePlayer from '@hooks/usePlayer.js'

const playerStore = usePlayerStore()
const player = usePlayer()

const { is_app_fullscreen } = toRefs(playerStore)

onMounted(() => {
	window.addEventListener('keydown', async e => {
		const window = getCurrentWindow()
		const isFullScreen = await window.isFullscreen()
		if (e.code === 'Escape' && isFullScreen) {
			window.setFullscreen(false)
			is_app_fullscreen.value = false
		} else if (e.code === 'F11') {
			e.preventDefault()
			playerStore.appToggleFullScreen()
		}
	})
})
</script>

<style scoped lang="scss">
.music_box {
	width: 100vw;
	height: 100vh;
	box-sizing: border-box;
	display: flex;
	flex-flow: column;
	position: relative;
	.main_view {
		flex: 1;
		overflow: auto;
	}
}
</style>
