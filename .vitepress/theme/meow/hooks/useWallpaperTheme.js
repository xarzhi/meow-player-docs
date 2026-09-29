import { invoke, convertFileSrc, getCurrentWindow, emitTo } from '@utils/api'
import useStorage from '@/hooks/useStorage'
import { usePlayerStore } from '../stores/index.js'

const useWallpaperTheme = () => {
	const { storage } = useStorage()
	const playerStore = usePlayerStore()

	const changeBg = async item => {
		playerStore.currentBgItem = item
		playerStore.lastBgUpdateTime = new Date().getTime()
		storage.setItem('currentBgItem', JSON.stringify(item))
		if (!playerStore.adaptive) return
		try {
			if (item.kind === 'img') {
				const img = await wallpaperPathToImg(item.path)
				const averageLuminance = getAverageLuminance(img)
				applyThemeByWallpaper(averageLuminance)
			} else {
				const img = await captureFirstFrame(item.path)
				const averageLuminance = getAverageLuminance(img)
				applyThemeByWallpaper(averageLuminance)
			}
		} catch (err) {
			console.error(err)
		}
	}
	// 获取视频第一帧并转化为img
	function captureFirstFrame(videoUrl) {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video')

			video.src = convertFileSrc(videoUrl)
			video.crossOrigin = 'anonymous'
			video.muted = true
			video.playsInline = true
			video.preload = 'auto'
			video.currentTime = 0.1 // 跳到第一帧

			video.addEventListener('seeked', () => {
				if (video.videoWidth === 0 || video.videoHeight === 0) {
					reject(new Error('视频无画面'))
					return
				}

				const canvas = document.createElement('canvas')
				canvas.width = video.videoWidth
				canvas.height = video.videoHeight

				const ctx = canvas.getContext('2d')
				if (!ctx) {
					reject(new Error('无法获取 Canvas 上下文'))
					return
				}
				ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

				// 释放资源
				video.pause()
				video.src = ''
				video.load()
				const img = new Image()
				img.onload = () => {
					URL.revokeObjectURL(img.src) // 清理内存
					resolve(img)
				}
				img.onerror = () => {
					reject(new Error('Image 创建失败'))
				}
				img.src = canvas.toDataURL('image/png')
			})

			video.addEventListener('error', () => reject(new Error('视频加载失败')))
		})
	}

	// 根据img图像的所有像素点rgba值计算平均亮度
	function getAverageLuminance(img) {
		if (!document) {
			throw new Error('no document found')
		}
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		canvas.width = img.naturalWidth
		canvas.height = img.naturalHeight

		ctx.drawImage(img, 0, 0)

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const pixels = imageData.data

		let totalLuminance = 0
		let pixelCount = 0

		for (let i = 0; i < pixels.length; i += 4) {
			const r = pixels[i]
			const g = pixels[i + 1]
			const b = pixels[i + 2]
			const a = pixels[i + 3]

			// 忽略完全透明像素
			if (a === 0) continue

			const luminance = 0.299 * r + 0.587 * g + 0.114 * b
			totalLuminance += luminance
			pixelCount++
		}

		return totalLuminance / pixelCount
	}

	// 读取本地图片并转还为img元素
	function wallpaperPathToImg(wallpaperPath) {
		return new Promise((resolve, reject) => {
			const assetUrl = convertFileSrc(wallpaperPath)
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => resolve(img)
			img.onerror = e => reject(new Error(`图片加载失败: ${assetUrl}`))
			img.src = assetUrl
		})
	}

	// 根据平均亮度切换明暗主题
	function applyThemeByWallpaper(avg) {
		if (avg < 100) {
			changeTheme('dark')
		} else {
			changeTheme('light')
		}
	}

	// 获取下一个壁纸的地址
	const getNextBgPath = async () => {
		const res = await invoke('get_next_background', {
			args: {
				mode: playerStore.changeMode,
				currentBgId: playerStore.currentBgItem.id,
			},
		})

		if (res && res.path) {
			return res
		}
	}

	// 自动切换壁纸

	// 修改主题色
	const changeTheme = async type => {
		let theme = type
		storage.setItem('themeMode', theme)
		playerStore.themeMode = theme
		const win = getCurrentWindow()

		if (type === 'system') {
			const mql = window.matchMedia('(prefers-color-scheme: dark)')
			theme = mql.matches ? 'light' : 'dark'
		}
		playerStore.isLight = theme === 'light' ? true : false
		const html = document.querySelector('html')
		if (html) {
			document.body.offsetHeight // 触发重绘

			html.dataset.theme = theme
			await win.setTheme(theme)
		}
		emitTo('mini-player', 'mini-listen', {
			type: 'theme-change',
			themeMode: playerStore.themeMode,
		})
	}

	return {
		changeBg,
		changeTheme,
		getNextBgPath,
	}
}

export default useWallpaperTheme
