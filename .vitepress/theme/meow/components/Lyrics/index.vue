<template>
	<div class="lyrics_outer_box">
		<transition name="fade">
			<component :is="Lyrics" v-show="!props.fullSide"></component>
		</transition>
	</div>
</template>

<script setup>
import { watch } from 'vue'
import AppleLyrics from './AppleLyricsVue.vue'
import AppleLyricsNative from './AppleLyricsNative.vue';
import Lyrics from './Lyrics.vue';


const props = defineProps({
	fullSide: {
		type: String,
		default: '',
	},
})
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
