// 替掉 @tauri-apps/api/tray（托盘）：网页里没有托盘，全部空实现。
export class TrayIcon {
  static async new(options) {
    return new TrayIcon(options)
  }

  static async getById() {
    return null
  }

  static async removeById() {}

  constructor(options = {}) {
    this.options = options
  }

  async setIcon() {}
  async setMenu() {}
  async setTooltip() {}
  async setTitle() {}
  async setVisible() {}
  async setIconAsTemplate() {}
  async setShowMenuOnLeftClick() {}
  async close() {}
}
