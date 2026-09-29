<template>
	<div :class="{ lyrics_outer_box: true, win_lyrics: from === 'window' }" :style="{ '--words-origin': wordsOrigin }">
		<!-- <Transition name="right" mode="out-in"> -->
		<div
			class="lyrics_box"
			ref="box"
			@wheel="wheel"
			@click.self="lyricsClicked"
			v-if="playerStore.currentSong.id && fullSide !== 'left'"
		>
			<div
				ref="lis"
				class="line"
				v-for="(item, index) in playerStore.currentLyrics"
				:key="index"
				:class="{ active: active === index, sung: index < active }"
				@click="jumpLyrics(item)"
				:style="{
					'--duration': lineDuration(item),
					fontSize: fontSizePx,
					justifyContent: lineJustify,
					textAlign: playerStyle.lyricsAlign,
				}"
			>
				<!-- 歌词数据是 AMLL 结构：words 是**按单字拆**的数组，一整行要把这些字拼起来才是完整歌词。
				     （以前这里写的是 item.words[0].word，所以每行只显示一个字。）
				     逐字填充用每个字自己的 startTime / endTime 相对当前播放时间驱动；
				     万一数据里没有逐字时间，就退回整行 --duration 的那套 CSS 动画。 -->
				<div class="words" :class="{ per_char: hasWordTimes(item) }">
					<span
						v-for="(w, wi) in lineWords(item)"
						:key="wi"
						class="word"
						:class="wordClass(index, w)"
						:style="wordStyle(index, w)"
						>{{ w.word }}</span
					>
				</div>
			</div>
		</div>
		<!-- </Transition> -->
	</div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/index.js'
import { watch, ref, computed, nextTick } from 'vue'
import usePlayer from '@/hooks/usePlayer.js'
import { playerStyle } from '@/components/playerStyle.js'

const playerStore = usePlayerStore()
const player = usePlayer()
const active = ref(-1)

const emit = defineEmits(['lyricsClicked'])
const box = ref(null)
const lis = ref(null)
const countdown = ref(5)
const isOpt = ref(false)
const props = defineProps({
	fullSide: String,
	from: String,
})

/** 歌词对齐：.line 是 flex 容器，一个 .words 子元素，靠 justify-content 对齐 */
const lineJustify = computed(() => {
	const map = { left: 'flex-start', center: 'center', right: 'flex-end' }
	return map[playerStyle.lyricsAlign] || 'flex-start'
})
/** 字号（夹一下范围，别被异常值弄成 0 看不见了） */
const fontSizePx = computed(() => {
	const size = Number(playerStyle.lyricsFontSize)
	return `${Math.min(64, Math.max(10, Number.isFinite(size) && size > 0 ? size : 24))}px`
})
/** 高亮放大时的缩放原点跟着对齐方式走，不然居中/右对齐会「跳」 */
const wordsOrigin = computed(() => {
	const map = { left: '0% 50%', center: '50% 50%', right: '100% 50%' }
	return map[playerStyle.lyricsAlign] || '0% 50%'
})

/** 整行的时长（CSS 里 --duration 用；异常数据给个 0.4s，别写出 NaN） */
const lineDuration = item => {
	const duration = (Number(item?.endTime) - Number(item?.startTime)) / 1000
	return `${Number.isFinite(duration) && duration > 0 ? duration : 0.4}s`
}

/**
 * 一行的所有字。
 * AMLL 结构里 words 是按单字拆的数组，一整行必须拼起来才是完整歌词；
 * 兜底：要是某个数据源的 words 缺失（或 words[0] 就是整行文本），也照样显示整行，不会变成空白。
 */
const lineWords = item => {
	const words = Array.isArray(item?.words) ? item.words.filter(w => w && typeof w.word === 'string') : []
	if (words.length) return words
	return item?.text ? [{ word: String(item.text), startTime: item?.startTime, endTime: item?.endTime }] : []
}

/** 这一行是否每个字都带有效时间：带的话逐字填充，不带就退回整行 --duration 动画 */
const hasWordTimes = item => {
	const words = lineWords(item)
	return (
		words.length > 0 &&
		words.every(w => {
			const start = Number(w.startTime)
			const end = Number(w.endTime)
			return Number.isFinite(start) && Number.isFinite(end) && end > start
		})
	)
}

/**
 * 单个字的填充状态（时间单位毫秒，和 words 里的 startTime / endTime 一致）：
 *   sung    —— 这个字已经唱完，直接点亮，不做动画
 *   current —— 正在唱这个字，用这个字自己的时长做填充过渡（时长见下面 --word-duration）
 *   ''      —— 还没唱到
 * 只有当前高亮行需要逐字判断；别的行由 .line 的 active / sung 样式统一控制，
 * 这样也不会在每次时间更新时给整篇歌词的每个字都重算一遍。
 */
const wordClass = (index, w) => {
	if (index !== active.value) return ''
	const start = Number(w?.startTime)
	const end = Number(w?.endTime)
	if (!Number.isFinite(start) || !Number.isFinite(end)) return ''
	const time = Number(playerStore.currentTime)
	if (time >= end) return 'sung'
	if (time >= start) return 'current'
	return ''
}

/** 正在唱的那个字：把「这个字要唱多久」交给 CSS，做从左往右的填充 */
const wordStyle = (index, w) => {
	if (index !== active.value) return null
	const start = Number(w?.startTime)
	const end = Number(w?.endTime)
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
	const time = Number(playerStore.currentTime)
	if (time < start || time >= end) return null
	return { '--word-duration': `${Math.max(0.05, (end - start) / 1000)}s` }
}

const lyricsClicked = () => {
	emit('lyricsClicked')
}

const jumpLyrics = item => {
	player.seek(item.startTime / 1000)
}

/** 当前时间落在哪一行（毫秒，和 item.startTime / endTime 同单位） */
const findActiveIndex = time => {
	const lyrics = playerStore.currentLyrics || []
	for (let index = 0; index < lyrics.length; index++) {
		const item = lyrics[index]
		if (time >= item.startTime && time < item.endTime) return index
	}
	return -1
}

/**
 * 滚动到第 index 行。
 * 不用 scrollIntoView：它会把所有可滚动祖先（包括文档站自己的容器）一起滚。
 * 这里只滚自己的容器，而且用 offsetTop（布局像素），画布被 transform: scale() 缩放也不影响。
 */
const scrollToLine = (index, smooth = true) => {
	const container = box.value
	const el = lis.value?.[index]
	if (!container || !el) return
	const target = el.offsetTop - (container.clientHeight - el.offsetHeight) / 2
	const top = Math.max(0, Math.min(target, container.scrollHeight - container.clientHeight))
	if (Math.abs(container.scrollTop - top) < 2) return
	if (typeof container.scrollTo === 'function') {
		container.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
	} else {
		container.scrollTop = top
	}
}

watch(
	() => playerStore.currentTime,
	n => {
		const index = findActiveIndex(n)
		if (index === -1 || index === active.value) return
		active.value = index
		if (!isOpt.value) scrollToLine(index)
	}
)

// 歌词换了 / 换歌了（也包括「暂停状态下进全屏、组件刚挂载」这种）：
// 立刻按当前时间把高亮和位置对上，不用等下一次 progress_update
watch(
	[() => playerStore.currentLyrics, () => playerStore.currentSong?.path],
	() => {
		active.value = -1
		nextTick(() => {
			if (box.value) box.value.scrollTop = 0
			const index = findActiveIndex(playerStore.currentTime)
			if (index !== -1) {
				active.value = index
				scrollToLine(index, false)
			}
		})
	},
	{ immediate: true }
)

let timer = null
const wheel = () => {
	isOpt.value = true
	countdown.value = 5
	clearInterval(timer)
	timer = null
	timer = setInterval(() => {
		if (countdown.value > 0) {
			countdown.value--
		} else {
			clearInterval(timer)
			timer = null
			isOpt.value = false
		}
	}, 1000)
}
</script>

<style lang="scss" scoped>
.lyrics_outer_box {
	padding: 30px 0;
	overflow: hidden;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	.lyrics_box {
		height: 75%;
		mask-image: linear-gradient(to bottom, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%);
		overflow: hidden;
		padding: 50px 40px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-flow: column;
		align-items: center;
		box-sizing: border-box;
		overflow: auto;
		width: 100%;
		border-radius: 10px;
		box-sizing: border-box;
		margin-bottom: 0;
		// 让 .line 的 offsetTop 以它为基准（滚动定位靠这个）
		position: relative;
		transition: background-color 0.2s;
		&:hover {
			.line:not(.active) {
				filter: blur(0);
			}
		}

		&::-webkit-scrollbar {
			display: none;
		}

		.line {
			display: flex;
			width: 100%;
			// justify-content: center;
			padding: 15px 10px;
			align-items: center;
			border-radius: 8px;
			cursor: pointer;
			text-shadow: 0px 0px 10px rgba(99, 99, 99, 0.2);
			font-size: 24px;
			text-align: left;
			white-space: nowrap;
			transition:
				background-color 0.3s,
				filter 0.3s;

			&:hover {
				background-color: rgba(0, 0, 0, 0.2);
			}

			/* 整行容器：默认走「整行 --duration 填充」（没有逐字时间的兜底数据）。
			   有逐字时间时外面加了 .per_char，改由下面每个 .word 自己填充。 */
			.words {
				display: flex;
				align-items: center;
				/* 保留字之间的空格（空格在 AMLL 里也是一个 word） */
				white-space: pre;
				color: transparent;
				background: linear-gradient(to right, #fff 50%, rgba($color: #d3d3d3, $alpha: 0.5) 50%);
				background-size: 200% 100%;
				background-position: 100% 50%;
				-webkit-background-clip: text;
				background-clip: text;
				transition:
					background-position var(--duration, 0.4s) linear,
					transform 0.3s;

				.word {
					color: transparent;
				}

				/* 逐字填充：每个字按自己的 startTime / endTime 亮起来 */
				&.per_char {
					background: none;
					transition: transform 0.3s;

					.word {
						background: linear-gradient(to right, #fff 50%, rgba($color: #d3d3d3, $alpha: 0.5) 50%);
						background-size: 200% 100%;
						background-position: 100% 50%;
						-webkit-background-clip: text;
						background-clip: text;
						transition: background-position var(--word-duration, 0.3s) linear;
					}
					/* 唱过的字：已经填充完，不做动画 */
					.word.sung {
						background-position: 0% 50%;
						transition: none;
					}
					/* 正在唱的字：用 --word-duration 从 0% 走到 100% */
					.word.current {
						background-position: 0% 50%;
					}
				}
			}

			&.active .words {
				background-position: 0% 50%;
				transform: scale(1.05);
				transform-origin: var(--words-origin, 0% 50%);
			}
			&:not(.active) {
				transition: background-position 0;
				background-position: 100% 50%;
				filter: blur(4px);
			}
		}
		/* 未唱：永远灰色，无动画 */
		.line:not(.active):not(.sung) .words {
			transition: none;
			background-position: 100% 50%;
		}
		/* 已唱完：不逐字，整行统一（禁止动画） */
		.line.sung .words {
			transition: none !important;
			background-position: 100% 50%;
		}
	}
}

/* ---- 普通播放条上方的窄条「桌面歌词」已经整体砍掉（连同 compact 样式） ---- */

.win_lyrics {
	padding: 0 0;

	.lyrics {
		padding: 0;
		width: 100%;
		height: 50px;

		&:hover {
			background-color: transparent;
		}

		ul {
			height: 50px;
			// overflow: hidden;

			li {
				height: 100%;
				display: flex;
				align-items: center;
				text-align: left;
				white-space: nowrap;
				padding: 0 0;
				text-shadow:
					1px 1px 1px rgba($color: #000000, $alpha: 0.5),
					1px 0px 1px rgba($color: #000000, $alpha: 0.5);
				color: rgba($color: #d3d3d3, $alpha: 0.5);

				&:hover {
					background-color: transparent;
				}
			}
		}
	}
}

.right-leave-active {
	transition: all 0.1s ease-in-out;
	opacity: 1;
}

.right-enter-active {
	transition: all 0.3s ease-in-out;
	opacity: 1;
	transition-delay: 0.2s;
}

.right-enter-from {
	transform: translateY(50px);
	opacity: 0;
}

.right-enter-to {
	transform: translateY(0);
	opacity: 1;
}

.right-leave-from {
	opacity: 1;
}

.right-leave-to {
	opacity: 0;
}
</style>
