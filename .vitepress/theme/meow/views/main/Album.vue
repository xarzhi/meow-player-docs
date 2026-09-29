<template>
	<div class="album">
		<div class="head">
			<div class="cover">
				<img :src="transformPath(route.query.cover)" alt="" />
			</div>
			<div class="info">
				<div class="albumname">{{ route.query.album }}</div>
				<div class="artist">作者：{{ route.query.artist }}</div>
				<div class="opt_box"></div>
			</div>
		</div>
		<div class="list_box scroll_bar" v-if="list && list.length > 0">
			<template v-for="(item, index) in list" :key="item.id">
				<ContextMenu @select="handleSelect($event, item, index)" :menu>
					<div
						ref="lis"
						:data-id="item.id"
						:class="{
							single: true,
							active: item.id === playerStore.currentSong?.id,
						}"
						@dblclick="clickToPlay(item, index)"
						@contextmenu="handleRightClick(item, index)"
					>
						<div class="left">
							<Playing :play="item.id === playerStore.currentSong?.id" />
							<div class="img_box">
								<img :src="transformPath(item.cover)" />
							</div>
							<div class="info_box">
								<div class="title">{{ item.title }}</div>
								<div class="artist">{{ item.artist }}</div>
							</div>
						</div>
						<div class="center">
							<div class="album">{{ item.album }}</div>
						</div>
						<div class="right">
							<div class="durition">{{ item.durationStr }}</div>
						</div>
					</div>
				</ContextMenu>
			</template>
		</div>
	</div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { convertFileSrc, invoke } from '@utils/api'
import ContextMenu from '@/components/ContextMenu.vue'
import { usePlayerStore } from '@/stores/index.js'
import usePlayer from '@hooks/usePlayer.js'
import Playing from '@/components/Playing.vue'

const playerStore = usePlayerStore()
const route = useRoute()
const player = usePlayer()

const list = ref([])
const contextTempSong = reactive({
	song: null,
	index: -1,
})

onMounted( () => {
	console.log(route.query.album)
	loadData(route.query.album)
})

const loadData = async album => {
	const res = await invoke('get_album_by_album_name', {
		album,
	} )
	console.log(res)
	list.value = res
}

const transformPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}
const handleRightClick = (item, index) => {
	contextTempSong.song = item
	contextTempSong.index = index
}
const clickToPlay = song => {
	playerStore.setPlayingList(list.value)
	const index = playerStore.playingList.findIndex(item => item.id === song.id)
	player.loadTrack(index)
}
const handleSelect = (select, item, index) => {
	const contextItem = menu.find(item => item.label === select.label)
	contextItem.fun && contextItem.fun(select, item, index)
}
const menu = reactive([
	{
		label: '播放',
		icon: 'icon-play',
		fun: () => {
			if (!playerStore.playingList.length) {
				playerStore.updatePlayingList()
			}
			const index = playerStore.playingList.findIndex(item => item.id === contextTempSong.song.id)
			player.loadTrack(index)
		},
	},

	{
		label: '下一首播放',
		icon: 'icon-next',
		fun: () => {
			if (playerStore.currentSong.id) {
				const current_song_index = playerStore.getCurrentIndex()
				const index = playerStore.playingList.findIndex(item => item.id === contextTempSong.song.id)
				const [swapSong] = playerStore.playingList.splice(index, 1)
				const swapIndex = index < current_song_index ? current_song_index : current_song_index + 1
				playerStore.playingList.splice(swapIndex, 0, swapSong)
			}
		},
	},
	{
		type: 'hr',
	},
	{
		label: '在资源管理器中打开',
		icon: 'icon-folder',
		fun: (select, item) => {
			revealItemInDir(item.path)
		},
	},
	{
		label: '从列表中移出',
		icon: 'icon-remove',
		fun: (select, item) => {},
	},
	{
		label: '删除文件',
		icon: 'icon-delete',
		fun: (select, item) => {},
	},
	{
		label: '查看歌曲详情',
		icon: 'icon-xiangqing',
		fun: (select, item) => {},
	},
])
</script>

<style lang="scss" scoped>
.album {
	color: var(--primary-text-color);
	padding: 0 10px;
	height: 100%;
}
.head {
	display: flex;
	margin-top: 20px;
	margin-bottom: 10px;
	.cover {
		width: 150px;
		height: 150px;
		border-radius: 8px;
		box-shadow: 0 0 5px 0 #818181;
		margin-right: 20px;
		img {
			width: 100%;
			height: 100%;
			border-radius: 8px;
		}
	}
	.info {
		.albumname {
			font-size: 26px;
			margin-top: 10px;
			margin-bottom: 15px;
		}
		.artist {
			color: var(--sub-text-color);
		}
	}
}

.list_box {
	padding-right: 10px;
	overflow-y: auto;
	overflow-x: hidden;
	height: calc(100% - 160px);
	position: relative;
	mask-image: linear-gradient(to bottom, transparent 0%, black 0, black calc(100% - 30px), transparent 100%);
	.single {
		padding-left: 5px;
		height: 60px;
		display: flex;
		align-items: center;
		font-size: 14px;
		border-radius: 3px;
		margin-bottom: 2px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		&:hover {
			background-color: rgba($color: #e1e0e0, $alpha: 0.5);
		}

		.left,
		.center,
		.right {
			flex: 1 1 33.33%;
			min-width: 0;
		}

		.left {
			display: flex;

			.img_box {
				width: 40px;
				height: 40px;
				border-radius: 3px;
				margin-right: 15px;
				box-shadow: 1px 1px 3px 0.51px rgba(0, 0, 0, 0.2);
				img {
					width: 100%;
					height: 100%;
				}
			}

			.info_box {
				padding: 3px 0;
				display: flex;
				flex-direction: column;
				justify-content: space-between;

				.title {
					font-weight: 500;
					font-family: var(--font-family);
					color: var(--primary-text-color);
				}

				.artist {
					font-size: 12px;
					font-family: var(--font-family);
					color: var(--sub-text-color);
				}
			}
		}

		.center {
			color: oklch(55.1% 0.027 264.364);
			font-size: 12px;

			.album {
				font-family: var(--font-family);
				color: var(--sub-text-color);
			}
		}

		.right {
			display: flex;
			justify-content: end;
			padding-right: 50px;
			color: oklch(55.1% 0.027 264.364);
			font-size: 12px;
			.durition {
				font-family: var(--font-family);
				color: var(--sub-text-color);
			}
		}

		img {
			width: 30px;
			height: 30px;
			border-radius: 3px;
			overflow: hidden;
			background-color: aqua;
			margin-right: 8px;
		}
	}
}
</style>
