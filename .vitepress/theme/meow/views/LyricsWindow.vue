<template>
	<div :class="{ lyrics_window: true, isIgnoringMouseEvents, mouseInWin, active }">
		<div class="box" :style="{}">
			<div class="top">
				<div :class="{ lock: true, mouseInBtn }" ref="lockBtn">
					<i class="iconfont icon-jiesuo"></i>
				</div>
			</div>
			<div class="lyricsBox">
				<Transition name="fade" mode="out-in">
					<div class="line" :style="lyricsStyle" :key="currentLine">
						{{ currentLine || '音乐让生活更美好~' }}
					</div>
				</Transition>
			</div>
		</div>
	</div>
</template>

<script setup>
import { listen } from '@tauri-apps/api/event'
import { invoke, getCurrentWindow } from '@utils/api'
import { onMounted, onUnmounted, reactive, ref, toRefs } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { isInside } from '@/utils/utils'

const playerStore = usePlayerStore()

const currentTime = ref(0)
const currentLine = ref('')
const lockBtn = ref(null)
const { isIgnoringMouseEvents } = toRefs(playerStore)
const winRect = ref({})
const mouseInWin = ref(false)
const mouseInBtn = ref(false)
const active = ref(false)
const lyricsStyle = reactive({
	fontSize: '18px',
	color: '#fff',
})
const mousePos = reactive({
	x: 0,
	y: 0,
})
let moveUnlisten = null
let unlisten = null

onMounted(async () => {
	await invoke('start_listen')
	winRect.value = await getWindowRect()

	moveUnlisten = await getCurrentWindow().onMoved(async ({ payload }) => {
		winRect.value = await getWindowRect()
	})
	unlisten = await listen('mouse-event', async event => {
		const m = event.payload
		if (m.kind === 'move') {
			const point = { x: m.x, y: m.y }
			const isIN = isInside(point, winRect.value)
			mousePos.x = m.x
			mousePos.y = m.y
			mouseInWin.value = isIN

			if (isIN) {
				if (lockBtn.value) {
					const btnRect = lockBtn.value.getBoundingClientRect()
					const point = {
						x: mousePos.x - winRect.value.x,
						y: mousePos.y - winRect.value.y,
					}
					const isInBtn = isInside(point, btnRect)
					if (isInBtn) {
						mouseInBtn.value = true
					} else {
						mouseInBtn.value = false
					}
				}
			} else {
			}
		} else if (m.kind === 'press') {
			const point = { x: mousePos.x, y: mousePos.y }
			const isIN = isInside(point, winRect.value)

			if (isIN && lockBtn.value && isIgnoringMouseEvents) {
				const btnRect = lockBtn.value.getBoundingClientRect()
				const point = {
					x: mousePos.x - winRect.value.x,
					y: mousePos.y - winRect.value.y,
				}
				const isInBtn = isInside(point, btnRect)
				active.value = isInBtn
			}
		} else if (m.kind === 'release') {
			active.value = false

			const point = { x: mousePos.x, y: mousePos.y }
			const isIN = isInside(point, winRect.value)

			if (isIN && lockBtn.value && isIgnoringMouseEvents) {
				const btnRect = lockBtn.value.getBoundingClientRect()
				const point = {
					x: mousePos.x - winRect.value.x,
					y: mousePos.y - winRect.value.y,
				}
				const isInBtn = isInside(point, btnRect)

				if (isInBtn) {
					toggleLock()
				}
			}
		}
	})
	// 更新当前歌曲信息
	await listen('updateCurrentInfo', e => {
		playerStore.currentSong = e.payload.currentSong
		playerStore.currentLyrics = e.payload.currentLyrics
	})
	// 监听播放时间
	await listen('updateCurrentTime', e => {
		currentTime.value = e.payload.currentTime
		updateCurrentLyricsLine()
	})

	window.addEventListener('dblclick', e => {
		e.preventDefault()
	})
})

const updateCurrentLyricsLine = () => {
	console.log(playerStore.currentLyrics)
	playerStore.currentLyrics.forEach((item, index) => {
		const [word] = item.words
		if (currentTime.value > word.startTime && currentTime.value < word.endTime) {
			currentLine.value = word.word
		}
	})
}

const startListen = async () => {}

const stopListen = () => {
	unlisten && unlisten()
	unlisten = null
}

const getWindowRect = async () => {
	const win = await getCurrentWindow()
	const winSize = await win.innerSize()

	const outer = await win.outerPosition()

	return {
		x: outer.x,
		y: outer.y,
		width: winSize.width,
		height: winSize.height,
	}
}
const toggleLock = async () => {
	const appWindow = getCurrentWindow()
	await appWindow.setIgnoreCursorEvents(!isIgnoringMouseEvents.value)
	isIgnoringMouseEvents.value = !isIgnoringMouseEvents.value
}
onUnmounted(() => {
	unlisten && unlisten()
	unlisten = null
	moveUnlisten && moveUnlisten()
	moveUnlisten = null
})
</script>

<style lang="scss" scoped>
.lyrics_window {
	width: 100vw;
	height: 100vh;
	border-radius: 5px;
	overflow: hidden;
	background-color: transparent;
	display: flex;
	flex-flow: column;
	-webkit-app-region: drag;
	color: #fff;
	.box {
		width: 100%;
		height: 100%;
		border-radius: 5px;
		padding: 5px;
		transition: background-color 0.2s;
		transition-delay: 1s;
		&:hover {
			.lock {
				opacity: 1;
			}
		}
	}
	.top {
		width: 100%;
		display: flex;
		justify-content: center;
		.lock {
			width: 24px;
			height: 24px;
			border-radius: 5px;
			display: flex;
			justify-content: center;
			align-items: center;
			cursor: pointer;
			-webkit-app-region: no-drag;
			opacity: 0;
			transition:
				opacity 0.2s,
				background-color 0.2s;
			background-color: rgba($color: #000000, $alpha: 0.2);

			i {
				color: #fafafa;
				font-size: 12px;
			}

			&:hover {
				background-color: rgba($color: #000000, $alpha: 0.4);
			}
			&:active {
				background-color: rgba($color: #000000, $alpha: 0.6);
				transform: scale(0.95);
			}
			&.mouseInBtn {
				background-color: rgba($color: #000000, $alpha: 0.4);
			}
		}
	}
	.lyricsBox {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-top: 20px;
		position: relative;

		.line {
			position: relative;
			white-space: nowrap;
		}
	}

	&.active {
		.lock {
			opacity: 1;
			background-color: rgba($color: #000000, $alpha: 0.5) !important;
			transform: scale(0.95);
		}
	}
	&.isIgnoringMouseEvents {
		.box {
			background-color: transparent;
			box-shadow: none;

			.lock {
				opacity: 0;
			}
		}
	}
	&.mouseInWin {
		.box {
			background-color: rgba($color: #000000, $alpha: 0.2);
			transition-delay: 0s;
		}
		&.isIgnoringMouseEvents {
			.box {
				background-color: transparent;
				box-shadow: none;
			}
		}
		.lock {
			opacity: 1 !important;
		}
	}
}
.fade-enter-active,
.fade-leave-active {
	transition:
		opacity 0.2s ease-out,
		margin-top 0.2s ease-out;
}

.fade-enter-from {
	opacity: 0;
	margin-top: 10px;
}

.fade-leave-to {
	opacity: 0;
	margin-top: -20px;
}
</style>
<style>
html,
body {
	background-color: transparent !important;
}
body.cursor-pointer {
	cursor: pointer;
}
</style>
