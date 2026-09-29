<template>
	<div class="selector">
		<div class="dropzone" ref="dropzone" @click="handleOpen">
			<div class="icon">
				<i class="iconfont icon-drop-file"></i>
			</div>
			<div class="title" v-if="props.title">{{ props.title }}</div>
			<div class="desc" v-if="props.desc || slots.desc">
				<slot v-if="slots.desc" name="desc"></slot>
				<span v-else>{{ props.desc }}</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { open } from '@tauri-apps/plugin-dialog'
import { useSlots } from 'vue'
import { lstat } from '@tauri-apps/plugin-fs'
import { isInside } from '@/utils/utils'
const slots = useSlots()
const props = defineProps({
	title: {
		type: String,
		default: '',
	},
	desc: {
		type: String,
		default: '',
	},
	extensions: {
		// 过滤限制文件的后缀名
		type: Array,
		default: () => [],
	},
	multiple: {
		// 是否支持多选
		type: Boolean,
		default: false,
	},
	dir: {
		// 是否为文件夹
		type: Boolean,
		default: false,
	},
})
const emit = defineEmits(['drop', 'selected'])
const unlisten = ref(null)
const dropzone = ref(null)
const src = ref('')
const imgList = ref([])

onMounted(async () => {
	unlisten.value = await getCurrentWebviewWindow().onDragDropEvent(async event => {
		const { type, paths, position } = event.payload

		if (type === 'over') {
			if (!dropzone.value) return
			const rect = dropzone.value.getBoundingClientRect()
			if (isInside(position, rect)) {
				dropzone.value.classList.add('active')
			} else {
				dropzone.value.classList.remove('active')
			}
		}

		if (type === 'drop') {
			if (!dropzone.value) return

			const rect = dropzone.value.getBoundingClientRect()
			if (isInside(position, rect)) {
				const sendPath = []
				if (props.dir) {
					for (const path of paths) {
						const status = await lstat(path)
						if (status.isDirectory) {
							sendPath.push(path)
							if (!props.multiple) break
						}
					}
				} else {
					for (const path of paths) {
						const status = await lstat(path)
						if (status.isFile) {
							sendPath.push(path)
							if (!props.multiple) break
						}
					}
				}
				emit('selected', sendPath)
			}
			dropzone.value.classList.remove('active')
		}

		if (type === 'leave' || type === 'cancel') {
			dropzone.value.classList.remove('active')
		}
	})
})
onUnmounted(() => {
	const fns = unlisten.value
	fns?.()
})

const handleOpen = async () => {
	const files = await open({
		multiple: props.multiple,
		directory: props.dir,
		filters: [
			{
				name: 'wallpaper',
				extensions: props.extensions,
			},
		],
		title: '请选择文件',
	})
	if (!files) return
	emit('selected', files)
}
</script>

<style lang="scss" scoped>
.selector {
	.dropzone {
		box-sizing: border-box;
		width: 100%;
		padding: 36px 24px;
		border-radius: 14px;
		border: 2px dashed #dadada;
		background: rgba($color: #f7f8fa, $alpha: 0.3);
		color: #333;
		cursor: pointer;
		user-select: none;
		transition:
			border-color 0.25s ease,
			background 0.25s ease,
			transform 0.15s ease;

		display: flex;
		flex-flow: column;
		justify-content: center;
		align-items: center;
		.icon {
			i {
				font-size: 20px;
				color: #1677ff;
			}
		}
		&.active {
			background-color: rgba($color: #000000, $alpha: 0.3);
		}
		.title {
			margin-top: 30px;
			color: var(--primary-text-color);
		}
		.desc {
			margin-top: 10px;
			font-size: 14px;
			color: rgba(0, 0, 0, 0.45);
		}
	}
}
</style>
