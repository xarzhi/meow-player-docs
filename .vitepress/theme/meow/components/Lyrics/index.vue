<template>
	<div class="lyrics_outer_box">
		<transition name="fade">
			<!-- 只用 App 自己这套朴素渲染的 Lyrics.vue：
			     Apple Music 那套（@applemusic-like-lyrics/*）在网页里跑不起来（wasm/pixi），
			     这里以前还只是 import 进来没用上，白白把一堆依赖拖进浏览器包，已经去掉了。 -->
			<Lyrics
				v-show="fullSide !== 'left'"
				:fullSide="fullSide"
				:from="from"
				@lyricsClicked="$emit('lyricsClicked')"
			/>
		</transition>
	</div>
</template>

<script setup>
import Lyrics from './Lyrics.vue'

defineProps({
	fullSide: {
		type: String,
		default: '',
	},
	from: {
		type: String,
		default: '',
	},
})

defineEmits(['lyricsClicked'])
</script>

<style lang="scss" scoped>
.lyrics_outer_box {
	width: 100%;
	height: 100%;
}
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}

/* 初始 & 结束状态 */
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
