<template>
	<div class="container" ref="containerRef" @contextmenu="contextmenu" @click="containerClick">
		<slot></slot>
		<Teleport to="body">
			<Transition name="zoom-bounce" @before-enter="onBeforeEnter" @after-enter="onAfterEnter">
				<div
					class="pop_confirm"
					v-size-ob="handleSizeChange"
					v-if="visible"
					:style="{
						left: pos.posX + 'px',
						top: pos.posY + 'px',
						width: props.width,
					}"
				>
					<slot name="content"> </slot>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue'
import vSizeOb from '@/directives/sizeOb'

const containerRef = ref(null)
const emit = defineEmits(['select'])

const width = ref()
const height = ref()
const x = ref(0)
const y = ref(0)
const visible = ref(false)
const vw = ref(document.documentElement.clientWidth)
const vh = ref(document.documentElement.clientHeight)

const props = defineProps({
	width: {
		type: [Number, String],
		default: 'fit-content',
	},
	openType: {
		type: String,
		default: 'click',
	},
	placement: {
		type: String,
		default: 't',
	},
	offset: {
		// 与container的边距
		type: Number,
		default: 10,
	},
})

const pos = computed(() => {
	let posX = x.value
	let posY = y.value
	const rect = containerRef.value.getBoundingClientRect()

	if (props.placement === 't') {
		posX = rect.left - width.value / 2 + rect.width / 2
		posY = rect.top - height.value - props.offset
	} else if (props.placement === 'tl') {
		posX = rect.left - width.value + rect.width
		posY = rect.top - height.value - props.offset
	} else if (props.placement === 'tr') {
		posX = rect.left
		posY = rect.top - height.value - props.offset
	} else if (props.placement === 'b') {
		posX = rect.left - width.value / 2 + rect.width / 2
		posY = rect.top + rect.height + props.offset
	} else if (props.placement === 'bl') {
		posX = rect.left - width.value + rect.width
		posY = rect.top + rect.height + props.offset
	} else if (props.placement === 'br') {
		posX = rect.left
		posY = rect.top + rect.height + props.offset
	} else if (props.placement === 'l') {
		posX = rect.left - width.value - props.offset
		posY = rect.top - height.value / 2 + rect.height / 2
	} else if (props.placement === 'lt') {
		posX = rect.left - width.value - props.offset
		posY = rect.top - height.value + rect.height
	} else if (props.placement === 'lb') {
		posX = rect.left - width.value
		posY = rect.top
	} else if (props.placement === 'r') {
		posX = rect.left + rect.width + props.offset
		posY = rect.top - height.value / 2 + rect.height / 2
	} else if (props.placement === 'rt') {
		posX = rect.left + rect.width + props.offset
		posY = rect.top - height.value + rect.height
	} else if (props.placement === 'rb') {
		posX = rect.left + rect.width + props.offset
		posY = rect.top
	}

	// 窗口边界判断
	if (posX < 0) {
		posX = props.offset
	}
	if (posY < 0) {
		posY = props.offset
	}
	if (posX > vw.value - width.value) {
		posX -= width.value
	}
	if (posY > vh.value - height.value) {
		posY = vh.value - height.value
	}
	return {
		posX,
		posY,
	}
})
const openMenu = e => {
	e.preventDefault()
	e.stopPropagation()

	x.value = e.clientX
	y.value = e.clientY

	visible.value = true
	disableScroll()
}

const containerClick = e => {
	if (props.openType === 'click') {
		openMenu(e)
	}
}
const contextmenu = e => {
	if (props.openType === 'contextmenu') {
		openMenu(e)
	}
}

const closeMenu = () => {
	visible.value = false
	enableScroll
}

const preventScroll = e => {
	if (visible.value) {
		e.preventDefault()
		e.stopPropagation()
	}
}

const disableScroll = () => {
	window.addEventListener('wheel', preventScroll, {
		passive: false,
	})
}

const enableScroll = () => {
	window.addEventListener('wheel', preventScroll, {
		passive: true,
	})
}

const resetSize = () => {
	vw.value = document.documentElement.clientWidth
	vh.value = document.documentElement.clientHeight
}

onMounted(() => {
	window.addEventListener('click', closeMenu, true)
	window.addEventListener('contextmenu', closeMenu, true)
	window.addEventListener('resize', resetSize)
})

onUnmounted(() => {
	window.removeEventListener('click', closeMenu, true)
	window.removeEventListener('contextmenu', closeMenu, true)
	window.removeEventListener('resize', resetSize, true)
	enableScroll()
})

const handleClick = item => {
	visible.value = false
	emit('select', item)
}

const handleSizeChange = size => {
	width.value = size.width
	height.value = size.height
}

const onBeforeEnter = el => {
	// 设置初始状态
	el.style.opacity = 0
	el.style.transform = 'scale(0.8)'
}

const onAfterEnter = el => {
	// 动画结束后重置样式
	el.style.opacity = ''
	el.style.transform = ''
}
</script>

<style lang="scss" scoped>
.pop_confirm {
	position: fixed;
	overflow: hidden;
	padding: 5px 5px;
	background-color: #fafafa;
	box-shadow:
		0 10px 40px rgba(0, 0, 0, 0.2),
		0 0 0 1px rgba(0, 0, 0, 0.05);
	border-radius: 4px;
	z-index: 9999999999999999;
	.menu_list {
		.menu_item {
			display: flex;
			align-items: center;
			margin: 3px 0;
			border-radius: 4px;
			cursor: pointer;
			padding: 3px 10px;
			box-sizing: border-box;
			transition: background-color 0.2s;
			color: #333;
			&:hover {
				background-color: rgba($color: gray, $alpha: 0.2);
			}
			.icon_box {
				margin-right: 5px;
				width: 20px;
				height: 30px;
				display: flex;
				justify-content: flex-start;
				align-items: center;
				i {
					color: #505050;
					font-size: 16px;
				}
			}
		}

		.hr {
			position: relative;
			margin: 3px 0;
			width: 100%;
			height: 1px;
			margin: 0.34rem 0.85rem;
			background: linear-gradient(
				90deg,
				rgba(148, 163, 184, 0),
				rgba(148, 163, 184, 0.34),
				rgba(148, 163, 184, 0)
			);
		}
	}
}

.zoom-bounce-enter-active {
	animation: zoomBounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 离开动画 */
.zoom-bounce-leave-active {
	animation: zoomOut 0.2s ease-in forwards;
}

/* 弹性缩放进入动画 */
@keyframes zoomBounceIn {
	0% {
		opacity: 0;
		transform: scale(0.7) translateY(-10px);
	}
	30% {
		opacity: 1;
		transform: scale(1.08) translateY(2px);
	}
	60% {
		transform: scale(0.96) translateY(-1px);
	}
	100% {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}

/* 平滑缩小离开动画 */
@keyframes zoomOut {
	0% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0;
		transform: scale(0.8);
	}
}
</style>
