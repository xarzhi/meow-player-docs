import { nextTick } from 'vue'

const useFlip = () => {
	// 返回节点数组的位置信息
	const getPosition = doms => {
		return doms
			.map(dom => {
				const rect = dom.getBoundingClientRect()
				return {
					dom,
					top: rect.top,
				}
			})
			.filter(item => item.top)
	}

	/**
	 *
	 * @param doms Arry 需要进行flip动画的dom节点，
	 * @param beforeTransition Function 动画前的回调
	 * @param afterTransition  Function 动画完成后的回调
	 */
	const flip = async (doms, beforeTransition, afterTransition) => {
		const starts = await doms()
		console.log(starts)
		await beforeTransition()
		nextTick(async () => {
			const ends = await doms()
			const animations = []
			ends.forEach(async end => {
				const start = starts.find(s => s.dom.dataset.id === end.dom.dataset.id)
				if (start && start.top !== null && end && end.top !== null) {
					const dis = start.top - end.top
					const animate = end.dom.animate(
						[{ transform: `translateY(${dis}px)` }, { transform: `translateY(0)` }],
						{
							duration: 400,
							easing: 'cubic-bezier(0.55, 0, 0.1, 1)',
						}
					)
					animations.push(animate.finished)
				}
			})
			await Promise.all(animations)
			afterTransition?.()
		})
	}

	return {
		flip,
	}
}

export default useFlip
