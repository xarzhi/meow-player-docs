<template>
	<div
		ref="player_box"
		:class="{
			player_box: true,
			fullscreen: is_player_fullscreen,
		}"
	>
		<!-- ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ 全屏背景盒子，包含背景，唱片，歌词 ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓  -->
		<div class="full_box">
			<div class="player_bg_box">
				<Transition name="upDown">
					<PlayerBg v-if="is_player_fullscreen"></PlayerBg>
				</Transition>
			</div>

			<div class="full">
				<div
					:class="{ outer_cover_box: true, fullsideRight: fullSide === 'right' }"
					:style="{ width: fullSide === 'left' ? '100%' : '55%' }"
				>
					<component
						:is="RecordMap.get(recordType)"
						:fullSide="fullSide"
						:is_player_fullscreen="is_player_fullscreen"
						@recordClicked="recordClicked"
					></component>
				</div>
				<div
					class="lyrics_box"
					v-if="is_player_fullscreen"
					:style="{ width: fullSide === 'right' ? '100%' : fullSide === 'left' ? 0 : '45%' }"
				>
					<Lyrics :fullSide />
				</div>
			</div>
		</div>
		<!-- ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ 背景盒子，包含背景，唱片，歌词 ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑   -->

		<!-- ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓  一直处于下放的播放器，包含播放器、按钮 ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓   -->

		<!-- ⬇️⬇️⬇️⬇️⬇️⬇️左边部分⬇️⬇️⬇️⬇️⬇️⬇️ -->
		<div class="outer_box" ref="outer_box">
			<div class="player_box_left box_son">
				<Transition name="disappear">
					<div
						:class="{ fake_cover: true, fullsideRight: fullSide === 'right' }"
						v-if="!is_player_fullscreen || fullSide === 'right'"
					>
						<div class="cover" @click="setPlayerFull">
							<div class="up">
								<i class="iconfont icon-wangshangla"></i>
							</div>
						</div>
					</div>
				</Transition>

				<div class="info">
					<div class="song_title">{{ playerStore.currentSong?.title ?? '' }}</div>

					<div class="song_artist" v-if="!is_player_fullscreen">
						{{ playerStore.currentSong?.artists ?? '' }}
					</div>
					<div class="song_time" v-if="playerStore.currentSong?.pre_time && is_player_fullscreen">
						{{ playerStore.currentSong?.pre_time }}
						/
						{{ playerStore.currentSong?.total_time }}
					</div>
				</div>
			</div>
			<!-- ⬆️⬆️⬆️⬆️⬆️⬆️⬆️左边部分⬆️⬆️⬆️⬆️⬆️⬆️⬆️ -->

			<!-- ⬇️⬇️⬇️⬇️⬇️⬇️中间部分⬇️⬇️⬇️⬇️⬇️⬇️ -->
			<div class="player_box_center box_son" ref="player_box_center">
				<a-tooltip color="#fff">
					<template #title>
						<span style="color: #000">{{ currentMode.title }}</span>
					</template>
					<div @click="player.changeMode" class="mode btn">
						<div :class="{ icon: true, light_icon: is_player_fullscreen }">
							<i :class="[currentMode.icon, 'iconfont']"></i>
						</div>
					</div>
				</a-tooltip>

				<div @click="player.pre" class="pre btn">
					<div :class="{ icon: true, light_icon: is_player_fullscreen }">
						<i class="iconfont icon-pre"></i>
					</div>
				</div>
				<div @click="player.toggleStart" class="start_pause btn">
					<div :class="{ icon: true, light_icon: is_player_fullscreen }">
						<i :class="[playerStore.playState === 'playing' ? 'icon-pause' : 'icon-play', 'iconfont']"></i>
					</div>
				</div>
				<div @click="player.next" class="next btn">
					<div :class="{ icon: true, light_icon: is_player_fullscreen }">
						<i class="iconfont icon-next"></i>
					</div>
				</div>
				<!-- <a-popover placement="topLeft" trigger="click" :arrow="false" v-model:open="playing_list_visible"
                    :get-popup-container="() => player_box_center">
                    <template #content>
                        <Transition name="listhide">
                            <PlayingList  v-if="playing_list_visible" />
                        </Transition>
                    </template> -->
				<div class="playing_list btn" @click="openPlayingList">
					<div :class="{ icon: true, light_icon: is_player_fullscreen }">
						<i class="iconfont icon-playing-list"></i>
					</div>
				</div>
				<!-- </a-popover> -->
			</div>
			<!-- ⬆️⬆️⬆️⬆️⬆️⬆️⬆️中间部分⬆️⬆️⬆️⬆️⬆️⬆️⬆️ -->

			<!-- ⬇️⬇️⬇️⬇️⬇️⬇️右边部分⬇️⬇️⬇️⬇️⬇️⬇️ -->
			<div class="player_box_right box_son">
				<!-- <div class="lyrics btn">
                    <div :class="{ icon: true, light_icon: is_player_fullscreen }">
                        <select name="" id="" @change="changeEffect">
                            <option :value="1">重低音</option>
                            <option :value="2">清晰人声</option>
                        </select>
                    </div>
                </div> -->
				<div class="lyrics btn">
					<div :class="{ icon: true, light_icon: is_player_fullscreen }" @click="toggleLyricsWindow">
						<i class="iconfont icon-lyrics-window"></i>
					</div>
				</div>

				<a-popover placement="top" trigger="click" :arrow="false" :getPopupContainer="e => e.parentElement">
					<template #content>
						<div class="volume_box" ref="">
							{{ volume }}%
							<div class="slider_box">
								<a-slider
									:min="0"
									:max="100"
									:tooltipOpen="false"
									@change="player.soundChange"
									v-model:value="volume"
									vertical
								/>
							</div>
						</div>
					</template>
					<div class="sound btn">
						<div :class="{ icon: true, light_icon: is_player_fullscreen }">
							<i class="iconfont icon-sound"></i>
						</div>
					</div>
				</a-popover>

				<div class="full btn" @click="playerStore.appToggleFullScreen">
					<div :class="{ icon: true, light_icon: is_player_fullscreen }">
						<i :class="['iconfont', is_app_fullscreen ? 'icon-unfullscreen' : 'icon-fullscreen']"></i>
					</div>
				</div>
				<PopConfirm placement="tl">
					<div class="other btn" @click="setFullscreen">
						<div :class="{ icon: true, light_icon: is_player_fullscreen }">
							<i class="iconfont icon-others"></i>
						</div>
					</div>
					<template #content>
						<div class="otherList">
							<div
								class="otherItem"
								v-for="(item, index) in otherList"
								:key="index"
								@click="handleSelect(item, index)"
								:style="{
									background: item.key === 'mini' && miniPlayer ? 'rgba(0,0,0,0.2)' : '',
								}"
							>
								<div class="icon_box" v-if="item.icon">
									<i :class="['iconfont', item.icon ?? '']"></i>
								</div>
								<div class="label">{{ item.label }}</div>
							</div>
						</div>
					</template>
				</PopConfirm>
			</div>
			<!-- ⬆️⬆️⬆️⬆️⬆️⬆️⬆️右边部分⬆️⬆️⬆️⬆️⬆️⬆️⬆️ -->

			<Progress />
		</div>
		<!-- ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑  一直处于下放的播放器，包含播放器、按钮 ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑   -->

		<!-- 播放列表 -->
		<PlayingList v-model="visible" drawerWidth="350px" drawerHeight="60vh" drawerMaxHeight="60vh"></PlayingList>
	</div>
</template>

<script setup>
import { ref, toRefs, onUnmounted, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import PlayingList from '@/components/PlayingList.vue'
import PlayerBg from './PlayerBgs/index.vue'
import Lyrics from './Lyrics/index.vue'
import VinylRecord from './Records/VinylRecord.vue'
import RectRecord from './Records/RectRecord.vue'
import Record from './Records/Record.vue'
import { emitTo, listen } from '@utils/api'
import Progress from './Progress.vue'
import usePlayer from '@hooks/usePlayer.js'
import PopConfirm from '@/components/PopConfirm.vue'
import useWebviewWindow from '@/hooks/useWebviewWindow.js'

const playerStore = usePlayerStore()
const player = usePlayer()
const webviewWin = useWebviewWindow()

const visible = ref(false)

const fullSide = ref('')
const miniPlayer = ref(null)

const RecordMap = new Map([
	['黑胶唱片', VinylRecord],
	['方形唱片', RectRecord],
	['不知道', Record],
])

const { is_player_fullscreen, playState, currentMode, volume, is_app_fullscreen, recordType } = toRefs(playerStore)
const otherList = [
	{
		label: '迷你播放器',
		key: 'mini',
		icon: 'icon-mini-player',
	},
	{
		label: '均衡器',
		icon: 'icon-play',
	},
]
onMounted(async () => {
	window.addEventListener('keydown', handleKeydown)
	const unlisten = await listen('mini-event', e => {
		if (e.payload.type === 'created') {
			emitTo('mini-player', 'mini-listen', {
				type: 'created',
				currentSong: playerStore.currentSong,
				themeMode: playerStore.themeMode,
				playState: playState.value,
			})
		} else if (e.payload.type === 'pre') {
			player.pre()
		} else if (e.payload.type === 'toggleStart') {
			player.toggleStart()
		} else if (e.payload.type === 'next') {
			player.next()
		}
	})
})

const handleSelect = async (item, index) => {
	if (item.key === 'mini') {
		if (miniPlayer.value) {
			const visible = await miniPlayer.value.isVisible()
			if (visible) {
				miniPlayer.value.close()
				miniPlayer.value = null
			}
		} else {
			miniPlayer.value = webviewWin.createMiniPlayer()
		}
		console.log(miniPlayer.value)
	}
}
function isEditable(el) {
	if (!el) return false
	const tag = el.tagName.toLowerCase()
	return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}
function handleKeydown(e) {
	if (e.code !== 'Space') return
	if (isEditable(e.target)) return

	e.preventDefault()
	player.toggleStart()
}
onUnmounted(() => {
	window.removeEventListener('keydown', handleKeydown)
})
const openPlayingList = () => {
	visible.value = !visible.value
}

const lyricsWin = ref(null)
const toggleLyricsWindow = async () => {
	if (lyricsWin.value) {
		console.log(11)
		const visible = await lyricsWin.value.isVisible()
		if (visible) {
			lyricsWin.value.close()
			lyricsWin.value = null
		}
	} else {
		console.log(22)
		lyricsWin.value = webviewWin.createLyricsWindow()
	}

	// const lyrics_win = await WebviewWindow.getByLabel('lyrics_window')
	// if (lyrics_win !== null) {
	// 	const isVisible = await lyrics_window.value.isVisible()
	// 	if (isVisible) {
	// 		lyrics_window.value.hide()
	// 	} else {
	// 		lyrics_window.value.show()
	// 	}
	// } else {
	// 	const lyricsWin = webviewWin.createLyricsWindow()
	// }
}

const clickToPlay = async song => {
	const index = playerStore.PlayingList.findIndex(item => item.id === song.id)
	await player.loadTrack(index)
}

// 音轨全屏
const setPlayerFull = () => {
	if (!playerStore.currentSong?.id) return
	if (is_player_fullscreen.value) {
		if (fullSide.value === 'right') {
			fullSide.value = ''
		}
	} else {
		is_player_fullscreen.value = true
		fullSide.value = ''
	}
}

const recordClicked = () => {
	if (fullSide.value === 'left') {
		fullSide.value = ''
	} else {
		fullSide.value = 'left'
	}
}

const lyricsClicked = () => {
	if (fullSide.value === 'right') {
		fullSide.value = ''
	} else {
		fullSide.value = 'right'
	}
}
</script>

<style lang="scss" scoped>
.player_box {
	display: flex;
	align-items: center;
	height: var(--player-height);
	width: 100%;
	position: absolute;
	bottom: 0;
	transition: height 0.4s;
	box-sizing: border-box;
	justify-content: space-between;
	background-color: var(--player-bg-color);
	backdrop-filter: blur(2px);
	&.fullscreen {
		width: 100%;
		height: 100%;
		.fake_cover {
			.cover {
				cursor: default;
			}

			&.fullsideRight {
				.cover {
					cursor: pointer;
				}
			}
		}

		.full_box {
			position: absolute;
			width: 100%;
			height: 100%;
			display: flex;
			transition: all 0.4s;
			z-index: 2;
			background-color: #fff;
			.player_bg_box {
				width: 100%;
				height: 100%;
				z-index: 2;
				position: absolute;
				left: 0;
				top: 0;
				opacity: 1;
			}

			.full {
				width: 100%;
				height: 100%;
				position: relative;
				z-index: 3;
				display: flex;
				transition: all 0.5s;
				.outer_cover_box {
					height: 100%;
					transition: all 0.4s;
					width: 50%;
					position: absolute;
					bottom: 0;
					left: 0;

					&.fullsideRight {
						height: var(--player-height);
						left: 0;
						bottom: 0;
					}
				}

				.lyrics_box {
					position: absolute;
					height: 100%;
					transition: width 0.4s;
					right: 0;
					// transition-delay: 0.2s;
				}

				.isfull {
					width: 100%;
				}
			}
		}
	}

	.full_box {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		transition: all 2s;

		.player_bg_box {
			width: 100%;
			height: 100%;
			z-index: 2;
			position: absolute;
			left: 0;
			top: 0;
		}

		.full {
			width: 100%;
			height: 100%;

			.outer_cover_box {
				height: 100%;
				display: flex;
				align-items: end;
			}

			.lyrics_box {
				height: 100%;
			}
		}
	}

	.outer_box {
		width: 100%;
		display: flex;
		height: var(--player-height);
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 3;
		// backdrop-filter: blur(5px);

		i {
			transition: color 0.3s;
		}

		&:hover {
			.btn {
				opacity: 1;
				transition-delay: 0s;
			}
		}
	}

	.box_son {
		flex: 1 1 33.33%;
		min-width: 0;
	}

	.player_box_left {
		display: flex;
		position: relative;
		padding-left: 30px;

		.fake_cover {
			height: 70px;
			display: flex;
			align-items: center;
			cursor: pointer;
			width: 80px;
			overflow: hidden;

			.cover,
			.up {
				width: 50px;
				height: 50px;
				border-radius: 50%;
			}

			.cover:hover {
				.up {
					opacity: 1;
				}
			}

			.up {
				display: flex;
				justify-content: center;
				align-items: center;
				opacity: 0;
				transition: all 0.3s;

				i {
					font-size: 20px;
					margin-top: -5px;
					color: #cccccc;
				}
			}
		}

		.info {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			padding: 15px 0;
			transition: all 0.3s;

			.song_title {
				font-family: var(--font-family);
				font-weight: 500;
				font-size: 16px;
				color: var(--player-title-text-color);
			}

			.song_artist {
				font-family: var(--font-family);
				font-size: 12px;
				color: var(--sub-text-color);
			}
			.song_time {
				font-size: 14px;
				color: var(--sub-text-color);
			}
		}
	}

	.player_box_center {
		// padding: 0 15px;
		width: 100px;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;

		i {
			color: var(--primary-text-color);
		}

		.playing_list {
			i {
				font-size: 22px;
			}
		}

		.start_pause {
			i {
				font-size: 24px;
			}
		}

		.mode {
			i {
				font-size: 18px;
			}
		}
	}

	.player_box_right {
		display: flex;
		align-items: center;
		justify-content: end;
		width: 20px;
		box-sizing: border-box;
		overflow: hidden;
		padding-right: 30px;
		color: #333;

		i {
			font-size: 18px;
			color: var(--primary-text-color);
		}

		.lyrics {
			i {
				font-size: 22px;
			}
		}

		.volume_box {
			height: 200px;
			width: 50px;
			padding: 10px 0;
			display: flex;
			justify-content: center;
			align-items: center;
			flex-direction: column;
			.slider_box {
				margin: 10px 0;
				width: 100%;
				flex: 1;
				display: flex;
				justify-content: center;
				align-items: center;
			}

			.volume_btn {
				width: 35px;
				height: 35px;
				border-radius: 5px;
				cursor: pointer;
				display: flex;
				justify-content: center;
				align-items: center;
				transition: background 0.2s;
				background-color: rgba($color: #777777, $alpha: 0.1);

				&:hover {
					background-color: rgba($color: #777777, $alpha: 0.2);
				}

				&:active {
					background-color: rgba($color: #777777, $alpha: 0.3);
				}

				i {
					font-size: 16px;
					color: #333;
				}
			}
		}
	}

	.btn {
		margin-right: 15px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		cursor: pointer;
		transition: all 0.3s;
		transition-delay: 2s;
		opacity: 0;
		&.other {
			margin-right: 0;
		}
		.icon {
			width: 100%;
			height: 100%;
			display: flex;
			justify-content: center;
			align-items: center;
			transition: all 0.1s;
			border-radius: 5px;

			&:hover {
				background: var(--icon-bg-color);
			}

			&:active {
				transform: scale(0.8);
			}
		}

		&.playing_list {
			margin-right: 0;
		}
	}

	.player {
		width: 100%;
		height: 50px;
		border-radius: 0px;
	}
}

.otherList {
	font-size: 14px;
	color: #333;
	.otherItem {
		margin-bottom: 2px;
		padding: 3px 5px;
		cursor: pointer;
		border-radius: 3px;
		display: flex;
		&:last-child {
			margin-bottom: 0;
		}
		&:hover {
			background-color: rgba($color: #000000, $alpha: 0.2);
		}
		&:active {
			background-color: rgba($color: #000000, $alpha: 0.4);
		}
		.icon_box {
			margin-right: 5px;
			i {
				color: #333;
			}
		}
	}
}

.upDown-leave-active {
	transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
	opacity: 1;
}

.upDown-enter-active {
	transition: all 0.3s ease;
	opacity: 1;
}

.upDown-enter-from {
	opacity: 0;
}

.upDown-leave-to {
	opacity: 0;
}

.listhide-leave-active {
	transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
	opacity: 1;
}

.listhide-enter-active {
	transition: all 0.3s ease;
	opacity: 1;
}

.listhide-enter-from {
	opacity: 0;
}

.listhide-leave-to {
	opacity: 0;
}

.disappear-enter-active {
	animation: disappear 0.3s;
}

.disappear-leave-active {
	animation: disappear 0.3s reverse;
}

@keyframes disappear {
	0% {
		width: 0;
	}

	100% {
		width: 80px;
	}
}
</style>

<style lang="scss">
.notify {
	width: 300px;
}
</style>
