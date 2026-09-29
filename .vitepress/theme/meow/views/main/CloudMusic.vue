<template>
	<div class="cloud_music">
		<div class="top">
			<div class="left">
				<div class="title">云听</div>
				<div class="num">
					<!-- {{ musicList.total }} -->
				</div>
			</div>
			<div class="right">
				<!-- <button @click="handleAdd">添加</button> -->
				<SretchInput v-model="searchVal" @input="handleChange"></SretchInput>
			</div>
		</div>
		<div class="breadcrumbs"></div>
		<div class="list_box scroll_bar">
			<div class="single" v-for="(item, index) in list" :key="index" @dblclick="dblclick(item)">
				<div class="left">{{ item.basename }}</div>
				<div class="right">{{ item.size }}</div>
			</div>
		</div>
		<CloudPathModal v-model="visible" />
	</div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { invoke } from '@utils/api'
import CloudPathModal from './CloudPathModal.vue'
import SretchInput from '@/components/SretchInput.vue'

const visible = ref(false)
const searchVal = ref('')
const list = ref([])
onMounted(() => {
	loadData()
})
const loadData = async () => {
	const res = await invoke('get_cloud_list')
	list.value = res
	console.log(res)
}
const dblclick = item => {
	console.log(item)
}
const handleAdd = () => {
	visible.value = true
}

const handleChange = () => []
</script>

<style lang="scss" scoped>
.cloud_music {
	color: var(--primary-text-color);
	height: 100%;
	width: 100%;
	position: relative;

	.top {
		display: flex;
		justify-content: space-between;
		box-sizing: border-box;
		height: 50px;
		padding-right: 20px;

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
	.list_box {
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
		height: calc(100% - 50px);

		.single {
			margin-bottom: 10px;
			padding: 10px 10px;
			cursor: pointer;
			border-radius: 5px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			.right {
				padding-right: 15px;
				font-size: 12px;
			}
			&:hover {
				background-color: rgba(255, 255, 255, 0.2);
			}
		}
		.loading {
			position: absolute;
			inset: 0;
			display: flex;
			justify-content: center;
			align-items: center;
			background-color: rgba(255, 255, 255, 0.5);
		}
	}
}
</style>
