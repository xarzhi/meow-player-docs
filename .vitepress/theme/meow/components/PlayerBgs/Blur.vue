<template>
	<div class="bg">
		<div class="blur_box"></div>
		<div class="blur_box"></div>
		<Transition name="fade">
			<img class="bg_box" v-if="coverPath" :key="playerStore.currentSong.id" :src="coverPath" />
		</Transition>
	</div>
</template>

<script setup>
import { watch, computed } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { convertFileSrc } from '@utils/api'

const playerStore = usePlayerStore()

const transformPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}

const coverPath = computed(() => {
	return transformPath(playerStore.currentSong.cover)
})
</script>

<style lang="scss" scoped>
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

@keyframes rotate {
	from {
		transform: rotate(0deg) scale(1.8);
	}

	to {
		transform: rotate(360deg) scale(1.8);
	}
}

.blur_box {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	background-color: rgba($color: #000, $alpha: 0.05);
	backdrop-filter: blur(50px);
	// filter: blur(80px);
	z-index: 999999999999;
}

.bg_box {
	z-index: 8;
	width: 100%;
	height: 100%;
	position: absolute;
}
</style>
