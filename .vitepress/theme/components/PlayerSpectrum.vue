<script setup>
// 真 FFT 频谱：从 AnalyserNode 取频域数据，按对数分频映射成柱子。
// 没有分析器时画一条缓慢起伏的待机波形，避免看起来像坏掉了。
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  analyser: { type: Object, default: null },
  bars: { type: Number, default: 56 },
  rounded: { type: Boolean, default: true },
  color: { type: String, default: '' },
})

const canvas = ref(null)

let raf = 0
let observer = null
let freqData = null
let smoothed = []
let idlePhase = 0
let colorTop = '#0091ff'
let colorBottom = '#0068b7'
let colorTick = 0

function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function refreshColors() {
  if (props.color) {
    colorTop = props.color
    colorBottom = props.color
    return
  }
  colorBottom = cssVar('--vp-c-brand-1', '#0091ff')
  colorTop = cssVar('--vp-c-brand-2', colorBottom)
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

/** 取 [f0, f1] 频段内的平均能量，归一化到 0~1 */
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
  c.beginPath()
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

  const n = Math.max(8, Math.min(96, props.bars))
  if (smoothed.length !== n) smoothed = new Array(n).fill(0)

  // 每 60 帧重新读一次主题色，兼顾亮/暗切换和性能
  if (colorTick++ % 60 === 0) refreshColors()

  c.clearRect(0, 0, w, h)

  const a = props.analyser
  const values = new Array(n)
  if (a) {
    if (!freqData || freqData.length !== a.frequencyBinCount) {
      freqData = new Uint8Array(a.frequencyBinCount)
    }
    a.getByteFrequencyData(freqData)
    const sampleRate = a.context?.sampleRate || 48000
    const fmin = 40
    const fmax = 16000
    const ratio = fmax / fmin
    for (let i = 0; i < n; i++) {
      const f0 = fmin * Math.pow(ratio, i / n)
      const f1 = fmin * Math.pow(ratio, (i + 1) / n)
      values[i] = bandAverage(freqData, sampleRate, f0, f1)
    }
  } else {
    idlePhase += 0.02
    for (let i = 0; i < n; i++) {
      const t = i / n
      values[i] = 0.05 + 0.045 * (1 + Math.sin(idlePhase + t * 9)) * (1 - t * 0.6)
    }
  }

  // 上升即时、下落带衰减，看起来更像真实电平表
  for (let i = 0; i < n; i++) {
    const target = values[i]
    smoothed[i] = target > smoothed[i] ? target : smoothed[i] * 0.86 + target * 0.14
  }

  const gap = Math.max(1, Math.round(((w / n) * 0.3)))
  const bw = Math.max(1, (w - gap * (n - 1)) / n)
  const grad = c.createLinearGradient(0, h, 0, 0)
  grad.addColorStop(0, colorBottom)
  grad.addColorStop(1, colorTop)
  c.fillStyle = grad

  for (let i = 0; i < n; i++) {
    const v = Math.max(0.03, Math.min(1, smoothed[i] * 1.3))
    const bh = Math.max(2, v * h)
    const x = i * (bw + gap)
    const y = h - bh
    if (props.rounded) {
      roundedRect(c, x, y, bw, bh, Math.min(bw / 2, 6))
      c.fill()
    } else {
      c.fillRect(x, y, bw, bh)
    }
  }
}

onMounted(() => {
  resize()
  refreshColors()
  if (typeof ResizeObserver !== 'undefined' && canvas.value?.parentElement) {
    observer = new ResizeObserver(() => resize())
    observer.observe(canvas.value.parentElement)
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', resize)
  draw()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (observer) observer.disconnect()
  if (typeof window !== 'undefined') window.removeEventListener('resize', resize)
})
</script>

<template>
  <div class="mp-spectrum">
    <canvas ref="canvas" class="mp-spectrum-canvas" />
  </div>
</template>

<style scoped>
.mp-spectrum {
  width: 100%;
  height: 46px;
}
.mp-spectrum-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
