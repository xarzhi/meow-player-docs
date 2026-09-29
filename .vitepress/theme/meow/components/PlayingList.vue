<template>
	<Drawer title="播放列表" :footbar="false" ref="drawer" @visibleChange="visibleChange">
		<template #top>
			<div class="head_box">
				<div class="head">
					<div class="left">
						<div class="title">播放列表</div>
						<div class="numbers">{{ currentOrder }} / {{ playingListLength }}</div>
					</div>
					<div class="right">
						<div class="delete_all">
							<!-- <div class="icon" @click="deleteAll">
								<i class="iconfont icon-shanchu"></i>
							</div> -->
							<div class="top_right">
								<div class="btn" @click="closeDrawer">
									<i class="iconfont icon-close"></i>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="box">
			<div class="playing_list">
				<div class="list_box">
					<ul class="list scroll_bar" v-if="playerStore.playingList && playerStore.playingList.length">
						<li
							ref="lis"
							v-for="(item, index) in playerStore.playingList"
							@dblclick="clickToPlay(item, index)"
							:class="{
								active: playerStore.getCurrentIndex() === index,
							}"
						>
							<div class="left">
								<div class="title">{{ item.title }}</div>
								<div class="artist">{{ item.artist }}</div>
							</div>
							<div class="right">
								<div class="durition">{{ item.durationStr }}</div>
								<div class="delete" @click="handleDelete(index)">
									<i class="iconfont icon-close"></i>
								</div>
							</div>
						</li>
					</ul>
				</div>
			</div>
			<div class="anchor" @click="scrollToActive(true)" v-if="playerStore.currentSong.id">
				<i class="iconfont icon-anchor"></i>
			</div>
		</div>
	</Drawer>
</template>

<script setup>
import { ref, toRefs, onMounted, nextTick, computed } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import usePlayer from '@hooks/usePlayer.js'
const playerStore = usePlayerStore()
const player = usePlayer()

const lis = ref()
const drawer = ref(null)

const active_index = ref(-1)

const { current_play_index, current_play_dom } = toRefs(playerStore)

const clickToPlay = async song => {
	const index = playerStore.playingList.findIndex(item => item.id === song.id)
	player.loadTrack(index)
}

// 当前播放歌曲滚动到顶部
const scrollToActive = smooth => {
	nextTick(() => {
		const index = playerStore.getCurrentIndex()
		if (index !== -1) {
			const params = {
				block: 'center',
			}
			if (smooth) {
				params.behavior = 'smooth'
			}
			lis.value[index]?.scrollIntoView(params)
		}
	})
}
const visibleChange = newV => {
	if (newV) {
		scrollToActive()
	}
}
const closeDrawer = () => {
	drawer.value.close()
}

const handleDelete = index => {
	playerStore.playingList.splice(index, 1)
}

const currentOrder = computed(() => {
	return playerStore.getCurrentIndex() + 1
})

const playingListLength = computed(() => {
	return playerStore.playingList.length
})

const deleteAll = () => {
	playerStore.playingList = []
}

onMounted(() => {
	scrollToActive()
})
</script>

<style lang="scss" scoped>
.box {
	color: #333;
	height: 100%;
	position: relative;
}
.anchor {
	position: absolute;
	bottom: 20px;
	right: 60px;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;

	i {
		color: gray;
		transition: color 0.1s;
		font-size: 18px;
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
.head_box {
	box-sizing: border-box;
	height: 50px;
	// padding-right: 28px;

	.head {
		display: flex;
		border-bottom: 1px solid #f1efef;
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		position: relative;
		height: 50px;
		align-items: center;
		.left {
			display: flex;
			align-items: center;
			.title {
				margin-right: 10px;
				font-weight: 500;
				font-size: 18px;
			}
			.numbers {
				color: #333;
			}
		}
		.btn {
			width: 30px;
			height: 30px;
			border-radius: 5px;
			display: flex;
			justify-content: center;
			align-items: center;
			cursor: pointer;

			i {
				color: gray;
			}

			&:hover {
				background-color: rgba($color: gray, $alpha: 0.1);
			}
		}

		// .delete_all {
		// 	position: absolute;
		// 	right: 5px;
		// 	top: 0;
		// 	width: 50%;
		// 	height: 20px;
		// 	height: 100%;
		// 	display: flex;
		// 	justify-content: end;
		// 	align-items: center;
		// 	opacity: 0;
		// 	transition: opacity 0.3s;

		// 	.icon {
		// 		width: 30px;
		// 		height: 30px;
		// 		display: flex;
		// 		justify-content: center;
		// 		align-items: center;
		// 		border-radius: 3px;
		// 		cursor: pointer;

		// 		&:hover {
		// 			background: rgba(0, 0, 0, 0.2);
		// 		}

		// 		i {
		// 			font-size: 18px;
		// 			color: gray;
		// 		}
		// 	}
		// }
	}
}
.playing_list {
	height: 100%;
	overflow: auto;
	.list_box {
		flex: 1;
		height: 100%;

		.list {
			height: 100%;
			overflow: auto;
			box-sizing: border-box;
			padding: 0 5px;
			padding-top: 3px;

			li {
				padding: 8px 17px;
				border-radius: 3px;
				display: flex;
				align-items: center;
				cursor: pointer;
				margin-bottom: 2px;
				justify-content: space-between;

				&:hover {
					background-color: rgba($color: #000000, $alpha: 0.1);

					.right {
						.delete {
							opacity: 1;
						}

						.durition {
							opacity: 0;
						}
					}
				}

				.left {
					.title {
						font-size: 14px;
						margin-bottom: 5px;
					}

					.artist {
						font-size: 12px;
						color: gray;
					}
				}

				.right {
					position: relative;
					height: 100%;

					.durition {
						color: gray;
						opacity: 1;
						transition: opacity 0.3s;
					}

					.delete {
						transition: opacity 0.3s;
						position: absolute;
						opacity: 0;
						top: 0;
						right: 0;
						height: 100%;
						width: 100%;
						display: flex;
						justify-content: center;
						align-items: center;
						cursor: pointer;

						i {
							color: gray;
							transition: color 0.3s;
						}

						&:hover {
							i {
								color: #333;
							}
						}
					}
				}
			}
		}
	}
}

.active {
	background-color: #eaeffd;
}
</style>
