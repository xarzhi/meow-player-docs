<template>
	<div
		class="adverge_color"
		:style="{
			background: bgColor,
		}"
	>
		123
	</div>
</template>

<script setup>
import { watch, ref, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/index.js'
const bgColor = ref()
const playerStore = usePlayerStore()
/**
 * 颜色减淡（基于RGB的线性减淡算法）
 * @param {string} color - 十六进制颜色值，如 "#3498db"
 * @param {number} percent - 变亮幅度，0到1之间的小数
 * @returns {string} 变亮后的十六进制颜色值
 */
function lightenColor(color, percent) {
	// 移除#号并验证格式
	let hex = color.replace('#', '')
	if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
		throw new Error('Invalid hex color format')
	}

	// 将十六进制转换为RGB
	let r = parseInt(hex.substr(0, 2), 16)
	let g = parseInt(hex.substr(2, 2), 16)
	let b = parseInt(hex.substr(4, 2), 16)

	// 计算变亮后的RGB值
	r = Math.floor(r + (255 - r) * percent)
	g = Math.floor(g + (255 - g) * percent)
	b = Math.floor(b + (255 - b) * percent)

	// 确保值在0-255范围内
	r = Math.min(255, Math.max(0, r))
	g = Math.min(255, Math.max(0, g))
	b = Math.min(255, Math.max(0, b))

	// 将RGB转换回十六进制
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

onMounted(() => {})

const initColor = color => {
	const img = new Image()
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	img.src = color ? color : playerStore.currentSong.coverUrl
	img.onload = function () {
		canvas.width = img.width
		canvas.height = img.height
		ctx.drawImage(img, 0, 0)

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData.data
		let r = 0,
			g = 0,
			b = 0

		for (let i = 0; i < data.length; i += 4) {
			r += data[i]
			g += data[i + 1]
			b += data[i + 2]
		}

		const totalPixels = data.length / 4
		const avgR = Math.round(r / totalPixels)
		const avgG = Math.round(g / totalPixels)
		const avgB = Math.round(b / totalPixels)

		const rgbToHex = (r, g, b) => {
			// 确保数值在0-255范围内
			r = Math.max(0, Math.min(255, r))
			g = Math.max(0, Math.min(255, g))
			b = Math.max(0, Math.min(255, b))
			// 转换为16进制并确保两位数格式
			const toHex = c => {
				const hex = c.toString(16)
				return hex.length === 1 ? '0' + hex : hex
			}
			return `#${toHex(r)}${toHex(g)}${toHex(b)}`
		}

		const avgColor = rgbToHex(avgR, avgG, avgB)
		const lightColor = lightenColor(avgColor, 1)
		bgColor.value = `linear-gradient(135deg,${avgColor}, ${lightColor})`
		console.log(bgColor.value)
	}
}
watch(
	() => playerStore.currentSong.coverUrl,
	newV => {
		initColor(newV)
	}
)
</script>

<style lang="scss" scoped>
.adverge_color {
	width: 100%;
	height: 100%;
}
</style>
