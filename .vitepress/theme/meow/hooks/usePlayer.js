import { usePlayerStore } from '../stores'
import { toRefs, ref, watch } from 'vue'
import { invoke, Window, emitTo } from '@utils/api.js'
import { formatTime } from '@utils/utils.js'

const playerStore = usePlayerStore()
const { playState, currentMode, volume } = toRefs(playerStore)
const modeList = [
	{
		mode: 'order',
		title: '顺序播放',
		icon: 'icon-order',
	},
	{
		mode: 'repeat',
		title: '单曲循环',
		icon: 'icon-repeat',
	},
	{
		mode: 'random',
		title: '随机播放',
		icon: 'icon-random',
	},
]

const usePlayer = () => {
	const loadTrack = async index => {
		try {
			const currentSong = playerStore.playingList[index]
			const { hours, mins, secs } = formatTime(currentSong.duration)
			const playRes = await invoke('play_music', { path: currentSong.path })
			const is_pause = await invoke('is_paused')
			is_pause && (await invoke('start'))

			playState.value = 'playing'
			const song = {
				...currentSong,
				artists: currentSong.artist,
				pre_time: `00:00`,
				total_time: currentSong.durationStr,
			}
			playerStore.setCurrentSong(song)
			await playerStore.setLyrics(playRes)

			emitTo('mini-player', 'mini-listen', {
				type: 'loadTrack',
				currentSong: playerStore.currentSong,
			})
			emitTo('lyrics_window', 'updateCurrentInfo', {
				currentSong: playerStore.currentSong,
				currentLyrics: playerStore.currentLyrics,
			} )
			const appWindow = new Window('main')
			appWindow.setTitle(playerStore.currentSong.title + ' - ' + playerStore.currentSong.artist) // 切换任务栏标题名
		} catch (err) {
			console.error(err)
			throw new Error(err)
		}
	}

	const soundChange = async val => {
		volume.value = val
		await invoke('set_volume', { value: val / 100 })
	}

	const getRandomIndex = async () => {
		const randomIndex = await invoke('get_random', {
			min: 0,
			max: playerStore.playingList.length - 1,
		})
		let index = playerStore.getCurrentIndex()
		if (randomIndex === index) {
			getRandomIndex()
		} else {
			return randomIndex
		}
	}

	// 播放完毕，下一首
	const ended = async () => {
		if (Array.isArray(playerStore.playingList) && playerStore.playingList.length !== 0) {
			let index = playerStore.getCurrentIndex()
			if (index !== -1) {
				switch (currentMode.value.mode) {
					case 'order': {
						index++

						if (index > playerStore.playingList.length - 1) {
							index = 0
						}
						break
					}
					case 'repeat': {
						break
					}
					case 'random': {
						index = await getRandomIndex()
						break
					}
					default:
						break
				}
				loadTrack(index)
			} else {
				// 当前没有正在播放的音乐
			}
		} else {
			// 当前音乐库为空
		}
	}

	// 上一首
	const pre = () => {
		let index = playerStore.getCurrentIndex()
		index--
		if (index < 0) {
			index = playerStore.playingList.length - 1
		}
		loadTrack(index)
	}
	//下一首
	const next = () => {
		let index = playerStore.getCurrentIndex()
		index++
		if (index > playerStore.playingList.length - 1) {
			index = 0
		}
		loadTrack(index)
	}

	const seek = async pos => {
		await invoke('try_seek', {
			path: playerStore.currentSong.path,
			pos,
		})
	}
	// 播放-暂停
	const toggleStart = async () => {
		if (!playerStore.currentSong.id) {
			return
		}
		const is_pause = await invoke('is_paused')
		if (is_pause) {
			await invoke('start')
			playState.value = 'playing'
		} else {
			await invoke('pause')
			playState.value = 'paused'
		}
		emitTo('mini-player', 'mini-listen', {
			type: 'toggleStart',
			playState: playState.value,
		})
	}
	const changeMode = () => {
		let index = modeList.findIndex(item => item.mode === currentMode.value.mode)
		index++

		if (index > modeList.length - 1) {
			index = 0
		}

		const nextMode = modeList[index]

		currentMode.value = nextMode
	}

	return {
		loadTrack,
		soundChange,
		getRandomIndex,
		ended,
		pre,
		next,
		toggleStart,
		changeMode,
		seek,
	}
}

export default usePlayer
