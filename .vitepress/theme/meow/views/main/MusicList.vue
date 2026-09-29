<template>
	<div class="music_list">
		<div class="top">
			<div class="left">
				<div class="title">歌曲</div>
				<div class="num">
					{{ musicList.total }}
				</div>
			</div>
			<div class="right">
				<div class="btn update" @click="updateMusicLib">
					<i
						:class="{
							iconfont: true,
							'icon-update': true,
							rotating: rotating,
						}"
					></i>
				</div>
				<!-- <a-popover placement="bottomLeft" trigger="click" :arrow="false" v-model:open="sortKeyVisible">
					<template #content>
						<div class="sort_box">
							<div
								:class="{ sort_item: true, sort_active: item.key === playerStore.sort_cate }"
								@click="handleCate(item)"
								v-for="item in sortList"
							>
								{{ item.label }}
							</div>
						</div>
					</template>
					<div class="btn sort">
						<i class="iconfont icon-sort"></i>
					</div>
				</a-popover> -->
				<PopConfirm placement="bl">
					<template #content>
						<div class="sort_box">
							<div
								:class="{ sort_item: true, sort_active: item.key === playerStore.sort_cate }"
								@click="handleCate(item)"
								v-for="item in sortList"
							>
								<div class="icon_box" v-if="item.icon">
									<i :class="['iconfont', item.icon ?? '']"></i>
								</div>
								<div class="label">{{ item.label }}</div>
							</div>
						</div>
					</template>
					<div class="btn sort">
						<i class="iconfont icon-sort"></i>
					</div>
				</PopConfirm>

				<a-popover trigger="hover" placement="bottom" :arrow="false">
					<template #content>
						<div class="sort_mode">
							{{ playerStore.sort_mode === 'desc' ? '降序' : '升序' }}
						</div>
					</template>
					<div class="btn sort" @click="toggleSorter">
						<i class="iconfont icon-desc" v-if="playerStore.sort_mode === 'desc'"></i>
						<i class="iconfont icon-asc" v-if="playerStore.sort_mode === 'asc'"></i>
					</div>
				</a-popover>
				<SretchInput v-model="searchVal" @input="handleChange"></SretchInput>
			</div>
		</div>
		<div class="lists_outer scroll_bar" ref="lists_outer" v-if="musicList.list && musicList.list.length">
			<div v-for="(sortItem, sIndex) in musicList.list" class="lists_box" :key="sortItem.letter">
				<div
					class="sort_key"
					:data-letter="sortItem.letter"
					:data-id="sortItem.letter"
					:key="sortItem.letter"
					ref="sort_key"
				>
					{{ sortItem.letter }}
				</div>
				<div class="list_box" v-if="sortItem.data && sortItem.data.length > 0">
					<template v-for="(item, index) in sortItem.data" :key="item.id">
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
			<LetterElevator @click="letterTransport" :list="musicList.list" />
		</div>
		<div v-if="(!musicList.list.length || !musicList.list) && !searchVal" class="empty">
			<Drop
				:extensions="['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']"
				title="点击或拖入文件以添加音乐库目录"
				@selected="selected"
				dir
				multiple
			/>
		</div>

		<div class="anchor" @click="handleTransport" v-if="playerStore.currentSong?.id">
			<i class="iconfont icon-anchor"></i>
		</div>
	</div>
</template>

<script setup>
import { onMounted, reactive, ref, toRefs, computed } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { notification } from 'ant-design-vue'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { convertFileSrc, invoke } from '@utils/api'
import ContextMenu from '@/components/ContextMenu.vue'
import useStorage from '@/hooks/useStorage'
import useFlip from '@/hooks/useFlip'
import usePlayer from '@hooks/usePlayer.js'
import Playing from '@/components/Playing.vue'
import LetterElevator from '@/components/LetterElevator.vue'
import Drop from '@/components/Drop.vue'
import SretchInput from '@/components/SretchInput.vue'
import PopConfirm from '@/components/PopConfirm.vue'

const playerStore = usePlayerStore()
const player = usePlayer()
const { storage } = useStorage()
const { flip } = useFlip()

const lis = ref(null)
const sort_key = ref(null)
const lists_outer = ref(null)
const searchVal = ref('')
const sortKeyVisible = ref(false)
const rotating = ref(false)
const musicList = reactive({
	list: [],
	total: 0,
})
const { musicLibPaths, sort_cate } = toRefs(playerStore)
const contextTempSong = reactive({
	song: null,
	index: -1,
})

const searchList = computed(() => {
	return searchVal.value.split(' ').filter(Boolean)
})
const loadData = async (searchText = [], cateKey = 'title', desc = false) => {
	const res = await invoke('get_song_list', {
		cateKey,
		desc,
		searchText,
	})
	console.log(res)
	musicList.list = res.groups
	musicList.total = res.total
}
onMounted(async () => {
	const sort_cate = (await storage.getItem('sort_cate')) ?? 'title'
	const sort_mode = (await storage.getItem('sort_mode')) ?? 'desc'
	await loadData([], sort_cate, sort_mode === 'desc' ? true : false)
})
const getFlipDoms = () => {
	return [
		...lis.value.map(item => {
			const rect = item.getBoundingClientRect()
			return {
				dom: item,
				top: rect.top,
			}
		}),
		...sort_key.value.map(item => {
			const rect = item.getBoundingClientRect()
			return {
				dom: item,
				top: rect.top,
			}
		}),
	]
}

// 根据不同键排序
const handleCate = async item => {
	flip(
		async () => getFlipDoms(),
		async () => {
			sortKeyVisible.value = false
			await loadData(searchList.value, item.key, playerStore.sort_mode === 'desc' ? true : false)
		},
		async () => {
			sort_cate.value = item.key
			await storage.setItem('sort_cate', item.key)
			setPlayingList()
		}
	)
}

// 切换倒叙 升序
const toggleSorter = async () => {
	flip(
		async () => getFlipDoms(),
		async () => {
			await loadData(searchList.value, playerStore.sort_cate, playerStore.sort_mode === 'desc' ? false : true)
		},
		() => {
			playerStore.toggleSortMode()
			setPlayingList()
		}
	)
}

// 搜索
const handleChange = async e => {
	flip(
		async () => getFlipDoms(),
		async () => {
			await loadData(searchList.value, playerStore.sort_cate, playerStore.sort_mode === 'desc' ? false : true)
		},
		() => {}
	)
}
const transformPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}

const menu = reactive([
	{
		label: '播放',
		icon: 'icon-play',
		fun: () => {
			clickToPlay(contextTempSong.song)
		},
	},

	{
		label: '下一首播放',
		icon: 'icon-next',
		fun: () => {
			if (playerStore.currentSong?.id) {
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

const updateMusicLib = async () => {
	rotating.value = true
	playerStore
		.updateMusucLib()
		.then(() => {
			notification.success({
				message: '音乐库刷新成功',
				description: '难道又有新歌了嘛？',
				top: 60,
				duration: 2,
			})
		})
		.catch(() => {
			notification.success({
				message: '出现了问题',
				description: '我也不知道该咋办，嘿嘿',
				top: 60,
				duration: 2,
			})
		})
		.finally(() => {
			rotating.value = false
		})
}

const handleRightClick = (item, index) => {
	contextTempSong.song = item
	contextTempSong.index = index
}

/**
 *
 * @param select 选中的menu中的item
 * @param item 歌曲详情信息item
 * @param index 歌曲的index
 */
const handleSelect = (select, item, index) => {
	const contextItem = menu.find(item => item.label === select.label)
	contextItem.fun && contextItem.fun(select, item, index)
}

const selected = async paths => {
	await invoke('clear_music_lib')

	for (const path of paths) {
		const res = await invoke('scan_dir', { musicLibPath: path })
	}
	musicLibPaths.value = paths
	storage.setItem('musicLibPaths', JSON.stringify(paths))
	await loadData([], playerStore.sort_cate, playerStore.sort_mode === 'desc' ? false : true)
}

// 右边点击字母跳转到相应锚点
const letterTransport = letter => {
	const letterGroup = musicList.list.find(item => item.letter === letter)
	if (letterGroup && letterGroup.data && letterGroup.data.length) {
		const [first] = letterGroup.data
		if (lis.value && lis.value.length > 0 && first.id) {
			const aim = lis.value.find(item => Number(item.dataset.id) === first.id)
			aim &&
				lists_outer.value.scrollTo({
					top: aim.offsetTop - 18,
					behavior: 'smooth',
				})
		}
	}
}

// 当前播放音乐滚动到可视区域顶部
const handleTransport = () => {
	if (lis.value && lis.value.length > 0 && playerStore.currentSong?.id) {
		const activeItem = lis.value.find(item => Number(item.dataset.id) === playerStore.currentSong?.id)
		activeItem && activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
	}
}
const setPlayingList = () => {
	const list = musicList.list.reduce((cur, item) => {
		cur.push(...item.data)
		return cur
	}, [])
	playerStore.setPlayingList(list)
}

const clickToPlay = song => {
	if (!playerStore.playingList.length) {
		setPlayingList()
	}
	const index = playerStore.playingList.findIndex(item => item.id === song.id)
	player.loadTrack(index)
}

const sortList = [
	{ label: '标题', key: 'title', icon: 'icon-dabiaoti' },
	{ label: '艺术家', key: 'artist', icon: 'icon-tubiaomoban' },
	{ label: '专辑', key: 'album', icon: 'icon-zhuanji' },
	{ label: '时长', key: 'duration', icon: 'icon-shizhong' },
	{ label: '大小', key: 'size', icon: 'icon-11dengdaxiao' },
]
</script>

<style lang="scss" scoped>
.rotating {
	animation: rotating 1s linear infinite;
}
@keyframes rotating {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
.music_list {
	height: 100%;
	width: 100%;
	color: #333;
	position: relative;
	.top {
		display: flex;
		justify-content: space-between;
		padding: 10px 20px;
		box-sizing: border-box;
		height: 50px;

		.left {
			display: flex;
			align-items: center;
			padding-left: 6px;
			.title {
				font-size: 30px;
				color: var(--primary-text-color);
				vertical-align: text-top;
				margin-right: 20px;
			}

			.num {
				color: var(--primary-text-color);
				font-size: 24px;
				vertical-align: text-top;
			}
		}

		.right {
			display: flex;
			justify-content: end;

			.btn {
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
			}
		}
	}

	.anchor {
		position: fixed;
		width: 30px;
		height: 30px;
		border-radius: 5px;
		bottom: 105px;
		right: 100px;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: all 0.1s;

		i {
			font-size: 20px;
			transition: all 0.3s;
			color: gray;
		}

		&:active {
			transform: scale(0.9);
		}

		&:hover {
			i {
				color: #333;
			}
		}
	}
}

.lists_outer {
	overflow-y: auto;
	overflow-x: hidden;
	height: calc(100% - 50px);
	position: relative;
	mask-image: linear-gradient(to bottom, transparent 0%, black 0, black calc(100% - 30px), transparent 100%);
}

.empty {
	padding: 0 20px;
}

.lists_box {
	.sort_key {
		padding-left: 25px;
		position: sticky;
		top: 0;
		left: 0;
		height: 18px;
		font-size: 16px;
		background-color: var(--letter-ahcor-bg-color);
		color: var(--primary-text-color);
		transition: all 0.3s;
		background-color: var(--content-bg-color);
	}

	.list_box {
		.single {
			width: 100%;
			padding-left: 8px;
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
				// padding-left: 15px;

				.img_box {
					width: 40px;
					height: 40px;
					border-radius: 3px;
					margin-right: 15px;
					// border-top: 1px solid #fff;
					// border-left: 1px solid #fff;
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
}

.active {
	background-color: rgba($color: #c9d8ff, $alpha: 0.3);
}
</style>

<style lang="scss">
.ant-popover {
	z-index: 99;
}

.sort_mode {
	padding: 5px 8px;
	border-radius: 5px;
}

.sort_box {
	background-color: #fff;
	width: 120px;
	border-radius: 5px;

	.sort_item {
		cursor: pointer;
		padding: 3px 5px;
		border-radius: 3px;
		color: #333;
		margin-bottom: 2px;
		display: flex;
		.icon_box {
			margin-right: 5px;
			i {
				color: #333;
			}
		}
		&:last-child {
			margin-bottom: 0;
		}
		&:hover {
			background: rgba($color: #000000, $alpha: 0.3);
		}
		&:active {
			background: rgba($color: #000000, $alpha: 0.4);
		}
	}

	.sort_active {
		background: rgba($color: #000000, $alpha: 0.2);
	}
}
</style>
