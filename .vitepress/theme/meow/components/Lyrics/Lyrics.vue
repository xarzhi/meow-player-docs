<template>
	<div :class="{ lyrics_outer_box: true, win_lyrics: from === 'window' }">
		<!-- <Transition name="right" mode="out-in"> -->
		<div
			class="lyrics_box"
			@wheel="wheel"
			@click.self="lyricsClicked"
			v-if="playerStore.currentSong.id && fullSide !== 'left'"
		>
			<!-- :style="{ fontSize: lyricsFontSize + 'px', }" -->
			<div
				ref="lis"
				class="line"
				v-for="(item, index) in playerStore.currentLyrics"
				:class="{ active: active === index, sung: index < active }"
				@click="jumpLyrics(item)"
				:style="{
					'--duration': (item.endTime - item.startTime) / 1000 + 's',
				}"
			>
				<div class="words">
					{{ item.words[0].word }}
				</div>
			</div>
		</div>
		<!-- </Transition> -->
	</div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/index.js'
import { toRefs, watch, ref, onMounted, nextTick } from 'vue'
import usePlayer from '@/hooks/usePlayer.js'
import { listen } from '@tauri-apps/api/event'

const playerStore = usePlayerStore()
const player = usePlayer()
const active = ref(-1)

const emit = defineEmits(['lyricsClicked'])
const { lyricsFontSize } = toRefs(playerStore)
const lis = ref(null)
const countdown = ref(5)
const isOpt = ref(false)
const props = defineProps({
	fullSide: String,
	from: String,
})

const lyricsClicked = () => {
	emit('lyricsClicked')
}
console.log(playerStore.currentLyrics)

const jumpLyrics = item => {
	player.seek(item.startTime / 1000)
}

watch(
	() => playerStore.currentTime,
	n => {
		playerStore.currentLyrics.forEach((item, index) => {
			if (n >= item.startTime && n < item.endTime) {
				active.value = index
				if (!isOpt.value) {
					lis.value[index].scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					})
				}
			}
		})
	}
)

let timer = null
const wheel = () => {
	isOpt.value = true
	countdown.value = 5
	clearInterval(timer)
	timer = null
	timer = setInterval(() => {
		if (countdown.value > 0) {
			countdown.value--
		} else {
			clearInterval(timer)
			timer = null
			isOpt.value = false
		}
	}, 1000)
}

// watch(
// 	() => props.fullSide,
// 	newV => {
// 		if (lastSide.value === 'left' && !newV) {
// 			positionLyrics(props.currentTime, false)
// 		}
// 		lastSide.value = newV
// 	}
// )
</script>

<style lang="scss" scoped>
.lyrics_outer_box {
	padding: 30px 0;
	overflow: hidden;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	.lyrics_box {
		height: 75%;
		mask-image: linear-gradient(to bottom, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%);
		overflow: hidden;
		padding: 50px 40px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-flow: column;
		align-items: center;
		box-sizing: border-box;
		overflow: auto;
		width: 100%;
		border-radius: 10px;
		box-sizing: border-box;
		margin-bottom: 0;
		transition: background-color 0.2s;
		&:hover {
			.line:not(.active) {
				filter: blur(0);
			}
		}

		&::-webkit-scrollbar {
			display: none;
		}

		.line {
			display: flex;
			width: 100%;
			// justify-content: center;
			padding: 15px 10px;
			align-items: center;
			border-radius: 8px;
			cursor: pointer;
			text-shadow: 0px 0px 10px rgba(99, 99, 99, 0.2);
			font-size: 24px;
			text-align: left;
			white-space: nowrap;
			transition:
				background-color 0.3s,
				filter 0.3s;

			&:hover {
				background-color: rgba(0, 0, 0, 0.2);
			}

			.words {
				color: transparent;
				background: linear-gradient(to right, #fff 50%, rgba($color: #d3d3d3, $alpha: 0.5) 50%);
				background-size: 200% 100%;
				background-position: 100% 50%;
				-webkit-background-clip: text;
				background-clip: text;
				transition:
					background-position var(--duration, 0.4s) linear,
					transform 0.3s;
			}

			&.active .words {
				background-position: 0% 50%;
				transform: scale(1.05);
				transform-origin: 0% 50%;
			}
			&:not(.active) {
				transition: background-position 0;
				background-position: 100% 50%;
				filter: blur(4px);
			}
		}
		/* 未唱：永远灰色，无动画 */
		.line:not(.active):not(.sung) .words {
			transition: none;
			background-position: 100% 50%;
		}
		/* ✅ 已唱完：直接蓝色，禁止动画 */
		.line.sung .words {
			transition: none !important;
			background-position: 100% 50%;
		}
	}
}

.win_lyrics {
	padding: 0 0;

	.lyrics {
		padding: 0;
		width: 100%;
		height: 50px;

		&:hover {
			background-color: transparent;
		}

		ul {
			height: 50px;
			// overflow: hidden;

			li {
				height: 100%;
				display: flex;
				align-items: center;
				text-align: left;
				white-space: nowrap;
				padding: 0 0;
				text-shadow:
					1px 1px 1px rgba($color: #000000, $alpha: 0.5),
					1px 0px 1px rgba($color: #000000, $alpha: 0.5);
				color: rgba($color: #d3d3d3, $alpha: 0.5);

				&:hover {
					background-color: transparent;
				}
			}
		}
	}
}

.right-leave-active {
	transition: all 0.1s ease-in-out;
	opacity: 1;
}

.right-enter-active {
	transition: all 0.3s ease-in-out;
	opacity: 1;
	transition-delay: 0.2s;
}

.right-enter-from {
	transform: translateY(50px);
	opacity: 0;
}

.right-enter-to {
	transform: translateY(0);
	opacity: 1;
}

.right-leave-from {
	opacity: 1;
}

.right-leave-to {
	opacity: 0;
}
</style>
