// 替掉 @tauri-apps/api/window。
// 网页演示里没有真实的原生窗口，所以窗口操作基本都是空实现；
// 唯一要小心的是 setTitle —— 绝不能真的去改文档站的标签页标题。
export class Window {
  constructor(label = 'main') {
    this.label = label
  }

  async isFullscreen() {
    return Boolean(typeof document !== 'undefined' && document.fullscreenElement)
  }

  async setFullscreen() {
    // 演示里不接管整页全屏，避免把文档站顶掉
    return
  }

  async isMaximized() {
    return false
  }

  async isMinimized() {
    return false
  }

  async isAlwaysOnTop() {
    return false
  }

  async setAlwaysOnTop() {}
  async unmaximize() {}
  async maximize() {}
  async minimize() {}
  async unminimize() {}
  async show() {}
  async hide() {}
  async setFocus() {}
  async close() {}

  /** 原版会把歌曲名写到任务栏；这里是网页，不劫持文档站标题 */
  async setTitle() {}

  // 「窗口材质 / 主题」这些是 Windows 原生的，网页里没有，给空实现免得调用处报错
  async setTheme() {}
  async theme() {
    return null
  }
  async setEffects() {}
  async clearEffects() {}
  async setBackgroundColor() {}
  async setShadow() {}
  async setSkipTaskbar() {}

  async onCloseRequested() {
    return Promise.resolve(() => {})
  }

  async onFocusChanged() {
    return Promise.resolve(() => {})
  }
}

export function getCurrentWindow() {
  return new Window('main')
}

export function getAllWindows() {
  return Promise.resolve([new Window('main')])
}

export async function currentMonitor() {
  return { size: { width: 1920, height: 1080 }, scaleFactor: 1 }
}
