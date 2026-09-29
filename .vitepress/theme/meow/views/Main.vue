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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Menu from '@/components/Menu.vue'

const router = useRouter()

const menuList = [
	{
		title: '歌曲',
		path: '/main_window/main/musiclist',
		icon: 'icon-music',
	},
	{
		title: '专辑',
		path: '/main_window/main/albumlist',
		icon: 'icon-album',
	},
	{
		title: '音乐家',
		path: '/main_window/main/ArtistList',
		icon: 'icon-artist',
	},
]

onMounted(() => {
	// 取消系统默认右键菜单
	window.addEventListener('contextmenu', e => {
		e.preventDefault()
	})
	// 取消f5刷新
	if (import.meta.env.PROD) {
		window.addEventListener('keydown', e => {
			if (e.code === 'F5') {
				e.preventDefault()
			}
		})
	}
})

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
	transition: all 0.3s;
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
