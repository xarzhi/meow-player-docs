<template>
	<div class="amll_player_box">
		<div class="lyrics_box">
			<LyricPlayer
				class="lyric-player"
				:lyric-lines="playerStore.currentLyrics"
				:maskObsceneWordsMode="{}"
				:currentTime
				:playing
				:alignPosition="0.5"
				:enable-spring="false"
				ref="lyricPlayerRef"
				@line-click="lineClick"
				alignAnchor="center"
				:enableBlur="true"
			/>
		</div>
	</div>
</template>

<script setup>
import { LyricPlayer } from '@applemusic-like-lyrics/vue'
import { ref, onMounted, onUnmounted, watch, toRef, toRefs, shallowRef, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { parseBuffer } from 'music-metadata'
import { invoke, Window, WebviewWindow, listen } from '@utils/api.js'
import { parseLrc } from '@applemusic-like-lyrics/lyric'
import '@applemusic-like-lyrics/core/style.css'
import usePlayer from '@hooks/usePlayer.js'

const playerStore = usePlayerStore()
const currentTime = ref(0)
const emit = defineEmits(['lyricsClicked', 'jumpLyrics'])
let frameId = 0
const playing = ref(false)

onMounted(() => {
	listen('progress_start', () => {
		playing.value = true
		cancelAnimationFrame(frameId)
		onFrame()
	})
	listen('start', () => {
		playing.value = true
		cancelAnimationFrame(frameId)
		onFrame()
	})
	listen('pause', () => {
		playing.value = false
		cancelAnimationFrame(frameId)
	})
	if (playerStore.playState === 'playing') {
		playing.value = true
		cancelAnimationFrame(frameId)
		onFrame()
	}
})

const lineClick = e => {
	const line = e.line.getLine()
	const startTime = line.startTime / 1000
	invoke('try_seek', { pos: startTime, path: playerStore.currentSong.path })
}

function onFrame() {
	currentTime.value = Math.round(playerStore.currentTime)
	if (playing.value) frameId = requestAnimationFrame(onFrame)
}
onBeforeUnmount(() => cancelAnimationFrame(frameId))
</script>

<style lang="scss" scoped>
.amll_player_box {
	height: 100%;
	display: flex;
	align-items: center;
	.lyrics_box {
		height: calc(100% - var(--player-height) - var(--top-height) - 50px);
		width: 100%;
		position: relative;
		mask-image: linear-gradient(to bottom, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%);

		.lyric-player {
			height: 100%;
			width: 100%;
			font-size: 12px !important;
			position: relative;
			z-index: 1;
			:deep(._lyricMainLine_1g3au_99) {
				font-size: 24px;
				line-height: 22px;
			}
		}
	}
}
</style>
