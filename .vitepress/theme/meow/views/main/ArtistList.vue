<template>
	<div class="album">
		<div class="top">
			<div class="left">
				<div class="title">作者</div>
				<div class="num">{{ artistList.total }}</div>
			</div>
			<div class="right">
				<a-popover trigger="hover" placement="bottom" :arrow="false">
					<template #content>
						<div class="sort_mode">
							{{ sort_mode === 'desc' ? '降序' : '升序' }}
						</div>
					</template>
					<div class="btn sort" @click="toggleSorter">
						<i class="iconfont icon-desc" v-if="sort_mode === 'desc'"></i>
						<i class="iconfont icon-asc" v-if="sort_mode === 'asc'"></i>
					</div>
				</a-popover>
				<SretchInput v-model="searchVal" @input="handleChange"></SretchInput>
			</div>
		</div>
		<div class="album_list_box scroll_bar" ref="lists_outer">
			<div
				class="letter_box"
				v-for="(item, index) in artistList.list"
				ref="letter_box"
				:key="item.letter"
				:data-id="item.letter"
			>
				<div class="letter_anchor" ref="letters" :data-letter="item.letter">{{ item.letter }}</div>
				<div class="album_list">
					<div
						class="album_single"
						ref="lis"
						:data-artist="item.artist"
						v-for="(item, index) in item.data"
						:key="index"
						@click="goToDetail(item)"
					>
						<div class="record">
							<img :src="transformPath(item.cover)" />
						</div>
						<div class="name">{{ item.artist }}</div>
					</div>
				</div>
			</div>
			<LetterElevator @click="letterTransport" :list="artistList.list" />
		</div>
	</div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { convertFileSrc, invoke } from '@utils/api'
import LetterElevator from '@/components/LetterElevator.vue'
import { useRouter } from 'vue-router'
import SretchInput from '@/components/SretchInput.vue'
import { usePlayerStore } from '@/stores/index.js'
import useFlip from '@/hooks/useFlip'

const playerStore = usePlayerStore()
const router = useRouter()
const { flip } = useFlip()

const lis = ref(null)
const letters = ref(null)
const lists_outer = ref(null)
const searchVal = ref('')
const letter_box = ref(null)
const sort_mode = ref('asc')

const artistList = reactive({
	list: [],
	total: 0,
})

onMounted(async () => {
	await loadData()
})

const loadData = async (searchVal = '', order = 'asc') => {
	const res = await invoke('get_artist_list', {
		searchVal,
		order,
	})
	artistList.list = res.artists
	artistList.total = res.total
}
const handleChange = async e => {
	flip(
		async () => {
			return [
				...letter_box.value.map(item => {
					const rect = item.getBoundingClientRect()
					return {
						dom: item,
						top: rect.top,
					}
				}),
			]
		},
		async () => {
			await loadData(searchVal.value, sort_mode.value)
		},
		async () => {}
	)
}
const goToDetail = item => {
	router.push({
		path: '/main_window/main/artist',
		query: {
			...item,
		},
	})
}

const toggleSorter = async () => {
	flip(
		async () => {
			return [
				...letter_box.value.map(item => {
					const rect = item.getBoundingClientRect()
					return {
						dom: item,
						top: rect.top,
					}
				}),
			]
		},
		async () => {
			const order = sort_mode.value === 'desc' ? 'asc' : 'desc'
			await loadData(searchVal.value, order)
			sort_mode.value = order
		},
		async () => {}
	)
}
const letterTransport = letter => {
	const letterGroup = artistList.list.find(item => item.letter === letter)

	if (letterGroup && letterGroup.data && letterGroup.data.length) {
		const [first] = letterGroup.data
		console.log(first)
		if (lis.value && lis.value.length > 0 && first.artist) {
			const aim = lis.value.find(item => item.dataset.artist === first.artist)
			aim &&
				lists_outer.value.scrollTo({
					top: aim.offsetTop - 18,
					behavior: 'smooth',
				})
		}
	}
}
const transformPath = path => {
	if (!path) return ''
	const normalized = path.replace(/\\/g, '/')
	return convertFileSrc(normalized)
}
</script>

<style lang="scss" scoped>
.album {
	color: var(--primary-text-color);
	height: 100%;
	width: 100%;
	position: relative;

	.top {
		display: flex;
		justify-content: space-between;
		padding-left: 6px;
		padding-right: 20px;
		.left {
			display: flex;
			align-items: center;

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

			.search_box {
				display: flex;
				justify-content: center;
				align-items: center;
				box-sizing: border-box;
				transition: border-radius 0.3s;
				height: 35px;
				input {
					width: 0;
					transition:
						width 0.2s,
						margin-right 0.2;
					outline: none;
					border: none;
					background-color: transparent;
					padding: 0;
					margin: 0;
					border-radius: 5px;
					height: 100%;
					line-height: 35px;
					color: var(--primary-text-color);
					display: inline;
					transition: width 0.3s;
				}
				i {
					width: 35px;
					height: 35px;
					display: flex;
					justify-content: center;
					align-items: center;
					&.icon-close {
						font-size: 12px;
						width: 20px;
						height: 20px;
						border-radius: 50%;
						transition: background-color 0.2s;
						&:hover {
							background-color: rgba($color: #fafafa, $alpha: 0.3);
						}
					}
				}

				&.stretch {
					padding: 0 10px;
					// background: var(--icon-bg-color);
					background-color: rgba($color: #5e5e5e, $alpha: 0.5);
					backdrop-filter: blur(1px);
					border-radius: 17px;
					input {
						width: 200px;
						margin-right: 0;
						padding: 0 10px;
						margin-right: 10px;
						box-sizing: border-box;
						display: block;
					}
				}
			}
		}
	}
	.album_list_box {
		padding-left: 6px;
		overflow-y: auto;
		overflow-x: hidden;
		height: calc(100% - 50px);
		position: relative;
		mask-image: linear-gradient(to bottom, transparent 0%, black 0, black calc(100% - 30px), transparent 100%);
		.letter_box {
			.letter_anchor {
				position: sticky;
				top: 0;
				left: 0;
				height: 18px;
				font-size: 16px;
				z-index: 2;
				background-color: var(--letter-ahcor-bg-color);
				color: var(--primary-text-color);
				transition: all 0.3s;
				background-color: var(--content-bg-color);
				margin-bottom: 10px;
				color: #fff;
				backdrop-filter: blur(5px);
			}
			.album_list {
				margin-bottom: 20px;
				display: flex;
				flex-wrap: wrap;
				width: 100%;
				.album_single {
					width: 200px;
					margin-right: 10px;
					cursor: pointer;
					margin-bottom: 20px;
					max-width: 200px;
					display: flex;
					align-items: center;
					padding: 5px 10px;
					border-radius: 8px;
					transition: background-color 0.3s;
					&:hover {
						background-color: rgba($color: #000000, $alpha: 0.5);
					}
					.record {
						width: 50px;
						height: 50px;
						margin-right: 10px;
						flex-shrink: 0;
						img {
							width: 100%;
							height: 100%;
							border-radius: 50%;
						}
					}
				}
			}
		}
	}
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
</style>
