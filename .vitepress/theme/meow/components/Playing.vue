<template>
	<div class="playing_logo">
		<div class="ani_box" v-if="props.play">
			<div
				class="line"
				:style="{
					animationPlayState: animationPlayState(),
				}"
			></div>
			<div
				class="line"
				:style="{
					animationPlayState: animationPlayState(),
				}"
			></div>
			<div
				class="line"
				:style="{
					animationPlayState: animationPlayState(),
				}"
			></div>
		</div>
	</div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/index.js'
const playerStore = usePlayerStore()
const props = defineProps({
	play: {
		type: Boolean,
		default: false,
	},
})
const animationPlayState = () => {
	return playerStore.playState === 'playing' ? 'running' : 'paused'
}
</script>

<style lang="scss" scoped>
.playing_logo {
	width: 12px;
	margin-right: 8px;
	.ani_box {
		margin-right: 10px;
		height: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 12px;
		.line {
			width: 2px;
			height: 100%;
			height: 15px;
			border-radius: 1px;
			background-color: blue;
			animation: playing 0.8s linear infinite;
			&:nth-child(2) {
				animation-delay: 0.2s;
			}
			&:nth-child(3) {
				animation-delay: 0.4s;
			}
		}
	}

	@keyframes playing {
		0% {
			transform: scaleY(1);
			opacity: 1;
		}
		50% {
			transform: scaleY(0.5);
			opacity: 0.7;
		}
		100% {
			transform: scaleY(1);
			opacity: 1;
		}
	}
}
</style>
