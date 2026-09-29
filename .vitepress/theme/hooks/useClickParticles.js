import { onMounted, ref } from 'vue'
import anime from 'animejs'

const useClickParticles = () => {
	onMounted(() => {
		createCanvas()
	})
	const numberOfParticules = 30
	const pointerX = ref(0)
	const pointerY = ref(0)
	const colors = ['#FF1461', '#18FF92', '#5A87FF', '#FBF38C']
	const canvas = ref(null)
	const ctx = ref(null)
	const createCanvas = () => {
		if (!window) return

		canvas.value = document.createElement('canvas')
		ctx.value = canvas.value.getContext('2d')
		const canStyle = {
			position: 'fixed',
			left: '0px',
			top: '0px',
			pointerEvents: 'none',
			zIndex: '999999999',
			width: window.innerWidth,
			height: window.innerHeight,
		}

		canvas.value.id = 'fireworks'

		for (let key in canStyle) {
			canvas.value.style[key] = canStyle[key]
		}
		document.body.append(canvas.value)

		const setCanvasSize = debounce(function () {
			canvas.value.width = 2 * window.innerWidth
			canvas.value.height = 2 * window.innerHeight
			canvas.value.style.width = window.innerWidth + 'px'
			canvas.value.style.height = window.innerHeight + 'px'
			canvas.value.getContext('2d').scale(2, 2)
		}, 500)

		const render = anime({
			duration: 1 / 0,
			update: function () {
				ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
			},
		})
		document.addEventListener(
			'click',
			function (e) {
				if (
					'sidebar' !== e.target.id &&
					'toggle-sidebar' !== e.target.id &&
					'A' !== e.target.nodeName &&
					'IMG' !== e.target.nodeName
				) {
					render.play()
					updateCoords(e)
					animateParticules(pointerX.value, pointerY.value)
				}
			},
			false
		)
		setCanvasSize()
		window.addEventListener('resize', setCanvasSize, false)
	}

	function updateCoords(e) {
		pointerX.value = (e.clientX || e.touches[0].clientX) - canvas.value.getBoundingClientRect().left
		pointerY.value = e.clientY || e.touches[0].clientY - canvas.value.getBoundingClientRect().top
	}
	function setParticuleDirection(e) {
		var t = (anime.random(0, 360) * Math.PI) / 180,
			a = anime.random(50, 180),
			n = [-1, 1][anime.random(0, 1)] * a
		return {
			x: e.x + n * Math.cos(t),
			y: e.y + n * Math.sin(t),
		}
	}

	function createParticule(e, t) {
		var a = {}
		return (
			(a.x = e),
			(a.y = t),
			(a.color = colors[anime.random(0, colors.length - 1)]),
			(a.radius = anime.random(4, 8)),
			(a.endPos = setParticuleDirection(a)),
			(a.draw = function () {
				ctx.value.beginPath()
				ctx.value.arc(a.x, a.y, a.radius, 0, 2 * Math.PI, !0)
				ctx.value.fillStyle = a.color
				ctx.value.fill()
			}),
			a
		)
	}

	function createCircle(e, t) {
		var a = {}
		return (
			(a.x = e),
			(a.y = t),
			(a.color = '#F00'),
			(a.radius = 0.1),
			(a.alpha = 0.5),
			(a.lineWidth = 6),
			(a.draw = function () {
				ctx.value.globalAlpha = a.alpha
				ctx.value.beginPath()
				ctx.value.arc(a.x, a.y, a.radius, 0, 2 * Math.PI, !0)
				ctx.value.lineWidth = a.lineWidth
				ctx.value.strokeStyle = a.color
				ctx.value.stroke()
				ctx.value.globalAlpha = 1
			}),
			a
		)
	}

	function renderParticule(e) {
		for (var t = 0; t < e.animatables.length; t++) e.animatables[t].target.draw()
	}

	function animateParticules(e, t) {
		for (var a = createCircle(e, t), n = [], i = 0; i < numberOfParticules; i++) n.push(createParticule(e, t))
		anime.timeline().add({
			targets: n,
			x: function (e) {
				return e.endPos.x
			},
			y: function (e) {
				return e.endPos.y
			},
			radius: 0.1,
			duration: anime.random(1200, 1800),
			easing: 'easeOutExpo',
			update: renderParticule,
		})
	}

	function debounce(fn, delay) {
		let timer
		return function () {
			const context = this
			const args = arguments
			clearTimeout(timer)
			timer = setTimeout(function () {
				// if (fn.apply) fn.apply(context, args)
				fn()
			}, delay)
		}
	}

	return {
		createCanvas,
	}
}

export default useClickParticles
