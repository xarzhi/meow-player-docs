import { TrayIcon } from '@tauri-apps/api/tray'
import { Menu } from '@tauri-apps/api/menu'
import { defaultWindowIcon } from '@tauri-apps/api/app'
import { Window, getCurrentWindow } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'

const window = getCurrentWindow()
if (window.label === 'main') {
	const menu = await Menu.new({
		items: [
			{
				id: 'quit',
				text: '退出',
				action: async () => {
					await exit(0)
				},
			},
		],
	})
	const options = {
		menu,
		icon: await defaultWindowIcon(),
		menuOnLeftClick: false,
		tooltip: '双击打开主页面',
		action: event => {
			console.log(event.type)

			switch (event.type) {
				case 'Click':
					// const appWindow = new Window('main');
					// appWindow.show()
					break
				case 'DoubleClick':
					winShowFocus()
					break
			}
		},
	}

	async function winShowFocus() {
		const win = new Window('main')
		if (!(await win.isVisible())) {
			win.show()
		} else {
			if (await win.isMinimized()) {
				await win.unminimize()
			}
			await win.setFocus()
		}
	}
	const tray = await TrayIcon.new( options )
	console.log(tray)
}
