// 替掉 @tauri-apps/api/dpi（MiniPlayer 用它算窗口位置）
export class PhysicalPosition {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  static fromLogical() {
    return new PhysicalPosition(0, 0)
  }
}

export class LogicalPosition {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

export class PhysicalSize {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
}

export class LogicalSize {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
}
