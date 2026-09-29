<template>
	<div class="album">
		<div class="top">
			<div class="left">
				<div class="title">专辑</div>
				<div class="num">{{ albumList.total }}</div>
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
				v-for="(item, index) in albumList.list"
				ref="letter_box"
				:key="item.letter"
				:data-id="item.letter"
			>
				<div class="letter_anchor" :data-letter="item.letter">
					{{ item.letter }}
				</div>
				<div class="album_list">
					<div
						class="album_single"
						ref="lis"
						:data-album="item.album"
						v-for="(item, index) in item.data"
						:key="index"
						@click="goToDetail(item)"
					>
						<div class="album_top">
							<div class="record">
								<img :src="transformPath(item.cover)" />
							</div>
							<div class="cover_box">
								<img :src="transformPath(item.cover)" />
							</div>
						</div>
						<div class="album_bottom">
							<div class="album_name ellipsis">{{ item.album }}</div>
							<div class="info">
								<div class="num">{{ item.song_count }}首</div>
								<span class="point">·</span>
								<div class="artist ellipsis">{{ item.artist }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<LetterElevator @click="letterTransport" :list="albumList.list" />
		</div>
	</div>
</template>

<script setup>
import { onMounted, reactive, ref} from 'vue'
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
const letter_box = ref(null)
const lists_outer = ref(null)
const sortKeyVisible = ref(false)
const searchVal = ref('')
const sort_mode = ref('asc')

const albumList = reactive({
	list: [],
	total: 0,
})

onMounted(async () => {
	await loadData()
})
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

const loadData = async (searchVal = '', order = 'asc') => {
	const res = await invoke('get_album_list', {
		searchVal,
		order,
	})
	albumList.list = res.albums
	albumList.total = res.total
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

const goToDetail = item => {
	router.push({
		path: '/main_window/main/album',
		query: {
			...item,
		},
	})
}
const letterTransport = letter => {
	const letterGroup = albumList.list.find(item => item.letter === letter)
	if (letterGroup && letterGroup.data && letterGroup.data.length) {
		const [first] = letterGroup.data
		if (lis.value && lis.value.length > 0 && first.album) {
			const aim = lis.value.find(item => item.dataset.album === first.album)
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

const sortList = [
	{ label: '专辑名', key: 'album' },
	{ label: '专辑数', key: 'albumNum' },
]
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
					&:hover {
						.album_top {
							.record {
								right: -50px;
								transform: rotate(360deg);
							}
						}
					}
					.album_top {
						position: relative;
						margin-bottom: 10px;
						width: 150px;
						.record {
							position: absolute;
							z-index: -1;
							width: 150px;
							height: 150px;
							border-radius: 50%;
							right: -30px;
							background-color: #333;
							transition: all 0.5s;
							display: flex;
							justify-content: center;
							align-items: center;
							box-shadow: 0 0 5px 0 #333;
							img {
								width: 70%;
								height: 70%;
								border-radius: 50%;
							}
						}
						.cover_box {
							position: relative;
							z-index: 1;
							width: 150px;
							height: 150px;
							border-radius: 8px;
							background-color: #fff;
							padding: 5px;
							box-sizing: border-box;
							box-shadow: 0 0 5px 0 #7a7a7a;
							img {
								width: 100%;
								border-radius: 2px;
								height: 100%;
							}
						}
					}
					.album_bottom {
						.ellipsis {
							text-overflow: ellipsis;
							overflow: hidden;
							white-space: nowrap;
						}
						.album_name {
							font-size: 16px;
							margin-bottom: 5px;
							width: 150px;
						}
						.info {
							color: var(--sub-text-color);
							display: flex;
							font-size: 12px;
							.point {
								margin: 0 5px;
							}
							.artist {
								width: 100px;
							}
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
