// 替掉 @tauri-apps/api/webviewWindow。
// 原版会开迷你播放器 / 桌面歌词这些独立窗口；网页演示里不开新窗口，全部空实现。
import { Window } from './window.js'

export class WebviewWindow extends Window {
  constructor(label = 'main', options = {}) {
    super(label)
    this.options = options
  }

  static async getByLabel(label) {
    return new WebviewWindow(label)
  }

  async once() {
    return Promise.resolve(() => {})
  }

  async onDragDropEvent() {
    return Promise.resolve(() => {})
  }

  async setPosition() {}
  async setSize() {}
  async setDecorations() {}
  async setResizable() {}
}

export function getCurrentWebviewWindow() {
  return new WebviewWindow('main')
}
