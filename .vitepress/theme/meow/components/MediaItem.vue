<template>
	<div class="media_item">
		<div v-if="loading" class="loading"></div>
		<img
			:src="formatPath(props.item.path)"
			alt=""
			v-if="props.item.kind === 'img'"
			@load="imgLoad"
			@error="onError"
		/>
		<video :src="formatPath(props.item.path)" v-if="props.item.kind === 'video'" @loadeddata="videoLoad" /> -->
		<div v-if="failed" class="failed">加载失败</div>
	</div>
</template>

<script setup>
import { convertFileSrc } from '@utils/api'
import { ref } from 'vue'
const loading = ref(true)
const failed = ref(false)
const props = defineProps({
	item: {
		type: Object,
		default: () => {},
	},
})

const formatPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}

const imgLoad = () => {
	loading.value = false
}
const videoLoad = () => {
	loading.value = false
}
const onError = () => {
	loading.value = false
	failed.value = true
}
</script>

<style lang="scss" scoped>
.media_item {
	width: 100%;
	height: 100%;
	position: relative;
	img,
	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.2s;
	}
	.loading {
		position: absolute;
		inset: 0;
		z-index: 2;
		background: linear-gradient(
			110deg,
			#1a1a2e 25%,
			#16213e 35%,
			#0f3460 45%,
			#e94560 50%,
			#0f3460 55%,
			#16213e 65%,
			#1a1a2e 75%
		);
		background-size: 250% 100%;
		animation: aurora-shimmer 2s ease-in-out infinite;
	}

	.failed {
		position: absolute;
		inset: 0;
		z-index: 2;
	}
}
@keyframes aurora-shimmer {
	0% {
		background-position: 150% 0;
	}
	100% {
		background-position: -150% 0;
	}
}
</style>
