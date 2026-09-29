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
	border-radius: 3px;
	overflow: hidden;

	.cover {
		box-sizing: border-box;
		width: 100%;
		height: 100%;

		.rotate_box {
			width: 100%;
			height: 100%;
			box-sizing: border-box;
			transition: all 0.4s;
			cursor: pointer;
			display: flex;
			justify-content: center;
			align-items: center;
			position: relative;

			.rotate_img_box {
				width: 100%;
				height: 100%;
				overflow: hidden;
				display: flex;
				justify-content: center;
				align-items: center;
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

	.reflect_box {
		width: 42vh;
		height: 42vh;
		display: flex;
		border-radius: 10px;
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
</style>
