<template>
	<Modal title="选择路径" v-model="visible" width="60vw">
		<div class="infobox">
			<div class="item">
				<div class="label">连接名称</div>
				<div class="wrapper">{{ playerStore.cloud.connectName }}</div>
			</div>
			<div class="item">
				<div class="label">连接协议</div>
				<div class="wrapper">{{ playerStore.cloud.contract }}</div>
			</div>
			<div class="item">
				<div class="label">连接地址</div>
				<div class="wrapper">{{ playerStore.cloud.webdavUrl }}</div>
			</div>
		</div>
		<div class="breadcrumbs" v-if="list.length">
			<div class="bread_wrapper">
				<div class="bread" @click="breadJump('/')">Home</div>
				<span v-if="breadcrumbs.length">
					<i class="iconfont icon-right-arrow"></i>
				</span>
			</div>
			<div class="bread_list" v-for="(item, index) in breadcrumbs" :key="index">
				<div class="bread_wrapper">
					<div class="bread" @click="breadJump(item)">{{ item.item }}</div>
					<span v-if="index !== breadcrumbs.length - 1">
						<i class="iconfont icon-right-arrow"></i>
					</span>
				</div>
			</div>
		</div>
		<div class="list_box scroll_bar">
			<template v-if="list.length">
				<div class="single" v-for="(item, index) in list" :key="index" @click="handleChoose(item)">
					<div class="left">
						{{ item.filename.replace('/', '') }}
					</div>
					<div class="right">
						<i v-if="item.type === 'directory'" class="iconfont icon-right-arrow"></i>
					</div>
				</div>
			</template>
			<template v-else>
				<div class="empty_box">
					<div class="empty">Empty</div>
					<div class="text">空空如也~~</div>
				</div>
			</template>

			<div class="loading" v-if="loading"></div>
		</div>
		<footer v-if="list.length">
			<div class="left">当前路径：{{ currentPath }}</div>
			<div class="right">
				<a-button @click="handleSubmit">开始扫描</a-button>
			</div>
		</footer>
	</Modal>
</template>

<script setup>
import Modal from '@/components/Modal.vue'
import { createClient } from 'webdav/web'
import { onMounted, ref, watch } from 'vue'
import { invoke } from '@utils/api'
import { usePlayerStore } from '@/stores/index.js'

const playerStore = usePlayerStore()
const visible = defineModel()
const list = ref([])
const currentPath = ref('/')
const loading = ref(false)
const breadcrumbs = ref([])
const client = ref(null)

onMounted(() => {
	console.log(playerStore.cloud)
})
watch(visible, n => {
	if (n) {
		client.value = createClient('/webdav', {
			username: playerStore.cloud.username,
			password: playerStore.cloud.password,
		})
		loadData()
	}
})

const handleChoose = item => {
	if (item.type === 'directory') {
		currentPath.value = item.filename
		loadData(currentPath.value)
	}
}

const loadData = async (path = '/') => {
	loading.value = true

	list.value = await client.value.getDirectoryContents(path)

	const splitPath = path.split('/').filter(Boolean)
	breadcrumbs.value = splitPath.map((item, index) => {
		const path = splitPath.filter((itm, idx) => idx <= index).join('/')
		return {
			item,
			path: '/' + path,
		}
	})
	loading.value = false
	// console.log(list.value)
}

const breadJump = item => {
	loadData(item.path)
	currentPath.value = item.path
}
const MUSIC_EXT = /\.(mp3|flac|wav|ogg|m4a|ape|wma|aac|opus)$/i
const handleSubmit = async () => {
	const list = await client.getDirectoryContents(currentPath.value, { deep: true })
	const res = await invoke('scan_cloud_list', {
		list: list
			.filter(item => MUSIC_EXT.test(item.basename))
			.map(item => ({
				...item,
				path: item.filename,
				lastmod: new Date(item.lastmod).toISOString(),
			})),
	})
	// console.log(res)
}
</script>

<style lang="scss" scoped>
.infobox {
	margin-bottom: 10px;
	.item {
		display: flex;
		padding: 3px 10px;
		.label {
			width: fit-content;
			padding-right: 10px;
			position: relative;
			margin-right: 10px;
			&::after {
				content: ':';
				position: absolute;
				top: 50%;
				transform: translateY(-50%);
				right: 0;
			}
		}
	}
}
.breadcrumbs {
	margin-bottom: 10px;
	display: flex;
	padding-left: 5px;
	.bread_list {
		display: flex;
		align-items: center;
	}
	.bread_wrapper {
		align-items: center;
		display: flex;
	}
	.bread {
		font-size: 12px;
		background-color: rgba($color: #fff, $alpha: 0.5);
		border-radius: 3px;
		height: 20px;
		display: flex;
		align-items: center;
		padding: 3px 5px;
		border: 1px solid rgba($color: #000000, $alpha: 0.3);
		cursor: pointer;
	}
	i {
		font-size: 12px;
		margin: 0 3px;
		color: #333;
	}
}
.list_box {
	overflow-y: auto;
	overflow-x: hidden;
	max-height: 500px;
	position: relative;
	padding: 5px;
	.empty_box {
		height: 200px;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-flow: column;
		.empty {
			font-size: 12px;
			padding: 3px 5px;
			border-radius: 3px;
			border: 1px solid #fff;
			margin-bottom: 10px;
		}
	}
	.single {
		margin-bottom: 5px;
		padding: 10px 10px;
		cursor: pointer;
		border-radius: 5px;
		background-color: rgba($color: #fff, $alpha: 0.5);
		display: flex;
		justify-content: space-between;
		align-items: start;
		.right {
			i {
				font-size: 12px;
			}
		}
		&:hover {
			background-color: rgba(255, 255, 255, 0.4);
		}
	}
	.loading {
		position: absolute;
		border-radius: 5px;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba($color: #000, $alpha: 0.1);
	}
}

footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 10px;
}
</style>
