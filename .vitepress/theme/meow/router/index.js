import { createMemoryHistory, createRouter } from 'vue-router'
// import MainWindow from '@/views/MainWindow.vue'
const routes = [
	{
		path: '/',
		redirect: '/main_window/main/musiclist',
	},
	{
		path: '/main_window',
		component: () => import('@/views/MainWindow.vue'),
		redirect: '/main_window/main/musiclist',
		children: [
			{
				path: 'main',
				component: () => import('@/views/Main.vue'),
				children: [
					{
						path: 'musiclist',
						component: () => import('@/views/main/MusicList.vue'),
					},
					{
						path: 'albumlist',
						component: () => import('@/views/main/AlbumList.vue'),
					},
					{
						path: 'album',
						component: () => import('@/views/main/Album.vue'),
					},
					{
						path: 'artistlist',
						component: () => import('@/views/main/ArtistList.vue'),
					},
					{
						path: 'artist',
						component: () => import('@/views/main/Artist.vue'),
					},
					{
						path: 'cloudmusic',
						component: () => import('@/views/main/CloudMusic.vue'),
					},
					{
						path: 'playlist',
						component: () => import('@/views/main/Playlist.vue'),
					},
				],
			},
			{
				path: 'setting',
				component: () => import('@/views/Setting.vue'),
				redirect: '/main_window/setting/common',
				children: [
					{
						path: 'common',
						component: () => import('@/views/setting/Common.vue'),
					},
					{
						path: 'appearance',
						component: () => import('@/views/setting/Appearance.vue'),
					},
					{
						path: 'lyrics',
						component: () => import('@/views/setting/Lyrics.vue'),
					},
					{
						path: 'cloud',
						component: () => import('@/views/setting/Cloud.vue'),
					},
				],
			},
		],
	},
	{
		path: '/lyrics_window',
		component: () => import('@/views/LyricsWindow.vue'),
	},
	{
		path: '/mini-player',
		component: () => import('@/views/MiniPlayer.vue'),
	},
]

const router = createRouter({
	// 嵌在文档站首页里跑：用内存路由，不去动浏览器的地址栏
	history: createMemoryHistory(),
	routes,
})


export default router
