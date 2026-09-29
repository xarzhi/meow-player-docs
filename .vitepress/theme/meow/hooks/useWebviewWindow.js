import { WebviewWindow } from '@utils/api'

const useWebviewWindow = () => {
	const createMiniPlayer = config => {
		return new WebviewWindow('mini-player', {
			url: '/mini-player',
			title: '',
			width: 350,
			height: 86,
			resizable: false,
			maximizable: false,
			skipTaskbar: true, // 不在任务栏创建tab
			decorations: false,
			alwaysOnTop: true,
			transparent: true,
			shadow: false,
			visible: true,
			...config,
		})
	}
	const createLyricsWindow = config => {
		return new WebviewWindow('lyrics_window', {
			url: '/lyrics_window',
			title: 'lyrics_window',
			width: 500,
			height: 120,
			minWidth: 500,
			minHeight: 120,
			resizable: true,
			skipTaskbar: true, // 不在任务栏创建tab
			decorations: false,
			visibleOnAllWorkspaces: true, // 多桌面/多空间都显示
			maximizable: false,
			alwaysOnTop: true,
			transparent: true,
			shadow: false,
			visible: true,
			...config,
		})
	}

	return {
		createMiniPlayer,
		createLyricsWindow,
	}
}

export default useWebviewWindow
