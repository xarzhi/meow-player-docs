<template>
	<Transition name="ps_fade">
		<div class="ps_mask" v-if="open" @click.self="close">
			<div class="ps_panel">
				<header class="ps_header">
					<div class="ps_title">播放器样式</div>
					<div class="ps_close" @click="close">
						<i class="iconfont icon-close"></i>
					</div>
				</header>

				<div class="ps_body">
					<div class="ps_group_title">歌词</div>

					<div class="ps_row">
						<div class="ps_label">歌词字号</div>
						<div class="ps_control">
							<a-slider v-model:value="playerStyle.lyricsFontSize" :min="12" :max="48" :step="1" />
						</div>
						<div class="ps_value">{{ playerStyle.lyricsFontSize }}px</div>
					</div>

					<div class="ps_row">
						<div class="ps_label">歌词对齐</div>
						<div class="ps_control">
							<a-radio-group v-model:value="playerStyle.lyricsAlign" size="small" button-style="solid">
								<a-radio-button value="left">左</a-radio-button>
								<a-radio-button value="center">中</a-radio-button>
								<a-radio-button value="right">右</a-radio-button>
							</a-radio-group>
						</div>
						<div class="ps_value"></div>
					</div>

					<div class="ps_group_title">频谱</div>

					<div class="ps_row">
						<div class="ps_label">颜色模式</div>
						<div class="ps_control">
							<a-radio-group v-model:value="playerStyle.spectrumColorMode" size="small" button-style="solid">
								<a-radio-button value="solid">纯色</a-radio-button>
								<a-radio-button value="gradient">渐变</a-radio-button>
							</a-radio-group>
						</div>
						<div class="ps_value"></div>
					</div>

					<div class="ps_row">
						<div class="ps_label">{{ playerStyle.spectrumColorMode === 'solid' ? '颜色' : '起始色' }}</div>
						<div class="ps_control">
							<input
								class="ps_color"
								type="color"
								v-model="playerStyle.spectrumColor"
								title="纯色 / 渐变起始色"
							/>
						</div>
						<div class="ps_value"></div>
					</div>

					<div class="ps_row" v-if="playerStyle.spectrumColorMode === 'gradient'">
						<div class="ps_label">结束色</div>
						<div class="ps_control">
							<input
								class="ps_color"
								type="color"
								v-model="playerStyle.spectrumColorTo"
								title="渐变结束色"
							/>
						</div>
						<div class="ps_value"></div>
					</div>

					<div class="ps_row">
						<div class="ps_label">颜色预览</div>
						<div class="ps_control">
							<div class="ps_preview" :style="{ background: previewBackground }"></div>
						</div>
						<div class="ps_value"></div>
					</div>

					<div class="ps_row">
						<div class="ps_label">柱数</div>
						<div class="ps_control">
							<a-slider v-model:value="playerStyle.spectrumBars" :min="16" :max="96" :step="1" />
						</div>
						<div class="ps_value">{{ playerStyle.spectrumBars }}</div>
					</div>

					<div class="ps_row">
						<div class="ps_label">柱间距</div>
						<div class="ps_control">
							<a-slider v-model:value="playerStyle.spectrumGap" :min="0" :max="12" :step="1" />
						</div>
						<div class="ps_value">{{ playerStyle.spectrumGap }}px</div>
					</div>

					<div class="ps_row">
						<div class="ps_label">圆角</div>
						<div class="ps_control">
							<a-slider v-model:value="playerStyle.spectrumRadius" :min="0" :max="12" :step="1" />
						</div>
						<div class="ps_value">{{ playerStyle.spectrumRadius }}px</div>
					</div>

					<div class="ps_row">
						<div class="ps_label">频谱高度</div>
						<div class="ps_control">
							<a-slider v-model:value="playerStyle.spectrumHeight" :min="24" :max="140" :step="2" />
						</div>
						<div class="ps_value">{{ playerStyle.spectrumHeight }}px</div>
					</div>
				</div>

				<footer class="ps_footer">
					<button class="ps_btn" @click="resetPlayerStyle">恢复默认</button>
					<button class="ps_btn primary" @click="close">完成</button>
				</footer>
			</div>
		</div>
	</Transition>
</template>

<script setup>
// 全屏播放页右下角（进度条上方）的「频谱 / 歌词」样式弹窗。
//
// 改的都是共享的 playerStyle（模块级 reactive 单例），所以改完立刻生效：
//   * 歌词字号 / 对齐 -> Lyrics.vue 直接读 playerStyle
//   * 频谱颜色 / 柱数 / 圆角 -> Player.vue 把它们当 props 绑给 Spectrum.vue
import { computed } from 'vue'
import { playerStyle, resetPlayerStyle } from './playerStyle.js'

const props = defineProps({
	open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const close = () => emit('update:open', false)

const previewBackground = computed(() =>
	playerStyle.spectrumColorMode === 'solid'
		? playerStyle.spectrumColor
		: `linear-gradient(to top, ${playerStyle.spectrumColor} 0%, ${playerStyle.spectrumColorTo} 100%)`
)
</script>

<style lang="scss" scoped>
.ps_mask {
	position: absolute;
	inset: 0;
	z-index: 20;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(0, 0, 0, 0.25);
	backdrop-filter: blur(2px);
}
.ps_panel {
	width: 460px;
	max-height: 88%;
	display: flex;
	flex-flow: column;
	padding: 10px 20px 14px;
	box-sizing: border-box;
	border-radius: 10px;
	background-color: rgba(255, 255, 255, 0.86);
	backdrop-filter: blur(12px);
	box-shadow: 0 0 12px 0 rgba(0, 0, 0, 0.35);
	color: #333;
	transition: background-color 0.3s;
}
.ps_header {
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	.ps_title {
		font-size: 15px;
		font-weight: 500;
	}
	.ps_close {
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
		i {
			font-size: 13px;
		}
		&:hover {
			background-color: rgba(0, 0, 0, 0.12);
		}
		&:active {
			transform: scale(0.92);
		}
	}
}
.ps_body {
	flex: 1;
	overflow-y: auto;
	padding: 4px 0 6px;
	.ps_group_title {
		font-size: 12px;
		color: rgba(0, 0, 0, 0.45);
		margin: 6px 0 2px;
		padding-left: 2px;
	}
	.ps_row {
		display: flex;
		align-items: center;
		min-height: 34px;
		.ps_label {
			width: 76px;
			flex: none;
			font-size: 13px;
		}
		.ps_control {
			flex: 1;
			min-width: 0;
			display: flex;
			align-items: center;
			/* antd 的 .ant-slider 本身没有宽度，放在 flex 里会塌成 0，必须显式撑开 */
			:deep(.ant-slider) {
				width: 100%;
				flex: 1;
				margin: 4px 8px;
			}
			.ps_color {
				width: 34px;
				height: 22px;
				padding: 0;
				border: 1px solid rgba(0, 0, 0, 0.15);
				border-radius: 4px;
				background: none;
				cursor: pointer;
			}
			.ps_preview {
				width: 100%;
				height: 16px;
				border-radius: 4px;
				border: 1px solid rgba(0, 0, 0, 0.1);
			}
		}
		.ps_value {
			width: 46px;
			flex: none;
			text-align: right;
			font-size: 12px;
			color: rgba(0, 0, 0, 0.55);
		}
	}
}
.ps_footer {
	display: flex;
	justify-content: flex-end;
	padding-top: 8px;
	.ps_btn {
		min-width: 76px;
		height: 28px;
		margin-left: 10px;
		font-size: 13px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		background-color: rgba(255, 255, 255, 0.9);
		color: #333;
		cursor: pointer;
		&:hover {
			background-color: #fff;
			border-color: var(--menu-active-bar-color, #335eea);
			color: var(--menu-active-bar-color, #335eea);
		}
		&:active {
			transform: scale(0.97);
		}
		&.primary {
			background-color: var(--menu-active-bar-color, #335eea);
			border-color: var(--menu-active-bar-color, #335eea);
			color: #fff;
			&:hover {
				color: #fff;
				opacity: 0.88;
			}
		}
	}
}

/* 暗色主题下弹窗跟着变深（--primary-text-color 由 PlayerDemo 按 data-theme 覆写） */
.ps_fade-enter-active,
.ps_fade-leave-active {
	transition: opacity 0.2s ease;
}
.ps_fade-enter-from,
.ps_fade-leave-to {
	opacity: 0;
}
</style>
