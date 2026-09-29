// 「没有时间轴的歌词」兜底。
//
// 为什么需要它（实测出来的根因）：
//   public/songs 里 9 首歌，只有「就是我 - 丁于.mp3」的内嵌歌词是带 [mm:ss.xx] 的 LRC；
//   另外 8 首（flac）内嵌的是**纯文本歌词**（一行一句，没有任何时间戳）。
//   而后端把文本变成 AMLL 结构时走的是 utils/lrc.js 的 parseLrc -> lrc-kit，
//   没有时间戳的行会被整段丢掉 —— 于是 playerStore.currentLyrics 是空数组，
//   歌词组件再正常也没东西可渲染（这就是「播放时看不到歌词」的根因之一）。
//
// 这个文件不改后端（meow-shim/backend.js 不在白名单里），
// 而是在 currentLyrics 为空时自己兜一次：读当前歌的原始歌词文本，
// 带时间戳的走 parseLrc（和原来一致），纯文本的按整首时长**均分**出一个时间轴，
// 让 9 首歌都能滚起来（只是纯文本那 8 首的行时间是我们估的，不是原曲标注的）。
import { watch } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
import { invoke } from '@utils/api'
// 注意：parseLrc 在 theme/utils 下（不在 meow/utils 里），所以这里用相对路径
import { parseLrc } from '../../../utils/lrc.js'

/**
 * 制作人员行：这些 flac 的纯文本歌词前面一大段都是
 * 「作词 : xxx」「音乐总监 : xxx」「吉他 : xxx」这种，当歌词显示会很怪。
 * 规则就是「开头 <=10 个字 + 冒号」，实测 8 首歌都能干净地滤掉，正文歌词不会误伤。
 */
const CREDIT_RE = /^[\u4e00-\u9fa5A-Za-z]{1,10}\s*[:：]/
/** 版权声明之类的括号提示 */
const NOTICE_RE = /^[（(]\s*(未经许可|版权|本歌曲|该歌曲)/

/** [{time(秒), text}] -> AMLL 结构（和 backend.js 里的 toAmllLines 保持一致） */
function toAmllLines(entries) {
	// 先把空行（纯音乐间奏那几行）滤掉，再按**过滤后**的数组算下一行的开始时间。
	// 原来 filter 和 map 分开写、map 里却用未过滤的 entries[i + 1]，
	// 中间夹了空行时这一行的 endTime 会提前结束（高亮会断一下），顺带修掉。
	const lines = entries.filter(item => item && item.text && String(item.text).trim())
	return lines.map((line, i) => {
		const startTime = Math.round(line.time * 1000)
		const next = lines[i + 1]?.time
		const endTime = Math.round((next != null ? next : line.time + 4) * 1000)
		const text = String(line.text)
		const chars = Array.from(text)
		const span = Math.max(1, endTime - startTime)
		return {
			startTime,
			endTime,
			words: chars.map((ch, idx) => ({
				word: ch,
				startTime: startTime + Math.round((span * idx) / chars.length),
				endTime: startTime + Math.round((span * (idx + 1)) / chars.length),
			})),
			translatedLyric: '',
			romanLyric: '',
			isBG: false,
			isDuet: false,
		}
	})
}

/** 纯文本歌词 -> 按歌曲时长均分出时间轴 */
function fromPlainText(raw, duration) {
	const texts = String(raw)
		.split(/\r?\n/)
		.map(t => t.trim())
		.filter(t => t && !/^\[[a-zA-Z]+:/.test(t) && !CREDIT_RE.test(t) && !NOTICE_RE.test(t))
	if (!texts.length) return []
	const total = Number(duration) > 0 ? Number(duration) / 1000 : texts.length * 4
	const span = total / texts.length
	return texts.map((text, i) => ({ time: i * span, text }))
}

/**
 * 在 Player.vue 里调用一次（它一直挂载着）：
 * 发现当前歌的歌词是空的，就用原始文本兜一个时间轴塞回 store。
 */
export function useLyricsFallback() {
	const playerStore = usePlayerStore()
	let songListCache = null
	let filling = false

	const build = (raw, duration) => {
		if (!raw) return []
		// 先按标准 LRC 解析（有 [mm:ss.xx] 的走这条）
		const parsed = (parseLrc(raw) || []).filter(item => Number.isFinite(item.time) && item.time >= 0)
		if (parsed.length) return toAmllLines(parsed)
		// 再兜纯文本
		return toAmllLines(fromPlainText(raw, duration))
	}

	watch(
		() => [playerStore.currentSong?.path, playerStore.currentSong?.duration, playerStore.currentLyrics?.length],
		async ([path, duration, count]) => {
			if (!path || filling || count) return
			filling = true
			try {
				if (!songListCache) {
					const res = await invoke('get_song_list', { cateKey: 'title', desc: false, searchText: [] })
					songListCache = Array.isArray(res?.list) ? res.list : []
				}
				const song = songListCache.find(item => item.path === path)
				const lines = build(song?.lyrics, duration)
				// 兜底期间可能又切歌/后端已经写进真歌词了，确认一下再写
				if (!lines.length) return
				if (playerStore.currentSong?.path !== path) return
				if (playerStore.currentLyrics?.length) return
				playerStore.setLyrics(lines)
			} finally {
				filling = false
			}
		},
		{ immediate: true }
	)
}
