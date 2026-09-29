<template>
	<div :class="{ max_screen: true, fullscreen_box: is_player_fullscreen, isFullRight: fullSide === 'right' }">
		<div :class="{ reflect_box: true }">
			<Transition name="fade" mode="out-in">
				<div class="cover" :key="playerStore.currentSong?.id">
					<div
						:class="['rotate_box', playState === 'playing' ? 'rotate_running' : 'rotate_paused']"
						@click="recordClicked"
						ref="coverRef"
					>
						<div class="rotate_img_box">
							<img :src="coverPath" alt="歌曲封面" v-if="coverPath" />
							<img v-else src="../../assets/images/logo.png" alt="" />
							<div class="label-shine"></div>
						</div>
					</div>
				</div>
			</Transition>
		</div>
	</div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/index.js'
import { toRefs, watch, ref, computed } from 'vue'
import { convertFileSrc } from '@utils/api'

const playerStore = usePlayerStore()

const props = defineProps({
	is_player_fullscreen: Boolean,
	fullSide: String,
})

const transformPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}

const coverPath = computed(() => {
	return transformPath(playerStore.currentSong?.cover)
})

const { playState } = toRefs(playerStore)

const recordClicked = () => {
	emit('recordClicked')
}

const emit = defineEmits(['recordClicked'])

watch(
	() => playerStore.currentSong?.id,
	newV => {
		console.log(newV)
	}
)
</script>

<style lang="scss" scoped>
@keyframes rotate {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}

.max_screen {
	height: 100%;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.4s;
	width: 110px;
}

.reflect_box {
	-webkit-box-reflect: below 0px linear-gradient(transparent, rgba(0, 0, 0, 0.3));
	width: 55px;
	height: 55px;
	transition: all 0.4s;
	box-sizing: border-box;
	position: absolute;
	perspective: 1000px;

	.cover {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		transition:
			opacity 0.2s,
			width 0.4s,
			height 0.4s,
			margin-top 0.2s;

		.rotate_box {
			width: 100%;
			height: 100%;
			border-radius: 50%;
			animation: rotate 40s linear infinite;
			box-sizing: border-box;
			transition: all 0.4s;
			cursor: pointer;
			display: flex;
			justify-content: center;
			align-items: center;
			animation-play-state: running;
			background: radial-gradient(circle at 50% 50%, #1a1a1a 0%, #0d0d0d 100%);
			background-color: #333;
			position: relative;

			&.rotate_running {
				animation-play-state: running;
			}

			&.rotate_paused {
				animation-play-state: paused;
			}

			.rotate_img_box {
				width: 62%;
				height: 62%;
				border-radius: 50%;
				overflow: hidden;
				display: flex;
				justify-content: center;
				align-items: center;
			}

			/* 标签光泽 */
			.label-shine {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: radial-gradient(ellipse at 50% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
				border-radius: 50%;
				z-index: 5;
				pointer-events: none;
				animation: labelShine 50s ease-in-out infinite;
			}

			img {
				height: 100%;
				width: 100%;
				transition: all 0.4s;
			}
		}
	}
}

// 播放器全屏的情况下
.fullscreen_box {
	position: relative;
	width: 100%;
	.reflect_box {
		width: 400px;
		height: 400px;
		display: flex;
		z-index: 3;
		transition: all 0.3s;
		transform: translateY(-10%);
		-webkit-box-reflect: below 3px linear-gradient(transparent, rgba(0, 0, 0, 0.3));
		.cover {
			display: flex;
			justify-content: center;
			align-items: center;
			border-radius: 50%;
			background-color: rgba(255, 255, 255, 0.09);
			border: 1px solid rgba(255, 255, 255, 0.1);
			box-sizing: border-box;

			.rotate_box {
				width: 92%;
				height: 92%;
				box-sizing: border-box;
				box-shadow: 0 0 50px 1px rgb(122, 122, 122, 0.2);

				&::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					border-radius: 50%;
					background:
						repeating-conic-gradient(
							from 0deg,
							transparent 0deg,
							rgba(255, 255, 255, 0.02) 0.5deg,
							transparent 1deg,
							rgba(255, 255, 255, 0.01) 1.5deg,
							transparent 2deg
						),
						repeating-radial-gradient(
							circle at 50% 50%,
							transparent 0px,
							rgba(255, 255, 255, 0.06) 1px,
							transparent 2px,
							transparent 4px,
							transparent 6px
						);
					z-index: 1;
				}

				/* 唱片光泽效果 */
				&::after {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: radial-gradient(
						ellipse at 30% 30%,
						rgba(255, 255, 255, 0.08) 0%,
						rgba(255, 255, 255, 0.04) 25%,
						rgba(255, 255, 255, 0.02) 50%,
						rgba(255, 255, 255, 0.01) 75%,
						transparent 100%
					);
					border-radius: 50%;
					z-index: 2;
					animation: vinylShine 6s ease-in-out infinite;
				}

				.rotate_img_box {
					width: 68%;
					height: 68%;
					position: relative;
					z-index: 99;
				}
			}
		}
	}
	// 唱片在player全屏状态下，缩小到左下角的类名
	&.isFullRight {
		width: 110px;
		position: relative;

		.reflect_box {
			width: 55px;
			height: 55px;
			-webkit-box-reflect: below 0px linear-gradient(transparent, rgba(0, 0, 0, 0.3));
			transform: translateY(0);

			.cover {
				width: 55px;
				height: 55px;
				border: none;

				.rotate_box {
					width: 100%;
					height: 100%;
					border: none;
					.rotate_img_box {
						width: 65%;
						height: 65%;
					}
				}
			}
		}
	}
}
// 修改fade过渡样式
.fade-enter-active,
.fade-leave-active {
	transition: all 0.1s ease-out;
}

.fade-enter-from {
	opacity: 0;
	margin-top: 30px;
}

.fade-leave-to {
	opacity: 0;
	margin-top: -20px;
}

@keyframes vinylShine {
	0% {
		opacity: 0.1;
		transform: rotate(0deg) scale(1);
	}

	50% {
		opacity: 0.2;
		transform: rotate(180deg) scale(1.1);
	}

	100% {
		opacity: 0.1;
		transform: rotate(360deg) scale(1);
	}
}

@keyframes labelShine {
	0% {
		opacity: 0.05;
		transform: rotate(0deg);
	}

	25% {
		opacity: 0.15;
	}

	50% {
		opacity: 0.1;
		transform: rotate(180deg);
	}

	75% {
		opacity: 0.15;
	}

	100% {
		opacity: 0.05;
		transform: rotate(360deg);
	}
}
</style>
