<template>
	<div class="common">
		<div class="setting_box">
			<div class="single_set">
				<div class="left">
					<div class="title">音乐库路径</div>
					<div class="desc">本地音乐文件夹路径</div>
				</div>
				<div class="right">
					<a-popover placement="bottom">
						<template #content>
							<span class="popoverContent">刷新音乐库</span>
						</template>
						<a-button
							shape="circle"
							@click="updateMusicLib"
							:icon="h(RedoOutlined)"
							style="margin-right: 10px"
						/>
					</a-popover>
					<a-popover placement="bottom">
						<template #content>
							<span class="popoverContent">清空音乐库</span>
						</template>
						<a-button shape="circle" @click="handleDeleteAll" :icon="h(DeleteOutlined)" />
					</a-popover>
				</div>
			</div>
			<Drop
				:extensions="['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']"
				title="点击或拖入文件以添加音乐库目录"
				@selected="selected"
				dir
				multiple
			/>

			<div class="musicLibList">
				<div class="path_wrapper" v-for="(path, index) in musicLibPaths" :key="index">
					<div class="path">
						{{ path }}
					</div>
					<div class="delete">
						<i @click="deleteByMusicLibPath(path)" class="iconfont icon-minimize"> </i>
					</div>
				</div>
			</div>
		</div>
		<div class="setting_box">
			<div class="single_set">
				<div class="left">
					<div class="title">关闭行为</div>
					<div class="desc">右上角 X 点击后的行为</div>
				</div>
				<div class="right">
					<a-select v-model:value="closeBehavior" style="width: 200px">
						<a-select-option value="tray">最小化至托盘</a-select-option>
						<a-select-option value="close">退出程序</a-select-option>
					</a-select>
				</div>
			</div>
		</div>
		<div class="setting_box">
			<div class="single_set">
				<div class="left">
					<div class="title">窗口置顶</div>
				</div>
				<div class="right">
					<a-switch v-model:checked="isWindowAllwaysOntop" @change="handleWindowAllwaysOntopChange" />
				</div>
			</div>
		</div>
		<div class="setting_box">
			<div class="single_set line">
				<div class="left">
					<div class="title">开机自启</div>
				</div>
				<div class="right">
					<a-switch v-model:checked="autoStart" @change="autoStartChange" />
				</div>
			</div>
			<div class="single_set">
				<div class="left">
					<div class="title disabled">静默启动</div>
				</div>
				<div class="right">
					<a-switch
						:disabled="!autoStart"
						v-model:checked="autoStartInSlience"
						@change="autoStartInSlienceChange"
					/>
				</div>
			</div>
		</div>
		<ConfirmModal v-model="visible" :title="modalTitle" @ok="handleOk">
			<template #desc> 注意：本操作不会删除真实文件 </template>
		</ConfirmModal>
	</div>
</template>

<script setup>
import useStorage from '@/hooks/useStorage'
import {  toRefs, h, ref } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart'
import { invoke } from '@utils/api'
import Drop from '@/components/Drop.vue'
import { RedoOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const window = getCurrentWindow()
const playerStore = usePlayerStore()
const { storage } = useStorage()
const visible = ref(false)
const modalTitle = ref('确认清空音乐库？')

const { closeBehavior, isWindowAllwaysOntop, autoStart, autoStartInSlience, musicLibPaths } = toRefs(playerStore)

const handleOk = async () => {
	await invoke('clear_music_lib')
	musicLibPaths.value = []
	storage.removeItem('musicLibPaths')

	visible.value = false
}

const selected = async paths => {
	for (const path of paths) {
		const res = await invoke('scan_dir', { musicLibPath: path })
	}
	const musicLibPathsLocal = JSON.parse(await storage.getItem('musicLibPaths')) || []
	paths.forEach(item => {
		if (!musicLibPathsLocal.includes(item)) {
			musicLibPathsLocal.push(item)
		}
	})
	musicLibPaths.value = musicLibPathsLocal
	await storage.setItem('musicLibPaths', JSON.stringify(musicLibPathsLocal))
}

const deleteByMusicLibPath = async path => {
	try {
		const res = await invoke('delete_by_music_lib_path', { path })
		if (res) {
			const paths = JSON.parse(await storage.getItem('musicLibPaths'))
			const index = paths.findIndex(item => item === path)
			if (index !== null && index !== undefined) {
				paths.splice(index, 1)
			}
			musicLibPaths.value = paths
			storage.setItem('musicLibPaths', JSON.stringify(paths))
		}
	} catch (error) {
		console.error(error)
	}
}

const updateMusicLib = () => {}

const handleDeleteAll = async () => {
	visible.value = true
}

const handleWindowAllwaysOntopChange = async e => {
	const isAlwaysOnTop = await window.isAlwaysOnTop()
	await window.setAlwaysOnTop(!isAlwaysOnTop)
	storage.setItem('isWindowAllwaysOntop', isWindowAllwaysOntop.value)
}

const autoStartChange = async value => {
	if (value) {
		await enable()
	} else {
		await disable()
		autoStartInSlience.value = false
	}
	storage.setItem('autoStart', autoStart.value)
}
const autoStartInSlienceChange = async e => {
	storage.setItem('autoStartInSlience', autoStartInSlience.value)
}
</script>

<style lang="scss" scoped>
.common {
	padding: 10px 10px;

	.setting_box {
		border-radius: 8px;
		padding: 10px 30px;
		margin-bottom: 20px;
		background-color: rgba($color: #fafafa, $alpha: 0.5);
		border: 1px solid rgba($color: #f0f0f0, $alpha: 0.6);
		box-sizing: border-box;
		box-shadow: 1px 1px 5px 0 rgba($color: #000000, $alpha: 0.1);
		.single_set {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 5px 0;

			.left {
				.title {
					font-weight: 600;
					color: #333;
					height: 100%;
					&.disabled {
						color: #5a5a5a;
					}
				}
				.desc {
					color: #494949;
					margin-top: 5px;
					font-size: 14px;
				}
			}
		}
		.musicLibList {
			margin-top: 10px;
			.path_wrapper {
				padding: 10px 10px;
				background: rgba($color: #f7f8fa, $alpha: 0.3);
				margin-bottom: 5px;
				border-radius: 5px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				.path {
					color: #333;
					font-size: 14px;
				}
				.delete {
					i {
						font-size: 12px;
						color: #333;
						padding: 6px;

						border-radius: 3px;
						cursor: pointer;
						&:hover {
							background: rgba($color: #f7f8fa, $alpha: 0.5);
						}
					}
				}
				// background-color: ;
			}
		}
	}
}
.popoverContent {
	padding: 5px 10px;
	display: block;
}
</style>
