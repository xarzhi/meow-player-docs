// 替掉 @tauri-apps/plugin-fs（演示里没有真实文件系统）
export async function lstat() {
  return { isDirectory: false, isFile: true, isSymlink: false, size: 0 }
}

export async function stat() {
  return { isDirectory: false, isFile: true, isSymlink: false, size: 0 }
}

export async function exists() {
  return true
}

export async function readDir() {
  return []
}

export async function readTextFile() {
  return ''
}

export async function readFile() {
  return new Uint8Array()
}
