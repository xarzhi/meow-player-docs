<template>
	<div class="meow_spectrum" :style="{ height: height + 'px' }">
		<canvas ref="canvas" class="meow_spectrum_canvas"></canvas>
	</div>
</template>

<script setup>
// 全屏播放页的频谱。
//
// 数据源：`invoke('get_analyser')` 返回的 AnalyserNode 本体（后端真连在 <audio> 上的 FFT）。
// 拿不到分析器时**什么都不画**（不留假动画），只在控制台提示一句。
//
// 算法参考了站里原有的 .vitepress/theme/components/PlayerSpectrum.vue：
//   对数分频（40Hz~16kHz 均分成 N 段）-> 取每段平均能量 -> 上升即时 / 下落衰减 -> 画圆角柱
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { invoke } from '@utils/api'

const props = defineProps({
	// 也可以从外面直接传一个 AnalyserNode 进来；不传就自己去 invoke('get_analyser')
	analyser: { type: Object, default: null },
	bars: { type: Number, default: 56 },
	gap: { type: Number, default: 3 },
	radius: { type: Number, default: 3 },
	height: { type: Number, default: 56 },
	colorMode: { type: String, default: 'gradient' },
	color: { type: String, default: '#3ea6ff' },
	colorFrom: { type: String, default: '#00e0ff' },
	colorTo: { type: String, default: '#4d6bff' },
	minFreq: { type: Number, default: 40 },
	maxFreq: { type: Number, default: 16000 },
})

const canvas = ref(null)
const node = ref(null)

let raf = 0
let resizeObserver = null
let retryTimer = null
let retryCount = 0
let freqData = null
let smoothed = []
let frame = 0
let warned = false

/** 拿分析器：优先用外部传进来的，否则问后端要（后端第一次调用时才会把 <audio> 接进 Web Audio） */
async function acquireAnalyser() {
	if (props.analyser) {
		node.value = props.analyser
		return
	}
	let a = null
	try {
		a = await invoke('get_analyser')
	} catch (err) {
		a = null
	}
	if (a) {
		node.value = a
		return
	}
	// 拿不到就退避重试几次（比如音频还没开始播 / 浏览器还没给 AudioContext）
	if (retryCount++ < 10) {
		retryTimer = setTimeout(acquireAnalyser, 500)
	} else if (!warned) {
		warned = true
		console.warn('[meow] 拿不到 analyser，频谱不可用（不画假动画）')
	}
}

function resize() {
	const el = canvas.value
	if (!el || typeof window === 'undefined') return
	const dpr = window.devicePixelRatio || 1
	const rect = el.getBoundingClientRect()
	const w = Math.max(1, Math.round(rect.width))
	const h = Math.max(1, Math.round(rect.height))
	el.width = Math.round(w * dpr)
	el.height = Math.round(h * dpr)
	const c = el.getContext('2d')
	if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/** 取 [f0, f1] 频段的平均能量，归一化到 0~1 */
function bandAverage(data, sampleRate, f0, f1) {
	const nyquist = sampleRate / 2
	const bins = data.length
	let start = Math.floor((f0 / nyquist) * bins)
	let end = Math.ceil((f1 / nyquist) * bins)
	start = Math.max(0, Math.min(bins - 1, start))
	end = Math.max(start + 1, Math.min(bins, end))
	let sum = 0
	for (let i = start; i < end; i++) sum += data[i]
	return sum / (end - start) / 255
}

function roundedRect(c, x, y, w, h, r) {
	const rr = Math.max(0, Math.min(r, w / 2, h / 2))
	if (rr <= 0) {
		c.rect(x, y, w, h)
		return
	}
	c.moveTo(x + rr, y)
	c.lineTo(x + w - rr, y)
	c.quadraticCurveTo(x + w, y, x + w, y + rr)
	c.lineTo(x + w, y + h - rr)
	c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
	c.lineTo(x + rr, y + h)
	c.quadraticCurveTo(x, y + h, x, y + h - rr)
	c.lineTo(x, y + rr)
	c.quadraticCurveTo(x, y, x + rr, y)
	c.closePath()
}

function draw() {
	raf = requestAnimationFrame(draw)
	const el = canvas.value
	if (!el) return
	const c = el.getContext('2d')
	if (!c) return
	const w = el.clientWidth
	const h = el.clientHeight
	if (!w || !h) return

	frame++

	// 每帧都从 props 取，改设置马上生效
	const n = Math.max(8, Math.min(128, Math.round(props.bars)))
	const gap = Math.max(0, Math.min(24, props.gap))
	const radius = Math.max(0, props.radius)
	const mode = props.colorMode
	const a = props.analyser || node.value

	c.clearRect(0, 0, w, h)

	// 没有分析器就不画（不做假动画）
	if (!a) {
		smoothed = []
		return
	}

	// 浏览器自动播放策略下 AudioContext 可能是 suspended，这里顺手唤醒一下
	if (a.context && a.context.state === 'suspended' && frame % 30 === 0) {
		a.context.resume().catch(() => {})
	}

	if (smoothed.length !== n) smoothed = new Array(n).fill(0)

	if (!freqData || freqData.length !== a.frequencyBinCount) {
		freqData = new Uint8Array(a.frequencyBinCount)
	}
	a.getByteFrequencyData(freqData)

	const sampleRate = a.context?.sampleRate || 48000
	const fmin = Math.max(1, props.minFreq)
	const fmax = Math.max(fmin * 2, props.maxFreq)
	const ratio = fmax / fmin
	const values = new Array(n)
	for (let i = 0; i < n; i++) {
		const f0 = fmin * Math.pow(ratio, i / n)
		const f1 = fmin * Math.pow(ratio, (i + 1) / n)
		values[i] = bandAverage(freqData, sampleRate, f0, f1)
	}

	// 上升即时、下落带衰减，像真实电平表
	for (let i = 0; i < n; i++) {
		const target = values[i]
		smoothed[i] = target > smoothed[i] ? target : smoothed[i] * 0.85 + target * 0.15
	}

	const bw = Math.max(1, (w - gap * (n - 1)) / n)

	let fill = props.color
	if (mode === 'gradient') {
		const grad = c.createLinearGradient(0, h, 0, 0)
		grad.addColorStop(0, props.colorFrom)
		grad.addColorStop(1, props.colorTo)
		fill = grad
	}
	c.fillStyle = fill

	c.beginPath()
	for (let i = 0; i < n; i++) {
		const v = Math.max(0.02, Math.min(1, smoothed[i] * 1.35))
		const bh = Math.max(2, v * h)
		const x = i * (bw + gap)
		roundedRect(c, x, h - bh, bw, bh, radius)
	}
	c.fill()
}

onMounted(() => {
	resize()
	if (typeof ResizeObserver !== 'undefined' && canvas.value?.parentElement) {
		resizeObserver = new ResizeObserver(() => resize())
		resizeObserver.observe(canvas.value.parentElement)
	}
	if (typeof window !== 'undefined') window.addEventListener('resize', resize)
	acquireAnalyser()
	draw()
})

watch(
	() => props.analyser,
	a => {
		if (a) node.value = a
	}
)

// 高度变化后 canvas 的位图尺寸要重新算
watch(
	() => props.height,
	() => requestAnimationFrame(resize)
)

onBeforeUnmount(() => {
	cancelAnimationFrame(raf)
	raf = 0
	if (retryTimer) clearTimeout(retryTimer)
	retryTimer = null
	resizeObserver?.disconnect()
	if (typeof window !== 'undefined') window.removeEventListener('resize', resize)
})
</script>

<style lang="scss" scoped>
.meow_spectrum {
	width: 100%;
	transition: height 0.2s;
	pointer-events: none;
}
.meow_spectrum_canvas {
	display: block;
	width: 100%;
	height: 100%;
}
</style>
