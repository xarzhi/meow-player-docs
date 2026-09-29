<template>
	<div class="collapse">
		<header>
			<slot name="header"></slot>
		</header>
		<main class="content" ref="content">
			<slot></slot>
		</main>
	</div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
const content = ref(null)
// const collapse = defineModel()
const props = defineProps({
	collapse: {
		type: Boolean,
		default: false,
	},
})

onMounted(() => {
	if (props.collapse) {
		nextTick(() => {
			content.value.style.height = content.value.scrollHeight + 'px'
		})
	} else {
		content.value.style.height = 0
	}
})

watch(
	() => props.collapse,
	newV => {
		if (newV) {
			nextTick(() => {
				content.value.style.height = content.value.scrollHeight + 'px'
			})
		} else {
			content.value.style.height = 0
		}
	}
)
</script>

<style lang="scss" scoped>
.collapse {
	overflow: hidden;
	.content {
		transition: height 0.3s;
	}
}
</style>
