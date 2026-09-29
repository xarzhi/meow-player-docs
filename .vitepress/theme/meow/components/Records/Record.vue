<template>
	<div :class="{ max_screen: true, fullscreen_box: is_player_fullscreen, isFullRight: fullSide === 'right' }">
		<div :class="{ reflect_box: true }">
			<Transition name="fade" mode="out-in">
				<div class="cover" :key="playerStore.currentSong.coverUrl">
					<div
						:class="['rotate_box', playState === 'playing' ? 'rotate_running' : 'rotate_paused']"
						@click="recordClicked"
						ref="coverRef"
					>
						<div class="rotate_img_box">
							<img
								:src="playerStore.currentSong.coverUrl"
								alt="歌曲封面"
								v-if="playerStore.currentSong.coverUrl"
							/>
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
import { toRefs, watch } from 'vue'
const playerStore = usePlayerStore()

const props = defineProps({
	is_player_fullscreen: Boolean,
	fullSide: String,
})

const { playState } = toRefs(playerStore)

const recordClicked = () => {
	emit('recordClicked')
}

const onerror = e => {
	console.log(e)
	// e.target.src='../assets/yz.png'
}

const emit = defineEmits(['recordClicked'])

watch(playState, newV => {
	console.log(newV)
})
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
	-webkit-box-reflect: below -1px linear-gradient(transparent, rgba(0, 0, 0, 0.3));
	display: flex;
	width: 50px;
	height: 50px;
	transition: all 0.4s;
	box-sizing: border-box;
	position: absolute;
	.cover {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
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
			position: relative;
			// filter: drop-shadow(0 15px 35px rgba(0, 0, 0, 0.6));
			// &:hover {
			//     filter: drop-shadow(0 20px 45px rgba(0, 0, 0, 0.7));
			// }

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
						rgba(255, 255, 255, 0.03) 1px,
						transparent 2px,
						transparent 8px
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
				background: radial-gradient(
					circle at 50% 50%,
					rgba(40, 40, 40, 0.95) 0%,
					rgba(25, 25, 25, 0.98) 70%,
					rgba(15, 15, 15, 1) 100%
				);
			}

			/* 标签光泽 */
			.label-shine {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: radial-gradient(ellipse at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
				border-radius: 50%;
				z-index: 5;
				pointer-events: none;
				animation: labelShine 8s ease-in-out infinite;
			}

			img {
				height: 100%;
				width: 100%;
				transition: all 0.4s;
			}
		}
	}
}

.fullscreen_box {
	position: relative;
	width: 100%;
	border: 1px solid #000;
	.reflect_box {
		width: 45vh;
		height: 45vh;
		display: flex;
		z-index: 3;
		transition: all 0.3s;
		transform: translateY(-10%);

		.cover {
			.rotate_box {
				width: 45vh;
				height: 45vh;
			}
		}
	}

	&.isFullRight {
		width: 110px;

		.reflect_box {
			width: 50px;
			height: 50px;
			display: flex;

			.cover {
				width: 50px;
				height: 50px;

				.rotate_box {
					width: 50px;
					height: 50px;
				}
			}
		}
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: all 0.2s ease-out;
	opacity: 1;
}

.fade-enter-from {
	transform: translateY(20px);
	opacity: 0;
}

.fade-leave-to {
	transform: translateY(-20px);
	opacity: 0;
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
