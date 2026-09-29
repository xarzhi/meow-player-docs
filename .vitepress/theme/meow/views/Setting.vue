<template>
	<div class="meow_main">
		<div class="main_center">
			<Menu @menuClick="menuClick" :menuList="menuList" />
			<div class="content">
				<router-view v-slot="{ Component }">
					<transition name="slide" :duration="{ enter: 500, leave: 300 }">
						<component :is="Component" />
					</transition>
				</router-view>
			</div>
		</div>
	</div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import Menu from '@/components/Menu.vue'

const menuList = reactive([
	{
		title: '通用',
		path: '/main_window/setting/common',
		icon: 'icon-General',
	},
	{
		title: '外观',
		path: '/main_window/setting/appearance',
		icon: 'icon-performance',
	},
	{
		title: '歌词',
		path: '/main_window/setting/lyrics',
		icon: 'icon-lyrics-window',
	},
])

const router = useRouter()

const menuClick = (item, index) => {
	router.push(item.path ?? '/')
}
</script>

<style lang="scss" scoped>
.meow_main {
	overflow: auto;
	display: flex;
	height: 100%;
	width: 100%;
	flex-direction: column;

	.main_center {
		display: flex;
		width: 100%;
		height: calc(100vh - (var(--top-height) + var(--player-height)));
		overflow: hidden;
		.content {
			flex: 1;
			background-color: var(--content-bg-color);
			transition: all 0.3s;
			box-sizing: border-box;
		}
	}
}

.slide-enter-active,
.slide-leave-active {
	transition: all 0.3s ease-out;
}

.slide-enter-from {
	opacity: 0;
	margin-top: 50px;
}

.slide-leave-to {
	opacity: 0;
	margin-top: 0;
	display: none;
}
</style>

<style>
.ant-popover-inner {
	padding: 0 !important;
}
</style>
