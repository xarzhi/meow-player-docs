// 事件总线：替掉 Tauri 的窗口间事件。
// 原版是 Rust 往各个窗口（main / mini-player / lyrics_window）发事件，
// 网页演示里只有一个页面，所以统一在本页派发；跨窗口的目标名忽略掉。
//
// 回调收到的形状和 Tauri 一致：{ event, payload, id }（Progress.vue 用的是 e.payload）。

const listeners = new Map()

function bucket(name) {
  if (!listeners.has(name)) listeners.set(name, new Set())
  return listeners.get(name)
}

export function listen(name, cb) {
  bucket(name).add(cb)
  return Promise.resolve(() => {
    listeners.get(name)?.delete(cb)
  })
}

export function once(name, cb) {
  function handler(event) {
    listeners.get(name)?.delete(handler)
    cb(event)
  }
  bucket(name).add(handler)
  return Promise.resolve(() => listeners.get(name)?.delete(handler))
}

export function emit(name, payload) {
  dispatch(name, payload)
  return Promise.resolve()
}

/** Tauri 的「发给某个窗口」：网页里没有别的窗口，直接本页派发 */
export function emitTo(_target, name, payload) {
  dispatch(name, payload)
  return Promise.resolve()
}

/** 后端内部用：派发一个事件 */
export function dispatch(name, payload) {
  for (const cb of Array.from(listeners.get(name) || [])) {
    try {
      cb({ event: name, id: 0, payload })
    } catch (err) {
      console.error(`[meow] 事件 ${name} 的处理函数出错`, err)
    }
  }
}
