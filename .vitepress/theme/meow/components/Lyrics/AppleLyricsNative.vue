<template>
	<div class="amll_player_native">
		<div class="lyrics_box">
			<div class="lyrics" ref="lyricsRef"></div>
		</div>
	</div>
</template>

<script setup>
import { LyricPlayer } from '@applemusic-like-lyrics/core'
import '@applemusic-like-lyrics/core/style.css'
import { usePlayerStore } from '@/stores/index.js'
import { onMounted, onBeforeUnmount, ref, shallowRef, toRefs, watch } from 'vue'
import { invoke, listen } from '@utils/api.js'

const playerStore = usePlayerStore()
const { currentTime } = toRefs(playerStore)

const lyricsRef = ref(null)
const LPlayer = ref(null)
let frameId = 0
let lastFrameTime = -1

onMounted(() => {
	LPlayer.value = new LyricPlayer()
	lyricsRef.value.appendChild(LPlayer.value.getElement())

	LPlayer.value.setOptimizeOptions({}) // 可选
	LPlayer.value.setLyricLines(playerStore.currentLyrics, currentTime.value)
	LPlayer.value.setCurrentTime(Math.floor(currentTime.value), false)
	LPlayer.value.setWordFadeWidth(1)
	LPlayer.value.setAlignAnchor('center')

	LPlayer.value.addEventListener('line-click', event => {
		const line = event.line.getLine()
		const startTime = line.startTime / 1000
		invoke('try_seek', { pos: startTime, path: playerStore.currentSong.path })
		LPlayer.value.resetScroll()
		LPlayer.value.dispatchEvent()
	})

	startFrameLoop()
})

watch(
	() => playerStore.currentLyrics,
	newV => {
		LPlayer.value.setLyricLines(newV, currentTime.value)
		LPlayer.value.update(0)
	}
)

function startFrameLoop() {
	const onFrame = frameTime => {
		const delta = lastFrameTime === -1 ? 0 : frameTime - lastFrameTime
		lastFrameTime = frameTime
		if (playerStore.playState === 'playing') {
			LPlayer.value.setCurrentTime(Math.round(currentTime.value))
		}
		LPlayer.value.update(delta)
		frameId = requestAnimationFrame(onFrame)
	}
	frameId = requestAnimationFrame(onFrame)
}

function stopFrameLoop() {
	cancelAnimationFrame(frameId)
	frameId = 0
	lastFrameTime = -1
}
onBeforeUnmount(() => {
	stopFrameLoop()
	LPlayer.value.dispose()
})
</script>

<style lang="scss" scoped>
.amll_player_native {
	height: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	.lyrics_box {
		height: calc(100% - var(--player-height) - var(--top-height) - 50px);
		width: 100%;
		position: relative;
		mask-image: linear-gradient(to bottom, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%);
		.lyrics {
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
