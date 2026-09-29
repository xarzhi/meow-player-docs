<template>
	<div
		class="progress_box"
		@mousedown="mousedown"
		@mousemove="progressBoxMouseMove"
		@mouseleave="progressBoxMouseOut"
	>
		<div class="progress" ref="progress">
			<div
				class="done_box"
				ref="done_box"
				:style="{
					width: done_box_width + 'px',
				}"
			>
				<div class="done"></div>
				<div class="circle"></div>
			</div>
		</div>
		<div
			class="time_box"
			ref="time_box"
			v-show="timeBoxShow && playerStore.currentSong?.min"
			:style="{
				left: time_box_left + 'px',
			}"
		>
			{{ playerStore.currentSong?.min }}:{{ playerStore.currentSong?.sec }}
		</div>
	</div>
</template>

<script setup>
import { invoke, listen, emitTo } from '@utils/api.js'
import { usePlayerStore } from '@/stores/index.js'
import { ref, toRefs, onMounted, nextTick } from 'vue'
import usePlayer from '@hooks/usePlayer.js'
import { formatTime } from '@utils/utils.js'
const playerStore = usePlayerStore()
const player = usePlayer()

const { playState, currentTime } = toRefs(playerStore)

const isDown = ref(false) //  判断鼠标是否在进度条上按下
const autoMove = ref(true) // 进度条是否自动移动，更新进度
const timeBoxShow = ref(false) // 进度条显示时间box
const isInProgressBox = ref(false)
const progress = ref(null)
const time_box = ref(null)
const done_box_width = ref(0)
const time_box_left = ref(0)

onMounted(() => {
	listen('progress_start', () => {
		done_box_width.value = 0
	})
	listen('progress_update', async e => {
		currentTime.value = e.payload
		if (playState.value === 'playing') {
			const is_empty = await invoke('is_empty')
			if (is_empty) {
				return player.ended()
			}
			const duration = playerStore.currentSong.duration / 1000
			if (!isNaN(duration) && duration > 0 && duration) {
				// 更新当前播放时长
				const { hours, mins, secs } = formatTime(currentTime.value / 1000)
				playerStore.currentSong.pre_time = (Number(hours) > 0 ? hours + ':' : '') + `${mins}:${secs}`
				if (progress.value) {
					// 更新进度条长度
					const progressWidth = progress.value.offsetWidth
					if (autoMove.value) {
						const c = currentTime.value / 1000
						const radio = Number(((c / duration) * 100).toFixed(2))
						done_box_width.value = (currentTime.value / 1000 / duration) * progressWidth

						emitTo('mini-player', 'mini-listen', {
							type: 'progress',
							radio,
						})
						emitTo('lyrics_window', 'updateCurrentTime', {
							currentTime: currentTime.value,
						})
					}
				}
			}
		}
	})
})

const mousedown = e => {
	done_box_width.value = e.pageX
	const progressWidth = progress.value.offsetWidth
	autoMove.value = false
	isDown.value = true
}

window.addEventListener('mousemove', e => {
	if (isDown.value) {
		done_box_width.value = e.pageX
		const progressWidth = progress.value.offsetWidth

		if (e.pageX > progressWidth) {
			done_box_width.value = progressWidth
		}
		if (e.pageX < 0) {
			done_box_width.value = 0
		}

		if (!isInProgressBox.value) {
			if (playerStore.currentSong?.id) {
				time_box_left.value = e.pageX
				const timeBoxWidth = time_box.value.offsetWidth
				const progressWidth = progress.value.offsetWidth

				const curTime = ((done_box_width.value / progressWidth) * playerStore.currentSong.duration) / 1000
				const { hours, mins, secs } = formatTime(curTime)
				playerStore.currentSong.hours = hours
				playerStore.currentSong.min = mins
				playerStore.currentSong.sec = secs

				if (!isNaN(playerStore.currentSong.min) && !isNaN(playerStore.currentSong.sec)) {
					timeBoxShow.value = true
				}

				// 右边界判断
				if (time_box_left.value > progressWidth - timeBoxWidth / 2) {
					time_box_left.value = progressWidth - timeBoxWidth / 2
				}

				// 左边界判断
				if (time_box_left.value < timeBoxWidth / 2) {
					time_box_left.value = timeBoxWidth / 2
				}
			}
		}
	}
})

window.addEventListener('mouseup', e => {
	if (isDown.value) {
		isDown.value = false
		const progressWidth = progress.value.offsetWidth
		if (playerStore.currentSong?.id) {
			const pos = Math.max(0, ((e.pageX / progressWidth) * playerStore.currentSong.duration) / 1000)
			invoke('try_seek', {
				path: playerStore.currentSong.path,
				pos,
			})
		} else {
			done_box_width.value = 0
			invoke('try_seek', {
				path: playerStore.currentSong.path,
				pos: 0,
			})
		}
		autoMove.value = true
		if (isInProgressBox.value) {
			timeBoxShow.value = true
		} else {
			timeBoxShow.value = false
		}
	}
})

const progressBoxMouseMove = e => {
	// 计算鼠标拖动滚动条时，当前滚动条位置的音乐时间位置
	if (playerStore.currentSong?.id) {
		const progressWidth = progress.value.offsetWidth
		const timeBoxWidth = time_box.value.offsetWidth

		isInProgressBox.value = true

		time_box_left.value = e.pageX

		if (e.pageX > progressWidth - timeBoxWidth / 2) {
			time_box_left.value = progressWidth - timeBoxWidth / 2
		}
		if (e.pageX < timeBoxWidth / 2) {
			time_box_left.value = timeBoxWidth / 2
		}

		const curTime = ((e.pageX / progressWidth) * playerStore.currentSong.duration) / 1000
		const { hours, mins, secs } = formatTime(curTime)
		playerStore.currentSong.hours = hours
		playerStore.currentSong.min = mins
		playerStore.currentSong.sec = secs
		if (!isNaN(playerStore.currentSong.min) && !isNaN(playerStore.currentSong.sec)) {
			timeBoxShow.value = true
		}
	}
}
const progressBoxMouseOut = () => {
	timeBoxShow.value = false
	isInProgressBox.value = false
}

window.addEventListener('resize', () => {
	nextTick(() => {
		if (progress.value) {
			const progressWidth = progress.value.offsetWidth
			const duration = playerStore.currentSong?.duration / 1000
			done_box_width.value = (currentTime.value / duration) * progressWidth
		}
	})
})
</script>

<style lang="scss" scoped>
.progress_box {
	height: 14px;
	position: absolute;
	width: 100%;
	top: -7px;
	left: 0;
	cursor: pointer;
	display: flex;
	align-items: center;

	&:hover {
		.progress {
			.done_box {
				.circle {
					opacity: 1;
				}
			}
		}
	}

	// 进度条显示时间盒子
	.time_box {
		position: absolute;
		top: -30px;
		padding-left: 10px;
		padding-right: 10px;
		height: 25px;
		left: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		transform: translate(-50%);
		font-size: 12px;
		box-shadow: 0px 1px 20px #e4e4e4;
		border-radius: 5px;
		background-color: #fff;

		&::after {
			content: '';
			position: absolute;
			left: 50%;
			top: 25px;
			width: 0;
			height: 0;
			transform: translate(-50%);
			border: 6px solid #fff;
			border-left: 6px solid transparent;
			border-bottom: 6px solid transparent;
			border-right: 6px solid transparent;
		}
	}

	.progress {
		width: 100%;
		height: 2px;
		// background-color: var(--progress-bg-color);
		transition: all 0.3s;

		.done_box {
			position: relative;
			height: 2px;

			.done {
				height: 2px;
				// background-color: #002fa7;
				background-color: rgba($color: rgb(100, 94, 94), $alpha: 0.8);
				transition: height 0.5s;
				width: 100%;
			}

			.circle {
				position: absolute;
				width: 10px;
				height: 10px;
				border-radius: 50%;
				background-color: #fff;
				right: -5px;
				top: -4px;
				box-shadow: 1px 1px 8px 1px #8f8e8e;
				opacity: 0;
				transition: opacity 0.2s;
			}
		}
	}
}
</style>
