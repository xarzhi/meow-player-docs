<template>
	<teleport to="body">
		<transition name="cover-fade">
			<div class="cover" v-if="visible" @click.self="handleCancel">
				<transition name="zoom-bounce" appear>
					<div
						class="modal"
						:style="{
							width: props.width || 'auto',
						}"
					>
						<header>
							<div class="title">{{ props.title }}</div>
							<div class="cancel" @click="handleCancel">
								<i class="iconfont icon-close"></i>
							</div>
						</header>
						<div class="content">
							<slot></slot>
						</div>
						<footer v-if="props.footer">
							<button @click="handleCancel">取消</button>
							<button @click="handleOk">确定</button>
						</footer>
					</div>
				</transition>
			</div>
		</transition>
	</teleport>
</template>

<script setup>
import { onMounted, useSlots } from 'vue'
const props = defineProps({
	title: String,
	desc: String,
	footer: Boolean,
	width: String | Number,
})
const visible = defineModel()
const emit = defineEmits(['ok', 'cancel'])
onMounted(() => {
	// console.log(visible)
})

const handleOk = () => {
	emit('ok')
}
const handleCancel = () => {
	visible.value = false
	emit('cancel')
}
</script>

<style lang="scss" scoped>
.cover {
	width: 100vw;
	height: 100vh;
	display: flex;
	justify-content: center;
	align-items: center;
	position: fixed;
	top: 0;
	left: 0;
	z-index: 99;
	color: #333;
	backdrop-filter: blur(2px);
	background-color: rgba($color: #000000, $alpha: 0.2);
	.modal {
		padding: 8px 18px;
		background-color: rgba(255, 255, 255, 0.6);
		border-radius: 8px;
		min-width: 400px;
		min-height: 150px;
		display: flex;
		flex-flow: column;
		justify-content: space-between;
		box-shadow: 0 0 5px 0px #494949;
		backdrop-filter: blur(5px);

		header {
			color: #333;
			height: 30px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			i {
				cursor: pointer;
				font-size: 14px;
				padding: 5px;
				border-radius: 3px;
				&:hover {
					background-color: rgba($color: #000000, $alpha: 0.2);
				}
				&:active {
					transform: scale(0.9);
				}
			}
		}
		.content {
			color: #333;
			font-size: 14px;
			flex: 1;
			box-sizing: border-box;
			padding: 10px 0;
		}
		footer {
			color: #333;
			display: flex;
			justify-content: center;
			button {
				min-width: 80px;
				height: 30px;
				background-color: #fff;
				border: 1px solid #000;
				border-radius: 3px;
				cursor: pointer;
				&:hover {
					background-color: darken($color: #fff, $amount: 10);
				}
				&:nth-child(1) {
					margin-right: 80px;
				}
			}
		}
	}
}
.cover-fade-enter-active,
.cover-fade-leave-active {
	transition: opacity 0.25s ease;
}
.cover-fade-enter-from,
.cover-fade-leave-to {
	opacity: 0;
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
