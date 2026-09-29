<template>
	<div
		class="menu"
		:style="{
			width: menuCollapase ? '50px' : '230px',
		}"
	>
		<div
			v-for="(item, index) in menuList"
			:key="index"
			:data-menu-collapase="menuCollapase ? 'none' : 'block'"
			@click="menuClick(item, index)"
			:class="{
				menu_item: true,
				active: isActive(item),
			}"
		>
			<div class="left">
				<div class="icon">
					<i :class="`iconfont ${item.icon}`"></i>
				</div>
				<div class="title" v-if="!menuCollapase">{{ item.title }}</div>
			</div>
			<div class="right" v-if="!menuCollapase">
				<div class="icon btn" v-if="item.rightIcon" @click.stop="rightIconClick(item, index)">
					<i :class="`iconfont ${item.rightIcon}`"></i>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, toRefs } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/index.js'

const playerStore = usePlayerStore()
const { menuCollapase } = toRefs(playerStore)

const props = defineProps({
	menuList: {
		type: Array,
		default: [],
	},
})
const emit = defineEmits(['menuClick'])
const route = useRoute()
const key = ref(0)

const menuClick = (item, index) => {
	key.value = index
	emit('menuClick', item, index)
}
const rightIconClick = (item, index) => {
	emit('rightIconClick', item, index)
}

const isActive = item => {
	return item.path === route.path
}

defineExpose({ menuClick })
</script>

<style lang="scss" scoped>
.menu {
	box-sizing: border-box;
	border-right: 1px solid var(--menu-border-color);
	padding-left: 10px;
	padding-right: 10px;
	background-color: var(--menu-bg-color);
	height: 100%;
	padding-top: 5px;
	transition: all 0.3s;
	.menu_item {
		width: 100%;
		cursor: pointer;
		height: 40px;
		display: flex;
		align-items: center;
		box-sizing: border-box;
		padding: 8px 20px;
		min-width: 40px;
		border-radius: 6px;
		transition: all 0.5s;
		margin-bottom: 3px;
		position: relative;
		justify-content: space-between;
		.left {
			display: flex;
		}

		&:hover {
			&:not(.active) {
				background-color: var(--menu-hover-bg);
			}
			.right {
				.btn {
					opacity: 1;
				}
			}
		}

		&::before {
			content: '';
			background: var(--menu-active-bar-color);
			position: absolute;
			width: 5px;
			height: 18px;
			border-radius: 3px;
			top: 50%;
			transform: translateY(-50%);
			left: 5px;
			opacity: 0;
			transition: opacity 0.3s;
			visibility: hidden;
			transition:
				opacity 0.3s,
				visibility 0.3s;
		}
		&[data-menu-collapase='none'] {
			padding: 8px 10px;
		}
		&[data-menu-collapase='block']::before {
			visibility: visible;
		}
		&[data-menu-collapase='none']::before {
			opacity: 0;
			visibility: hidden;
		}

		.icon {
			width: 20px;
			height: 20px;
			margin-right: 8px;
			border-radius: 5px;
			display: flex;
			justify-content: center;
			align-items: center;
			color: #333;
			i {
				color: var(--menu-active-text-color);
			}
		}

		.title {
			font-size: 18px;
			line-height: 20px;
			color: var(--primary-text-color);
			font-family: var(--font-family);
			white-space: nowrap;
		}
		.right {
			.btn {
				opacity: 0;
				width: 25px;
				height: 25px;
				display: flex;
				justify-content: center;
				align-items: center;
				transition: opacity 0.3s;
				&:hover {
					background-color: rgba(255, 255, 255, 0.5);
					padding: 5px;
				}
			}
		}
	}

	.active {
		background-color: var(--menu-active-bg-clolr);
		.title {
			color: var(--menu-active-text-color);
		}

		&::before {
			opacity: 1;
		}
	}
}
</style>
