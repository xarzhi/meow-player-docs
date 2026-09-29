// 替掉 @tauri-apps/plugin-opener（「在资源管理器中打开」在网页里做不到）
export async function revealItemInDir() {
  return Promise.resolve()
}

export async function openPath() {
  return Promise.resolve()
}

export async function openUrl(url) {
  if (typeof window !== 'undefined' && url) window.open(url, '_blank', 'noopener')
  return Promise.resolve()
}
