// 替掉 @tauri-apps/api/menu
export class Menu {
  static async new(options = {}) {
    return new Menu(options)
  }

  constructor(options = {}) {
    this.options = options
  }

  async popup() {}
  async close() {}
  async setAsAppMenu() {}
}

export class MenuItem {
  static async new(options = {}) {
    return new MenuItem(options)
  }

  constructor(options = {}) {
    this.options = options
  }

  async setEnabled() {}
  async setText() {}
  async setChecked() {}
}

export class PredefinedMenuItem {
  static async new(options = {}) {
    return new PredefinedMenuItem(options)
  }

  constructor(options = {}) {
    this.options = options
  }
}

export class Submenu {
  static async new(options = {}) {
    return new Submenu(options)
  }

  constructor(options = {}) {
    this.options = options
  }
}

export class CheckMenuItem extends MenuItem {}
