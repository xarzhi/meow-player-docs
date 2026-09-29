// 全屏播放器「频谱 / 歌词」的样式配置（本次会话内立即生效）。
//
// 为什么单独放一个文件、而不是往 playerStore 里加字段：
// 本次任务的文件白名单里没有 stores/index.js（还有别的子任务在动它），
// 所以这里用一个模块级的 reactive 单例做组件间共享：
//   * Player.vue / Spectrum.vue / PlayerStyleModal.vue / Lyrics.vue 直接 import 同一个对象
//   * 改一下属性，所有正在渲染的组件下一帧就跟着变（真·立即生效）
//   * 完全不碰 playerStore 现有字段，也就不会改坏它
import { reactive } from 'vue'

/** 默认样式（也是「恢复默认」用的那份） */
export const DEFAULT_PLAYER_STYLE = {
	// 歌词
	lyricsFontSize: 24, // px，和 Lyrics.vue 里原来的写死值一致
	lyricsAlign: 'left', // left | center | right

	// 频谱
	spectrumBars: 56, // 柱数
	spectrumGap: 3, // 柱子间距（px），越小柱子越粗
	spectrumRadius: 3, // 圆角（px）
	spectrumHeight: 56, // 频谱高度（px）
	spectrumColorMode: 'gradient', // solid（纯色）| gradient（多色渐变）
	spectrumColor: '#3ea6ff', // 纯色 / 渐变起始色（柱子底部）
	spectrumColorTo: '#4d6bff', // 渐变结束色（柱子顶部，两根色标就是 2 色渐变）
}

/** 共享的样式状态 */
export const playerStyle = reactive({ ...DEFAULT_PLAYER_STYLE })

/** 恢复默认 */
export function resetPlayerStyle() {
	Object.assign(playerStyle, DEFAULT_PLAYER_STYLE)
}
