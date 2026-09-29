<template>
	<div ref="containerRef" class="glow-wrapper">
		<!-- 发光边框（在底层） -->
		<svg class="border-svg" :viewBox="`0 0 ${svgW} ${svgH}`">
			<defs>
				<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
					<feDropShadow
						dx="0"
						dy="0"
						:stdDeviation="strokeWidth * 2"
						flood-color="#00ffae"
						flood-opacity="0.8"
					/>
					<feDropShadow
						dx="0"
						dy="0"
						:stdDeviation="strokeWidth * 4"
						flood-color="#00ffae"
						flood-opacity="0.3"
					/>
				</filter>
			</defs>

			<!-- 背景轨道 -->

			<!-- 进度描边 -->
			<path
				class="arc"
				:d="pathD"
				fill="none"
				:stroke="progressColor"
				:stroke-width="strokeWidth"
				stroke-linecap="round"
				:stroke-dasharray="perimeter"
				:stroke-dashoffset="ratio"
				:filter="glow ? 'url(#glow)' : 'none'"
			/>
		</svg>

		<!-- 内容区（在上层，背景盖住边框中间） -->
		<div class="content">
			<slot />
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'

const props = defineProps({
	progress: { type: Number, default: 0 }, // 0-100
	radius: { type: Number, default: 8 },
	strokeWidth: { type: Number, default: 1.5 },
	progressColor: { type: String, default: '#00ffae' },
	bgColor: { type: String, default: 'rgba(255,255,255,0.08)' },
	glow: { type: Boolean, default: true },
	padding: { type: Number, default: 2 },
})

const containerRef = ref(null)
const svgW = ref(0)
const svgH = ref(0)
const perimeter = ref(0)
const ratio = ref(0)

const inset = computed(() => props.strokeWidth / 2 + props.padding)

// 生成圆角矩形路径（起点=顶部中间，顺时针）
const pathD = computed(() => {
	const w = svgW.value - inset.value * 2
	const h = svgH.value - inset.value * 2
	const r = props.radius
	const x = inset.value
	const y = inset.value
	const midTopX = x + w / 2

	if (w <= 0 || h <= 0) return ''

	// 从顶部中间开始，顺时针画圆角矩形
	return `
		M ${midTopX} ${y}
		L ${x + w - r} ${y}
		Q ${x + w} ${y} ${x + w} ${y + r}
		L ${x + w} ${y + h - r}
		Q ${x + w} ${y + h} ${x + w - r} ${y + h}
		L ${x + r} ${y + h}
		Q ${x} ${y + h} ${x} ${y + h - r}
		L ${x} ${y + r}
		Q ${x} ${y} ${x + r} ${y}
		L ${midTopX} ${y}
	`.trim()
})

// 周长（和之前一致）
const calcPerimeter = (w, h) => 2 * (w + h) - 8 * props.radius + 2 * Math.PI * props.radius

let observer
onMounted(async () => {
	await nextTick()
	const rect = containerRef.value.getBoundingClientRect()
	svgW.value = rect.width
	svgH.value = rect.height
	perimeter.value = calcPerimeter(rect.width - inset.value * 2, rect.height - inset.value * 2)

	observer = new ResizeObserver(([e]) => {
		const r = e.contentRect
		svgW.value = r.width
		svgH.value = r.height
		perimeter.value = calcPerimeter(r.width - inset.value * 2, r.height - inset.value * 2)
	})
	observer.observe(containerRef.value)
})

onUnmounted(() => observer?.disconnect())

watch(
	[() => props.progress, perimeter],
	() => {
		const p = Math.min(Math.max(props.progress, 0), 100)
		ratio.value = perimeter.value * (1 - p / 100)
	},
	{ immediate: true }
)
</script>

<style scoped>
.glow-wrapper {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: v-bind('props.radius + "px"');
	overflow: visible;
}

.border-svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 9;
}

.content {
	position: relative;
	z-index: 1;
	width: 100%;
	height: 100%;
	/* 内容区比边框小一点，留出发光空间 */
	/* padding: 2px; */
	box-sizing: border-box;
}

.arc {
	transition: stroke-dashoffset 0.15s linear;
}
</style>
