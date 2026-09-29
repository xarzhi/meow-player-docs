<!-- .vitepress/theme/Layout.vue -->

<script setup>
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { nextTick, provide } from 'vue'
import PlayerDemo from './components/PlayerDemo.vue'
const { isDark } = useData()
const enableTransitions = () => {
	if (!document || !window) return
	'startViewTransition' in document && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

provide('toggle-appearance', async ({ clientX: x, clientY: y }) => {
	if (!enableTransitions()) {
		isDark.value = !isDark.value
		return
	}

	const clipPath = [
		`circle(0px at ${x}px ${y}px)`,
		`circle(${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px at ${x}px ${y}px)`,
	]

	await document.startViewTransition(async () => {
		isDark.value = !isDark.value
		await nextTick()
	}).ready

	document.documentElement.animate(
		{ clipPath: isDark.value ? clipPath.reverse() : clipPath },
		{
			duration: 300,
			easing: 'ease-in',
			pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`,
		}
	)
})
</script>

<template>
	<DefaultTheme.Layout>
		<!-- 首页 hero 右侧原来放 player.png 的位置（VPHero 的 home-hero-image 插槽），
		     换成活的播放器组件。默认主题的 Layout 会检测到这个插槽，
		     即使 hero.image 不配置，那个容器也照样渲染。 -->
		<template #home-hero-image>
			<PlayerDemo />
		</template>
	</DefaultTheme.Layout>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
	animation: none;
	mix-blend-mode: normal;
}

::view-transition-old(root),
.dark::view-transition-new(root) {
	z-index: 1;
}

::view-transition-new(root),
.dark::view-transition-old(root) {
	z-index: 9999;
}

.VPSwitchAppearance {
	width: 22px !important;
}

.VPSwitchAppearance .check {
	transform: none !important;
}
</style>
