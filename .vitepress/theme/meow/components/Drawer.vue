<template>
	<Teleport to="body">
		<Transition name="fade">
			<div class="drawer_cover" @click="visible = false" v-if="visible"></div>
		</Transition>
		<Transition name="drawer">
			<div
				class="drawer_box"
				:style="{
					width: drawerWidth,
					background: drawerBackground,
				}"
				v-if="visible"
				@click.self="visible = false"
			>
				<div
					class="drawer"
					:style="{
						height: drawerHeight,
						'min-height': drawerMinHeight,
						'max-height': drawerMaxHeight,
					}"
				>
					<div class="drawer_top" ref="drawer_top">
						<slot name="top" v-if="slots.top"></slot>
						<div v-else class="top" v-if="topbar">
							<div class="top_left">
								<div>{{ title }}</div>
							</div>
							<div class="top_center"></div>
							<div class="top_right">
								<div class="btn" @click="close">
									<i class="iconfont icon-close"></i>
								</div>
							</div>
						</div>
					</div>
					<div class="middle scroll_bar">
						<slot></slot>
					</div>
					<div class="drawer_bottom" ref="drawer_bottom">
						<slot name="bottom" v-if="slots.bottom"></slot>
						<div class="bottom" v-else v-if="footbar">
							<button @click="close">取消</button>
							<button>确定</button>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import { useSlots, watch } from 'vue'
const props = defineProps({
	drawerBackground: {
		type: String,
		default: 'transparent',
	},
	title: {
		type: String,
		default: '标题',
	},
	footbar: {
		type: Boolean,
		default: true,
	},
	topbar: {
		type: Boolean,
		default: true,
	},
	drawerWidth: {
		type: String,
		default: '400px',
	},
	drawerMinHeight: {
		type: String,
		default: '',
	},
	drawerMaxHeight: {
		type: String,
		default: '',
	},
	drawerHeight: {
		type: String,
		default: '400px',
	},
})
const slots = useSlots()
const visible = defineModel()

const emit = defineEmits(['visibleChange'])
const close = () => {
	visible.value = false
}

watch(visible, newV => {
	emit('visibleChange', newV)
})

defineExpose({
	close,
})
</script>

<style lang="scss" scoped>
.drawer_cover {
	position: fixed;
	height: 100vh;
	width: 100vw;
	top: 0;
	left: 0;
	background-color: transparent;
	z-index: 999;
	display: flex;
	justify-content: end;
	backdrop-filter: blur(2px);
}

.drawer_box {
	height: 100%;
	display: flex;
	align-items: center;
	position: fixed;
	top: 0;
	right: 0;
	z-index: 1000;
	box-sizing: border-box;
	--bottom-height: 60px;
	--top-height: 50px;
	.drawer {
		width: 100%;
		min-height: 400px;
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;
		max-height: 60vh;
		height: 10000px;
		overflow: hidden;
		display: flex;
		align-items: center;
		flex-flow: column;
		box-sizing: border-box;
		position: relative;
		box-shadow: 0px 0px 10px 3px rgba($color: #8d8d8d, $alpha: 0.2);
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(10px);
		padding-bottom: 10px;
		.drawer_top {
			width: 100%;
			padding: 0 20px;
			height: var(--top-height);
			.top {
				width: 100%;
				display: flex;
				align-items: center;
				justify-content: space-between;
				box-sizing: border-box;
				border-bottom: 1px solid #f1efef;
				// border: 1px solid #000;

				& > div {
					flex: 1 1 33.33%;
				}

				.top_left {
					font-size: 16px;
				}

				.top_right {
					display: flex;
					justify-content: end;

					.btn {
						width: 30px;
						height: 30px;
						border-radius: 5px;
						display: flex;
						justify-content: center;
						align-items: center;
						cursor: pointer;

						i {
							color: gray;
						}

						&:hover {
							background-color: rgba($color: gray, $alpha: 0.1);
						}
					}
				}
			}
		}

		.middle {
			width: 100%;
			height: calc(100% - var(--bottom-height) - var(--top-height));
			flex: 1;
		}

		.drawer_bottom {
			width: 100%;
			height: var(--bottom-heigh);
			.bottom {
				width: 100%;
				height: 60px;
				display: flex;
				align-items: center;
				justify-content: space-around;
			}
		}
	}
}

.drawer-enter-active,
.drawer-leave-active {
	transition: transform 0.2s cubic-bezier(0.89, -0.1, 0.85, 1.03);
}

.drawer-enter-from {
	transform: translateX(100%);
}

.drawer-leave-to {
	transform: translateX(100%);
}
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s;
}

.fade-enter-from {
	opacity: 0;
}

.fade-leave-to {
	opacity: 0;
}
</style>
