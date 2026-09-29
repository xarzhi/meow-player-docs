<template>
	<div :class="{ search_box: true, stretch }">
		<input type="text" ref="searchRef" v-model="searchVal" @blur="handleBlur" />
		<i
			:class="['iconfont', stretch ? 'icon-close' : 'icon-search']"
			:key="stretch"
			@mousedown="mousedown"
			@click="handleOpen"
		></i>
	</div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'

const searchVal = defineModel()
const emit = defineEmits(['search', 'input'])

const stretch = ref(false)
const searchRef = ref(null)
watch(searchVal, n => {
	emit('input', n)
})
onMounted(() => {
	window.addEventListener('keydown', keyHandler)
})
onUnmounted(() => {
	window.removeEventListener('keydown', keyHandler)
})

const keyHandler = e => {
	if (e.ctrlKey && e.key === 'f') {
		e.preventDefault()
		stretch.value = true
		searchRef.value.focus()
	}
}

const handleBlur = () => {
	stretch.value = false
}
const mousedown = e => {
	e.preventDefault()
}

const handleOpen = () => {
	if (!stretch.value) {
		stretch.value = true
		nextTick(() => {
			searchRef.value.focus()
		})
	} else {
		if (searchVal.value) {
			searchVal.value = ''
		} else {
			stretch.value = false
		}
	}
}
</script>

<style lang="scss" scoped>
.search_box {
	display: flex;
	justify-content: center;
	align-items: center;
	box-sizing: border-box;
	transition: border-radius 0.3s;
	height: 35px;
	min-width: 35px;
	height: 35px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: #333;
	border-radius: 3px;
	cursor: pointer;

	&:hover {
		background: var(--icon-bg-color);
	}

	i {
		font-size: 16px;
		color: var(--primary-text-color);
	}

	margin-left: 5px;
	input {
		font-size: 14px;
		width: 0;
		transition:
			width 0.2s,
			margin-right 0.2;
		outline: none;
		border: none;
		background-color: transparent;
		padding: 0;
		margin: 0;
		border-radius: 5px;
		height: 100%;
		line-height: 35px;
		color: var(--primary-text-color);
		transition: width 0.3s;
		vertical-align: middle;
		box-sizing: border-box;
	}
	i {
		width: 35px;
		height: 35px;
		display: flex;
		justify-content: center;
		align-items: center;
		&.icon-close {
			font-size: 12px;
			width: 20px;
			height: 20px;
			border-radius: 50%;
			transition: background-color 0.2s;
			&:hover {
				background-color: rgba($color: #fafafa, $alpha: 0.3);
			}
		}
	}

	&.stretch {
		padding: 0 10px;
		// background: var(--icon-bg-color);
		background-color: rgba($color: #5e5e5e, $alpha: 0.5);
		backdrop-filter: blur(1px);
		border-radius: 17px;
		input {
			width: 200px;
			margin-right: 0;
			padding: 0 10px;
			margin-right: 10px;
			box-sizing: border-box;
			display: block;
		}
	}
}
</style>
