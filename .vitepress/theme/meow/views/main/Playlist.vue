<template>
	<div class="playlist_page">
		<!-- 左：歌单列表 -->
		<div class="pl_side">
			<div class="pl_head">
				<span>我的歌单</span>
				<a-button size="small" type="primary" @click="createOpen = true">新建</a-button>
			</div>
			<div class="pl_list scroll_bar">
				<div
					v-for="pl in playlists"
					:key="pl.id"
					class="pl_item"
					:class="{ active: pl.id === currentId }"
					@click="select(pl.id)"
				>
					<div class="pl_cover">
						<img v-if="pl.coverUrl" :src="convertFileSrc(pl.coverUrl)" alt="" />
						<i v-else class="iconfont icon-music-list"></i>
					</div>
					<div class="pl_meta">
						<div class="pl_name">{{ pl.name }}</div>
						<div class="pl_count">{{ pl.song_count }} 首</div>
					</div>
					<i class="iconfont icon-delete pl_del" title="删除歌单" @click.stop="removePlaylist(pl)"></i>
				</div>
				<div v-if="!playlists.length" class="pl_empty">还没有歌单，点「新建」创建一个</div>
			</div>
		</div>

		<!-- 右：歌单里的歌 -->
		<div class="pl_main">
			<div class="pl_main_head">
				<span class="pl_title">{{ current ? current.name : '选择一个歌单' }}</span>
				<span class="pl_total" v-if="current">{{ songs.length }} 首</span>
				<a-button v-if="current" size="small" class="add_btn" @click="openAdd">添加歌曲</a-button>
			</div>

			<div v-if="songs.length" class="song_list scroll_bar">
				<div
					v-for="(song, i) in songs"
					:key="song.id"
					class="song_row"
					:class="{ active: playerStore.currentSong.id === song.id }"
					@dblclick="play(i)"
				>
					<div class="idx">{{ i + 1 }}</div>
					<div class="cover">
						<img v-if="song.coverUrl" :src="convertFileSrc(song.coverUrl)" alt="" />
						<i v-else class="iconfont icon-music"></i>
					</div>
					<div class="meta">
						<div class="title">{{ song.title }}</div>
						<div class="sub">{{ song.artist }}</div>
					</div>
					<div class="album">{{ song.album }}</div>
					<div class="time">{{ song.durationStr }}</div>
					<i class="iconfont icon-remove del" title="移出歌单" @click.stop="removeSong(song)"></i>
				</div>
			</div>
			<div v-else class="pl_empty">
				{{ current ? '这个歌单还没有歌，点「添加歌曲」' : '左边选一个歌单' }}
			</div>
		</div>

		<!-- 新建歌单 -->
		<a-modal v-model:open="createOpen" title="新建歌单" :width="380" @ok="doCreate">
			<a-input v-model:value="newName" placeholder="歌单名字" allow-clear @press-enter="doCreate" />
		</a-modal>

		<!-- 添加歌曲 -->
		<a-modal v-model:open="addOpen" title="添加歌曲" :width="560" :footer="null">
			<div class="add_list scroll_bar">
				<div
					v-for="song in library"
					:key="song.id"
					class="add_row"
					:class="{ added: addedIds.has(song.id) }"
					@click="addSong(song)"
				>
					<span class="t">{{ song.title }}</span>
					<span class="a">{{ song.artist }}</span>
					<span class="st">{{ addedIds.has(song.id) ? '已添加' : '＋ 添加' }}</span>
				</div>
			</div>
		</a-modal>
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { convertFileSrc, invoke } from '@utils/api'
import usePlayer from '@hooks/usePlayer.js'

const playerStore = usePlayerStore()
const player = usePlayer()

const playlists = ref([])
const currentId = ref('')
const songs = ref([])
const library = ref([])
const createOpen = ref(false)
const addOpen = ref(false)
const newName = ref('')

const current = computed(() => playlists.value.find(p => p.id === currentId.value) || null)
const addedIds = computed(() => new Set(songs.value.map(s => s.id)))

const loadList = async () => {
	playlists.value = (await invoke('get_playlist_list')) || []
	if (!playlists.value.find(p => p.id === currentId.value)) {
		currentId.value = playlists.value[0]?.id || ''
	}
	songs.value = currentId.value ? (await invoke('get_playlist_songs', { id: currentId.value })) || [] : []
}

const select = async id => {
	currentId.value = id
	songs.value = (await invoke('get_playlist_songs', { id })) || []
}

const doCreate = async () => {
	const pl = await invoke('create_playlist', { name: newName.value.trim() || '新建歌单' })
	newName.value = ''
	createOpen.value = false
	currentId.value = pl?.id || currentId.value
	await loadList()
}

const removePlaylist = async pl => {
	await invoke('delete_playlist', { id: pl.id })
	if (currentId.value === pl.id) {
		currentId.value = ''
		songs.value = []
	}
	await loadList()
}

const openAdd = async () => {
	const res = await invoke('get_song_list', { cateKey: 'title', desc: false, searchText: [] })
	library.value = res?.list || []
	addOpen.value = true
}

const addSong = async song => {
	await invoke('add_to_playlist', { id: currentId.value, songIds: [song.id] })
	await loadList()
}

const removeSong = async song => {
	await invoke('remove_from_playlist', { id: currentId.value, songId: song.id })
	await loadList()
}

/** 双击播放：把歌单设为播放列表，再播这一首 */
const play = index => {
	playerStore.setPlayingList(songs.value)
	player.loadTrack(index)
}

onMounted(loadList)
</script>

<style lang="scss" scoped>
.playlist_page {
	display: flex;
	height: 100%;
	width: 100%;
	box-sizing: border-box;
	color: var(--primary-text-color);
}

/* 左侧歌单列表 */
.pl_side {
	width: 240px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--menu-border-color, rgba(128, 128, 128, 0.18));
	box-sizing: border-box;
}
.pl_head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 14px;
	font-size: 14px;
	font-weight: 600;
}
.pl_list {
	flex: 1;
	overflow-y: auto;
	padding: 0 8px 12px;
}
.pl_item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.2s;
	&:hover {
		background: var(--menu-hover-bg);
	}
	&.active {
		background: var(--menu-active-bg-clolr);
	}
	.pl_cover {
		width: 40px;
		height: 40px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--icon-bg-color);
		display: flex;
		align-items: center;
		justify-content: center;
		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		i {
			font-size: 18px;
			opacity: 0.6;
		}
	}
	.pl_meta {
		flex: 1;
		min-width: 0;
	}
	.pl_name {
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl_count {
		font-size: 12px;
		color: var(--sub-text-color);
		margin-top: 2px;
	}
	.pl_del {
		font-size: 14px;
		opacity: 0;
		transition: opacity 0.2s;
		color: var(--sub-text-color);
		&:hover {
			color: #e5484d;
		}
	}
	&:hover .pl_del {
		opacity: 1;
	}
}

/* 右侧歌曲 */
.pl_main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
.pl_main_head {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 16px;
	.pl_title {
		font-size: 16px;
		font-weight: 600;
	}
	.pl_total {
		font-size: 12px;
		color: var(--sub-text-color);
	}
	.add_btn {
		margin-left: auto;
	}
}
.song_list {
	flex: 1;
	overflow-y: auto;
	padding: 0 8px 12px;
}
.song_row {
	display: flex;
	align-items: center;
	gap: 12px;
	height: 50px;
	padding: 0 8px;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.2s;
	&:hover {
		background: var(--menu-hover-bg);
	}
	&.active {
		background: var(--menu-active-bg-clolr);
		.title {
			color: var(--menu-active-bar-color);
		}
	}
	.idx {
		width: 24px;
		font-size: 12px;
		color: var(--sub-text-color);
		text-align: center;
		flex-shrink: 0;
	}
	.cover {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--icon-bg-color);
		display: flex;
		align-items: center;
		justify-content: center;
		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		i {
			font-size: 16px;
			opacity: 0.6;
		}
	}
	.meta {
		flex: 1;
		min-width: 0;
	}
	.title {
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.sub {
		font-size: 12px;
		color: var(--sub-text-color);
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.album {
		width: 160px;
		font-size: 12px;
		color: var(--sub-text-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.time {
		width: 52px;
		font-size: 12px;
		color: var(--sub-text-color);
		text-align: right;
	}
	.del {
		font-size: 14px;
		opacity: 0;
		color: var(--sub-text-color);
		transition: opacity 0.2s;
		&:hover {
			color: #e5484d;
		}
	}
	&:hover .del {
		opacity: 1;
	}
}

.pl_empty {
	padding: 24px;
	font-size: 13px;
	color: var(--sub-text-color);
	text-align: center;
}

/* 添加歌曲弹窗 */
.add_list {
	max-height: 420px;
	overflow-y: auto;
}
.add_row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 10px;
	border-radius: 8px;
	cursor: pointer;
	font-size: 13px;
	&:hover {
		background: var(--menu-hover-bg);
	}
	.t {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.a {
		color: var(--sub-text-color);
		flex-shrink: 0;
	}
	.st {
		flex-shrink: 0;
		width: 64px;
		text-align: right;
		color: var(--menu-active-bar-color);
	}
	&.added {
		opacity: 0.55;
		.st {
			color: var(--sub-text-color);
		}
	}
}
</style>
