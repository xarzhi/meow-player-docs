// 替掉 @tauri-apps/plugin-dialog。
// 演示里的音乐库来自 public/songs（构建时已扫好），不需要用户在浏览器里选文件夹，
// 所以这里一律「用户取消」，让调用方的分支自己走空处理。
export async function open() {
  return null
}

export async function save() {
  return null
}

export async function message() {
  return Promise.resolve()
}

export async function ask() {
  return false
}

export async function confirm() {
  return false
}
