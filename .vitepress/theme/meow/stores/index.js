import { ref, reactive, computed, onMounted, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import useStorage from '@/hooks/useStorage'
import { Window } from '@tauri-apps/api/window'
import { isEnabled } from '@tauri-apps/plugin-autostart'
import { getCurrentWindow } from '@utils/api'
import useWallpaperTheme from '@/hooks/useWallpaperTheme'

export const usePlayerStore = defineStore('store', () => {
	const { storage } = useStorage()
	const wallpaperTheme = useWallpaperTheme()
	const autoBgChangeTimer = ref(null)

	const menuCollapase = ref(false)

	// player相关
	const is_player_fullscreen = ref(false)
	const is_app_fullscreen = ref(false)
	const playState = ref('paused') //  当前播放器播放状态    正在播放：playing  | 暂停播放：paused
	const themeMode = ref('light') // 当前主题色
	const isLight = ref(true)
	const sort_cate = ref('title') // 排序方式
	const sort_mode = ref('desc') // desc：降序     asc：升序
	const lyricsFontSize = ref(20)
	const closeBehavior = ref('tray') // tray：最小化到托盘      close：直接关闭
	const isIgnoringMouseEvents = ref(false) // tray：最小化到托盘      close：直接关闭
	const recordType = ref('黑胶唱片')
	const needLetterElevator = ref(true) // 是否需要字母电梯导航
	const isWindowAllwaysOntop = ref(false) // 主窗口是否置顶
	const autoStart = ref(false) // 是否开机自启
	const autoStartInSlience = ref(false) // 是否静默启动
	const volume = ref(100) // 音量
	const currentTime = ref(0) // 当前播放时间
	const currentLyrics = shallowRef([]) // 当前播放歌词
	const musicLibPaths = ref([])
	const playingList = ref([])
	const currentSong = ref({
		id: '',
		name: '',
		artists: '',
		album: '',
		coverUrl: '',
		pre_time: '',
		total_time: '',
	})

	// 壁纸相关
	const currentBgItem = ref({}) // 当前壁纸的信息，id,path,kind
	const lastBgUpdateTime = ref(0) // 上次壁纸的切换时间
	const needBg = ref(false) // 需不需要壁纸功能
	const currentMaterial = ref('classic') // 当前窗口材质：classic(默认) / acrylic / mica
	const timeGap = ref(30) // 壁纸自动切换的时间间隔
	const timeUnit = ref('min') // 壁纸自动切换的时间单位
	const changeMode = ref('next') // 壁纸自动切换的方式：顺序切换、随机切换
	const needAutoChangeBg = ref(false) // 是否需要自动切换壁纸
	const adaptive = ref(true) // 主题自适应壁纸
	const darkness = ref(0.2) // 暗色主题暗度

	// 云听有关
	const cloud = reactive({
		webdavUrl: 'https://webdav.123pan.cn',
		musicLibPath: '',
		contractType: '',
		username: '17356799164',
		password: 'v0wmsjsy',
		connectName: 'asd',
	})

	const unitOptions = [
		{ value: 'sec', label: '秒', multiple: 1000 },
		{ value: 'min', label: '分', multiple: 60 * 1000 },
		{ value: 'hour', label: '时', multiple: 60 * 60 * 1000 },
	]

	const currentMode = ref({
		mode: 'order',
		title: '顺序播放',
		icon: 'icon-order',
	})

	onMounted(async () => {
		const window = getCurrentWindow()
		const isAlwaysOnTop = await window.isAlwaysOnTop()
		isWindowAllwaysOntop.value = isAlwaysOnTop

		const isAutoStart = await isEnabled()
		autoStart.value = isAutoStart
	})
	const toggleSortMode = () => {
		if (sort_mode.value === 'desc') {
			sort_mode.value = 'asc'
		} else if (sort_mode.value === 'asc') {
			sort_mode.value = 'desc'
		}

		storage.setItem('sort_mode', sort_mode.value)
	}

	const setLyrics = async lyrics => {
		currentLyrics.value = lyrics.map((item, index) => {
			return {
				...item,
				translatedLyric: '',
				romanLyric: '',
				isBG: false,
				isDuet: false,
			}
		})
	}

	// 获取当前播放音乐在  播放列表中的index
	const getCurrentIndex = () => {
		let index = -1
		if (playingList.value && playingList.value.length !== 0 && currentSong.value.id) {
			index = playingList.value.findIndex(item => item.id === currentSong.value.id)
		}
		return index
	}

	const setPlayingList = list => {
		if (typeof list === 'function') {
			playingList.value = list()
		} else if (Array.isArray(list)) {
			playingList.value = JSON.parse(JSON.stringify(list))
		}
	}

	const setCurrentSong = song => {
		currentSong.value = song
	}

	const appToggleFullScreen = async () => {
		const window = getCurrentWindow()
		const appWindow = new Window('main')

		const isFullScreen = await window.isFullscreen()
		const isMaximized = await appWindow.isMaximized()

		if (isMaximized) {
			let timer = setTimeout(async () => {
				if (await appWindow.isMaximized()) {
					await appWindow.unmaximize()
				}
				let timer1 = setTimeout(async () => {
					window.setFullscreen(true)
					is_app_fullscreen.value = true
					clearTimeout(timer1)
				}, 50)
				clearTimeout(timer)
			}, 10)
		} else {
			if (isFullScreen) {
				window.setFullscreen(false)
				is_app_fullscreen.value = false
			} else {
				window.setFullscreen(true)
				is_app_fullscreen.value = true
			}
		}
	}

	// 刷新音乐库
	const updateMusucLib = async () => {
		// 重新写
		await initList()
		return true
	}

	// 加载配置
	const initConfig = async () => {
		currentBgItem.value = JSON.parse(await storage.getItem('currentBgItem')) || {}
		// 材质只有这三种；存过的旧值（比如 tabbed）一律回落到经典的纯色窗口
		const savedMaterial = await storage.getItem('currentMaterial')
		currentMaterial.value = ['acrylic', 'mica', 'classic'].includes(savedMaterial)
			? savedMaterial
			: 'classic'
		needBg.value = (await storage.getItem('needBg')) || false
		timeGap.value = (await storage.getItem('timeGap')) || 30
		timeUnit.value = (await storage.getItem('timeUnit')) || 'min'
		changeMode.value = (await storage.getItem('changeMode')) || 'next'
		needAutoChangeBg.value = (await storage.getItem('needAutoChangeBg')) || false
		themeMode.value = (await storage.getItem('themeMode')) || 'light'
		menuCollapase.value = (await storage.getItem('menuCollapase')) || false

		sort_cate.value = (await storage.getItem('sort_cate')) || 'title'
		sort_mode.value = (await storage.getItem('sort_mode')) || 'desc'

		darkness.value = (await storage.getItem('darkness')) || 0.2
		document.documentElement.style.setProperty('--darkness', darkness.value)

		musicLibPaths.value = JSON.parse(await storage.getItem('musicLibPaths')) || []

		wallpaperTheme.changeTheme(themeMode.value)
		if (needAutoChangeBg.value) {
			lastBgUpdateTime.value = new Date().getTime()
			setAutoChangeBg(true)
		}
	}
	const setAutoChangeBg = val => {
		storage.setItem('needAutoChangeBg', val)
		if (autoBgChangeTimer.value) {
			clearInterval(autoBgChangeTimer.value)
			autoBgChangeTimer.value = null
		}
		if (val) {
			lastBgUpdateTime.value = new Date().getTime()
			autoBgChangeTimer.value = setInterval(async () => {
				const multiple = unitOptions.find(item => item.value === timeUnit.value).multiple
				const now = new Date().getTime()
				if (now - lastBgUpdateTime.value >= timeGap.value * multiple) {
					const wallpaper = await wallpaperTheme.getNextBgPath()
					wallpaperTheme.changeBg(wallpaper)
				}
			}, 1000)
		}
	}

	return {
		is_player_fullscreen,
		playState,
		currentMode,
		getCurrentIndex,
		themeMode,
		volume,
		lyricsFontSize,
		toggleSortMode,
		sort_mode,
		sort_cate,
		is_app_fullscreen,
		appToggleFullScreen,
		closeBehavior,
		isIgnoringMouseEvents,
		recordType,
		updateMusucLib,
		needLetterElevator,
		isWindowAllwaysOntop,
		autoStart,
		autoStartInSlience,
		currentTime,
		currentBgItem,
		initConfig,
		lastBgUpdateTime,
		needBg,
		currentMaterial,
		unitOptions,
		timeGap,
		timeUnit,
		changeMode,
		needAutoChangeBg,
		isLight,
		currentLyrics,
		setLyrics,
		adaptive,
		musicLibPaths,
		setPlayingList,
		playingList,
		setCurrentSong,
		currentSong,
		autoBgChangeTimer,
		setAutoChangeBg,
		cloud,
		darkness,
		menuCollapase,
	}
})
