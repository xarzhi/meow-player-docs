<template>
	<div class="mini-player" :data-theme="themeMode">
		<div class="player_box">
			<ProgressBorder
				:radius="4"
				:stroke-width="1.5"
				progress-color="#00ffae"
				:glow="true"
				:padding="0"
				:progress="ratio"
			>
				<div class="player">
					<div class="left">
						<div class="img_box">
							<Transition name="fade">
								<img
									data-tauri-drag-region
									:key="playerStore.currentSong.id"
									v-if="playerStore.currentSong.id"
									:src="convertFileSrc(playerStore.currentSong.cover)"
								/>
								<img data-tauri-drag-region v-else src="../assets/images/logo.png" alt="" />
							</Transition>
						</div>
						<div class="info">
							<div class="title">{{ playerStore.currentSong.title }}</div>
							<div class="album">{{ playerStore.currentSong.album }}</div>
						</div>
					</div>
					<div class="right">
						<div class="opt_box">
							<div @click="opt('pre')" class="pre btn">
								<div :class="{ icon: true }">
									<i class="iconfont icon-pre"></i>
								</div>
							</div>
							<div @click="opt('toggleStart')" class="start_pause btn">
								<div :class="{ icon: true }">
									<i
										:class="[
											playerStore.playState === 'playing' ? 'icon-pause' : 'icon-play',
											'iconfont',
										]"
									></i>
								</div>
							</div>
							<div @click="opt('next')" class="next btn">
								<div :class="{ icon: true }">
									<i class="iconfont icon-next"></i>
								</div>
							</div>
						</div>
					</div>
				</div>
			</ProgressBorder>
		</div>
	</div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/index.js'
import { onMounted, onUnmounted, toRefs, ref } from 'vue'
import { listen, convertFileSrc, emitTo, invoke, getCurrentWindow } from '@utils/api'
import usePlayer from '@hooks/usePlayer.js'
import ProgressBorder from '@/components/ProgressBorder.vue'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { currentMonitor } from '@tauri-apps/api/window'

const player = usePlayer()
const playerStore = usePlayerStore()
const { playState, themeMode } = toRefs(playerStore)
const deg = ref(0)
const CARD_W = 100,
	CARD_H = 40,
	RADIUS = 8
const PERIMETER = 2 * (CARD_W + CARD_H) - 8 * RADIUS + 2 * Math.PI * RADIUS
const ratio = ref(PERIMETER * (1 - 99 / 100))

let unlisten = null

onMounted(async () => {
	unlisten = await listen('mini-listen', async e => {
		if (e.payload.type === 'created') {
			setPosition('br')
			playerStore.setCurrentSong(e.payload.currentSong)
			ratio.value = PERIMETER * (1 - 0 / 100)
			themeMode.value = e.payload.themeMode
			playState.value = e.payload.playState
		} else if (e.payload.type === 'theme-change') {
			// 主题切换
			themeMode.value = e.payload.themeMode
		} else if (e.payload.type === 'loadTrack') {
			// 切换歌曲
			playerStore.setCurrentSong(e.payload.currentSong)
			playState.value = 'playing'
		} else if (e.payload.type === 'progress') {
			// 进度条
			ratio.value = e.payload.radio
		} else if (e.payload.type === 'toggleStart') {
			// 开始暂停切换
			console.log(e.payload)

			playState.value = e.payload.playState
		}
	})
	await emitTo('main', 'mini-event', {
		type: 'created',
	})
})

const setPosition = async (position = 'br') => {
	const miniWindow = await getCurrentWindow()
	const taskbarHeight = await invoke('get_taskbar_height')

	const miniWindowSize = await miniWindow.innerSize()

	const minitor = await currentMonitor()
	const screenSize = minitor.size
	let x, y
	if (position === 'tl') {
		x = 0
		y = 0
	} else if (position === 'tr') {
		x = screenSize.width - miniWindowSize.width
		y = 0
	} else if (position === 'bl') {
		x = 0
		y = screenSize.height - miniWindowSize.height - taskbarHeight
	} else if (position === 'br') {
		x = screenSize.width - miniWindowSize.width
		y = screenSize.height - miniWindowSize.height - taskbarHeight
	}

	miniWindow.setPosition(new PhysicalPosition(x, y))
}

const opt = async type => {
	await emitTo('main', 'mini-event', {
		type: type,
	})
	if (type === 'toggleStart') {
		playState.value = playState.value === 'playing' ? 'paused' : 'playing'
	}
}

onUnmounted(() => {
	if (unlisten) {
		unlisten()
	}
})
</script>

<style lang="scss" scoped>
.mini-player {
	width: 100vw;
	height: 100vh;
	background-color: transparent;
	padding: 10px;
	box-sizing: border-box;
	&[data-theme='dark'] {
		--player-bg: #333;

		--btn-bg-color: rgba(255, 255, 255, 0.15);
		--btn-hover-color: rgba(255, 255, 255, 0.5);
		--btn-active-color: rgba(255, 255, 255, 0.8);

		--icon-color: #fff;

		--primary-text-color: #fff;
		--sub-text-color: rgba(255, 255, 255, 0.5);
	}
	&[data-theme='light'] {
		--player-bg: #fff;

		--btn-bg-color: rgba(0, 0, 0, 0.2);
		--btn-hover-color: rgba(0, 0, 0, 0.5);
		--btn-active-color: rgba(0, 0, 0, 0.8);

		--icon-color: #333;

		--primary-text-color: #333;
		--sub-text-color: rgba(0, 0, 0, 0.5);
	}
	.player_box {
		position: relative;
		border-radius: 8px;
	}
	.player {
		position: relative;
		z-index: 1;
		overflow: hidden;
		width: 100%;
		height: 100%;
		box-shadow: 0 0 8px 0 rgba($color: #000000, $alpha: 0.5);
		background-color: var(--player-bg);
		display: flex;
		border-radius: 8px;
		overflow: hidden;
		justify-content: space-between;
		align-items: center;
		padding: 8px 10px;
		.left {
			display: flex;
			.img_box {
				height: 45px;
				width: 45px;
				box-shadow: 0 0 8px 0 rgba($color: #000000, $alpha: 0.6);
				border-radius: 4px;
				overflow: hidden;
				margin-right: 10px;
				cursor: move;
				position: relative;

				img {
					width: 100%;
					height: 100%;
					position: absolute;
					inset: 0;
				}
			}
			.info {
				display: flex;
				flex-flow: column;
				justify-content: center;
				.title {
					font-size: 14px;
					color: var(--primary-text-color);
					margin-bottom: 5px;
					width: 120px;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
				.album {
					font-size: 12px;
					color: var(--sub-text-color);
					width: 60px;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
			}
		}
		.right {
			.btn {
				margin-right: 8px;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 30px;
				height: 30px;
				cursor: pointer;
				border-radius: 5px;
				&.start_pause {
					width: 35px;
					height: 35px;
				}
				.icon {
					width: 100%;
					height: 100%;
					display: flex;
					justify-content: center;
					align-items: center;
					transition: all 0.1s;
					border-radius: 5px;
					background: var(--btn-bg-color);
					border: 1px solid var(--btn-border-color);
					i {
						color: var(--icon-color);
					}
					&:hover {
						background: var(--btn-hover-color);
					}

					&:active {
						background: var(--btn-active-color);
					}
				}
			}
			.opt_box {
				display: flex;
				justify-content: center;
				align-items: center;
			}
		}
	}
}
.fade-enter-active,
.fade-leave-active {
	transition:
		opacity 0.5s ease-out,
		margin-top 0.5s ease-out;
}

.fade-enter-from {
	opacity: 0;
	margin-top: 30px;
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
</style>
