// 替掉 @tauri-apps/plugin-autostart（网页没有开机自启）
export async function isEnabled() {
  return false
}

export async function enable() {
  return Promise.resolve()
}

export async function disable() {
  return Promise.resolve()
}
