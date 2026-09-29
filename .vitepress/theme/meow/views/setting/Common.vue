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
			<!-- 原来的拖拽组件（Drop）换成「选择文件夹」按钮：
			     支持 File System Access API 的浏览器（Chrome/Edge）走 showDirectoryPicker，
			     目录句柄存 IndexedDB，刷新后还能用；不支持的（Firefox/Safari）退回 webkitdirectory，
			     那条路只有本次会话有效。两条路都用后端同一份 scanFiles 读标签和封面。 -->
			<div class="add_lib">
				<a-button type="primary" :loading="dirBusy === 'pick'" @click="pickFolder">选择文件夹</a-button>
				<span class="add_lib_tip">
					{{
						dirSupported
							? '选中后会记住目录授权，刷新页面仍可用（扫描标签 + 封面）'
							: '选中后会扫描该文件夹里的音频（标签 + 封面）'
					}}
				</span>
				<input
					ref="folderInput"
					style="display: none"
					type="file"
					webkitdirectory
					multiple
					accept="audio/*"
					@change="onFolderPicked"
				/>
			</div>

			<!-- 已保存的音乐库目录：刷完页面靠 IndexedDB 里的目录句柄恢复。
			     权限是 prompt/denied 时不自动弹窗（浏览器要求用户手势），显示按钮等用户点。 -->
			<div class="dirList" v-if="musicDirs.length">
				<div class="path_wrapper" v-for="dir in musicDirs" :key="dir.id">
					<div class="path">
						<span class="dir_name">{{ dir.name }}</span>
						<span class="dir_state">{{ dirStatusText(dir) }}</span>
						<span class="dir_count">已收录 {{ dir.songCount }} 首</span>
					</div>
					<div class="dir_actions">
						<a-button
							size="small"
							type="primary"
							:loading="dirBusy === dir.id"
							@click="reauthorizeDir(dir)"
						>
							{{ dir.permission === 'granted' ? '重新扫描' : '重新授权并扫描' }}
						</a-button>
						<a-button size="small" danger :disabled="dirBusy === dir.id" @click="removeDir(dir)">
							移除
						</a-button>
					</div>
				</div>
			</div>
			<div class="dir_tip" v-else-if="!dirSupported">
				当前浏览器不支持 File System Access API（Firefox / Safari）：只能临时选择文件夹，<b>刷新后需要重新选择文件夹</b>。
			</div>
			<div class="dir_tip" v-else-if="dirRestored">
				还没有保存音乐库目录，点「选择文件夹」选一个，之后刷新页面也能接着用。
			</div>
			<div class="dir_tip" v-if="dirTip">{{ dirTip }}</div>

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
		<ConfirmModal v-model="visible" :title="modalTitle" @ok="handleOk">
			<template #desc> 注意：本操作不会删除真实文件 </template>
		</ConfirmModal>
	</div>
</template>

<script setup>
import useStorage from '@/hooks/useStorage'
import {  toRefs, h, ref, onMounted, onBeforeUnmount } from 'vue'
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
	// 后端只会清「用户自己选的目录」（句柄 + 扫进来的歌），构建自带的音乐库留着
	await invoke('clear_music_lib')
	musicLibPaths.value = []
	storage.removeItem('musicLibPaths')

	visible.value = false
	await refreshDirStatus()
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

// 选择文件夹：支持 File System Access API 就用 showDirectoryPicker（句柄能存 IndexedDB，
// 刷新后还能恢复），不支持的浏览器退回 webkitdirectory 的 input。
// 两条路都交给后端用 music-metadata 扫标签和封面。
const folderInput = ref(null)

// ---- 音乐库目录（后端存在 IndexedDB 里的目录句柄）----
const dirSupported = ref(true)
const dirRestored = ref(false)
const musicDirs = ref([])
const dirBusy = ref('')
const dirTip = ref('')

const applyDirStatus = status => {
	if (!status) return
	dirSupported.value = !!status.supported
	dirRestored.value = !!status.restored
	musicDirs.value = Array.isArray(status.dirs) ? status.dirs : []
}

const refreshDirStatus = async () => {
	try {
		applyDirStatus(await invoke('get_music_dir_status'))
	} catch (error) {
		console.error(error)
	}
}

// 后端恢复/扫描完会派发这个事件，界面跟着更新
// 注意：上面 `const window = getCurrentWindow()` 把全局 window 遮住了，这里用 globalThis
const onDirUpdated = e => applyDirStatus(e?.detail)

onMounted(async () => {
	await refreshDirStatus()
	globalThis.addEventListener?.('meow:music-dir-updated', onDirUpdated)
})

onBeforeUnmount(() => {
	globalThis.removeEventListener?.('meow:music-dir-updated', onDirUpdated)
})

const dirStatusText = dir => {
	if (dir.permission === 'granted') return '已授权，刷新页面会自动恢复'
	if (dir.permission === 'denied') return '授权被拒绝，需要重新授权'
	if (dir.permission === 'error') return dir.error || '目录不可用'
	return '等待重新授权（浏览器要求点一下按钮）'
}

const pickFolder = async () => {
	if (!dirSupported.value) {
		folderInput.value?.click()
		return
	}
	dirBusy.value = 'pick'
	dirTip.value = ''
	try {
		// 必须在点击事件里调用（浏览器要求用户手势）
		const res = await invoke('pick_music_dir')
		if (res?.ok) {
			dirTip.value = `已扫描「${res.name}」，本次新增 ${res.added} 首`
		} else if (res?.reason === 'canceled') {
			dirTip.value = '已取消选择'
		} else if (res?.reason === 'unsupported') {
			dirSupported.value = false
			folderInput.value?.click()
		} else {
			dirTip.value = `选择目录失败：${res?.message || res?.reason || '未知错误'}`
		}
	} finally {
		dirBusy.value = ''
		await refreshDirStatus()
	}
}

// 重新授权并扫描：requestPermission 只能由用户手势触发，所以放在按钮里
const reauthorizeDir = async dir => {
	dirBusy.value = dir.id
	dirTip.value = ''
	try {
		const res = await invoke('rescan_music_dir', { id: dir.id })
		if (res?.ok) {
			dirTip.value = `已重新授权并扫描「${res.name}」，本次新增 ${res.added} 首`
		} else if (res?.reason === 'denied') {
			dirTip.value = '浏览器没有授予读取权限，可以再点一次「重新授权并扫描」'
		} else if (res?.reason === 'missing') {
			dirTip.value = '这个目录的记录已经不存在了'
		} else {
			dirTip.value = `扫描失败：${res?.message || res?.reason || '未知错误'}`
		}
	} finally {
		dirBusy.value = ''
		await refreshDirStatus()
	}
}

// 移除音乐库目录：清掉 IndexedDB 里的句柄 + 这个目录扫出来的歌（构建自带的歌不受影响）
const removeDir = async dir => {
	dirBusy.value = dir.id
	dirTip.value = ''
	try {
		await invoke('remove_music_dir', { id: dir.id })
		dirTip.value = `已移除「${dir.name}」`
	} finally {
		dirBusy.value = ''
		await refreshDirStatus()
	}
}

const onFolderPicked = async e => {
	const input = e.target
	const files = Array.from(input?.files || [])
	if (input) input.value = ''
	if (!files.length) return
	const rootName = String(files[0].webkitRelativePath || '').split('/')[0] || '本地文件夹'
	const res = await invoke('scan_dir', { files, musicLibPath: rootName })
	const saved = JSON.parse(await storage.getItem('musicLibPaths')) || []
	if (!saved.includes(rootName)) saved.push(rootName)
	musicLibPaths.value = saved
	await storage.setItem('musicLibPaths', JSON.stringify(saved))
	dirTip.value = `已扫描「${rootName}」，本次新增 ${res} 首（该浏览器刷新后需要重新选择文件夹）`
	console.log('[meow] 扫描完成，本次新增', res, '首')
}

const deleteByMusicLibPath = async path => {	try {
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

// 刷新音乐库：把已授权的目录重扫一遍（没授权的要用户点「重新授权并扫描」）
const updateMusicLib = async () => {
	dirTip.value = ''
	for (const dir of musicDirs.value) {
		if (dir.permission === 'granted') await invoke('rescan_music_dir', { id: dir.id })
	}
	await refreshDirStatus()
}

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
		// 「选择文件夹」那一行
		.add_lib {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 5px 0 10px;

			.add_lib_tip {
				color: #494949;
				font-size: 13px;
			}
		}
		// 已保存的音乐库目录（沿用 .musicLibList 那套观感）
		.dirList {
			margin-top: 10px;
			.path_wrapper {
				padding: 10px 10px;
				background: rgba($color: #f7f8fa, $alpha: 0.3);
				margin-bottom: 5px;
				border-radius: 5px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: 10px;

				.path {
					display: flex;
					flex-direction: column;
					gap: 3px;
					overflow: hidden;

					.dir_name {
						color: #333;
						font-size: 14px;
						word-break: break-all;
					}
					.dir_state,
					.dir_count {
						color: #8a8a8a;
						font-size: 12px;
					}
				}
				.dir_actions {
					display: flex;
					align-items: center;
					gap: 6px;
					flex-shrink: 0;
				}
			}
		}
		.dir_tip {
			color: #8a8a8a;
			font-size: 13px;
			padding: 5px 0;
			line-height: 1.6;
		}
	}
}
.popoverContent {
	padding: 5px 10px;
	display: block;
}
</style>
