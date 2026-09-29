// 替掉 @tauri-apps/plugin-store：同样的 API，落到 localStorage。
// useStorage.js 只用到 Store.load(name) / entries() / get / set / delete / clear。
const cache = new Map()

class StoreHandle {
  constructor(name) {
    this.name = name
    this.key = `meow-store:${name}`
  }

  read() {
    if (cache.has(this.key)) return cache.get(this.key)
    let data = {}
    try {
      data = JSON.parse(localStorage.getItem(this.key) || '{}') || {}
    } catch {
      data = {}
    }
    cache.set(this.key, data)
    return data
  }

  write() {
    const data = this.read()
    try {
      localStorage.setItem(this.key, JSON.stringify(data))
    } catch {
      // 隐私模式下写不了就算了
    }
    return data
  }

  async get(key) {
    return this.read()[key]
  }

  async set(key, value) {
    this.read()[key] = value
    this.write()
  }

  async delete(key) {
    delete this.read()[key]
    this.write()
  }

  async clear() {
    cache.set(this.key, {})
    this.write()
  }

  async entries() {
    return Object.entries(this.read())
  }

  async keys() {
    return Object.keys(this.read())
  }

  async values() {
    return Object.values(this.read())
  }

  async save() {
    this.write()
  }

  async reload() {
    cache.delete(this.key)
    return this.read()
  }
}

export class Store {
  static async load(name = 'store.json') {
    return new StoreHandle(name)
  }

  static async getStore(name) {
    return new StoreHandle(name)
  }
}
