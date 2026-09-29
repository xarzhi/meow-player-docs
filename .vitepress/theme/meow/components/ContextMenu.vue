<template>
	<div class="container" ref="containerRef" @contextmenu="contextmenu" @click="containerClick">
		<slot></slot>
		<Teleport to="body">
			<Transition name="zoom-bounce" @before-enter="onBeforeEnter" @after-enter="onAfterEnter">
				<div
					class="context_menu"
					v-size-ob="handleSizeChange"
					v-if="visible"
					:style="{
						left: pos.posX + 'px',
						top: pos.posY + 'px',
						width: props.width + 'px',
					}"
				>
					<div class="menu_list">
						<template v-for="(item, index) in menu" :key="index">
							<div v-if="item.type === 'hr'" class="hr"></div>
							<div v-else class="menu_item" @click="handleClick(item)">
								<div class="icon_box">
									<i :class="['iconfont', item.icon ?? '']"></i>
								</div>
								{{ item.label }}
							</div>
						</template>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue'
import vSizeOb from '@/directives/sizeOb'

const emit = defineEmits(['select'])

const width = ref()
const height = ref()
const x = ref(0)
const y = ref(0)
const visible = ref(false)
const vw = ref(document.documentElement.clientWidth)
const vh = ref(document.documentElement.clientHeight)

const props = defineProps({
	menu: {
		type: Array,
		required: true,
	},
	width: {
		type: Number,
		default: 250,
	},
	openType: {
		type: String,
		default: 'contextmenu',
	},
})

const pos = computed(() => {
	let posX = x.value
	let posY = y.value
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
.context_menu {
	position: fixed;
	overflow: hidden;
	padding: 5px 10px;
	background-color: #fafafa;
	box-shadow:
		0 10px 40px rgba(0, 0, 0, 0.2),
		0 0 0 1px rgba(0, 0, 0, 0.05);
	border-radius: 10px;
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
