// Tauri 后端的网页实现。
//
// 原版这些命令都在 Rust 里：音乐库来自 SQLite（扫盘 + lofty 读标签），
// 播放走 rodio / WASAPI。网页里改成：
//   * 音乐库 = public/songs 的清单（构建时由 config.mts 用 music-metadata 读好标签/封面/歌词）
//   * 播放   = <audio> + 浏览器解码
//   * 进度   = 每 250ms 派发一次 progress_update（单位毫秒，和 Rust 那边一致）
//
// 单位约定（照原版来的，别改）：
//   * currentSong.duration 是毫秒；progress_update 的 payload 是毫秒
//   * try_seek 的 pos 是秒（Progress.vue 里除以了 1000）
//   * set_volume 的 value 是 0~1（usePlayer 里传的是 val/100）

import { dispatch } from './api/event.js'
import { parseLrc } from '../utils/lrc.js'
import { pinyin } from 'pinyin-pro'
// 浏览器端读标签：parseBlob 吃 Blob / File / FileSystemFileHandle.getFile() 拿到的 File
import { parseBlob } from 'music-metadata'

// 和 config.mts 里扫 public/songs 的规则保持一致
const AUDIO_RE = /\.(mp3|flac|wav|m4a|aac|ogg|oga|opus|wma|aif|aiff|ape)$/i

const state = {
  songs: [],
  base: '/',
  ready: false,
}

/** 由挂载组件调用，把 config.mts 扫好的清单和 base 交进来 */
export function initBackend({ songs, base } = {}) {
  if (Array.isArray(songs)) {
    // 构建清单里的歌没有 source 字段；用户自己扫进来的（dir: / input:）要留着，别被覆盖
    const userSongs = state.songs.filter((s) => typeof s.source === 'string' && s.source)
    state.songs = userSongs.length ? [...songs, ...userSongs] : songs
  }
  if (base) state.base = base.endsWith('/') ? base : `${base}/`
  state.ready = true
  if (typeof window !== 'undefined') {
    // 方便在浏览器控制台里直接调命令自查（例如 __meowInvoke('get_album_list', {})）
    window.__meowInvoke = invoke
    // 页面加载就把上次授权过的音乐库目录捡回来：已授权就静默重扫，没授权等用户点按钮
    restoreMusicDirs().catch((err) => console.warn('[meow] 恢复音乐库目录失败', err))
  }
}

/** 相对路径 -> 可访问的 URL（等价于 Tauri 的 convertFileSrc） */
export function fileSrc(path) {
  if (!path) return ''
  const p = String(path)
  if (/^(https?:|blob:|data:)/.test(p)) return p
  return state.base + p.replace(/^\//, '')
}

// ---------------------------------------------------------------- 播放

let audio = null
let progressTimer = null
let audioCtx = null
let analyserNode = null

/**
 * 给全屏播放页的频谱用：把 <audio> 接进 Web Audio，拿一个 AnalyserNode（真 FFT）。
 * 注意必须 analyser -> destination，否则 createMediaElementSource 会把声音截走。
 */
function ensureAnalyser() {
  if (analyserNode) return analyserNode
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  const el = ensureAudio()
  try {
    audioCtx = audioCtx || new AC()
    const src = audioCtx.createMediaElementSource(el)
    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = 2048
    analyserNode.smoothingTimeConstant = 0.8
    src.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)
  } catch (err) {
    console.warn('[meow] 建音频分析图失败（频谱将不可用）', err)
    analyserNode = null
  }
  return analyserNode
}

function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'metadata'
  audio.addEventListener('ended', () => {
    // 交给 App 自己的逻辑决定下一首 / 单曲循环 / 随机
    import('../meow/hooks/usePlayer.js')
      .then((mod) => mod.default().ended())
      .catch((err) => console.error('[meow] 播完切歌失败', err))
  })
  return audio
}

function startProgressLoop() {
  if (progressTimer) return
  progressTimer = setInterval(() => {
    if (!audio || audio.paused) return
    dispatch('progress_update', Math.round(audio.currentTime * 1000))
  }, 250)
}

function findSong(path) {
  return state.songs.find((s) => s.path === path) || null
}

/**
 * 把 LRC 文本转成歌词组件要的 AMLL 结构：
 *   { startTime, endTime, words: [{ word, startTime, endTime }], translatedLyric, romanLyric }
 * （components/Lyrics/*.vue 里用的是 item.words[0].word 和 item.startTime / item.endTime）
 * 没有逐字时间轴时就按整句时长把每个字均分，做出逐字填充的效果。
 */
function toAmllLines(raw) {
  const lines = parseLrc(raw)
  if (!lines.length) return []
  return lines.map((line, i) => {
    const startTime = Math.round(line.time * 1000)
    const next = lines[i + 1]?.time
    const endTime = Math.round((next != null ? next : line.time + 4) * 1000)
    const chars = Array.from(line.text || '')
    const span = Math.max(1, endTime - startTime)
    return {
      startTime,
      endTime,
      words: chars.map((ch, idx) => ({
        word: ch,
        startTime: startTime + Math.round((span * idx) / Math.max(1, chars.length)),
        endTime: startTime + Math.round((span * (idx + 1)) / Math.max(1, chars.length)),
      })),
      translatedLyric: '',
      romanLyric: '',
      isBG: false,
      isDuet: false,
    }
  })
}

async function playMusic(path) {
  const song = findSong(path)
  const el = ensureAudio()
  el.src = fileSrc(path)
  dispatch('progress_start')
  try {
    await el.play()
  } catch (err) {
    console.warn('[meow] 浏览器拒绝了播放（需要用户先交互）', err)
  }
  startProgressLoop()
  // 原版返回歌词数组，交给 playerStore.setLyrics —— 必须是 AMLL 结构
  return toAmllLines(song?.lyrics || '')
}

// ---------------------------------------------------------------- 音乐库

function normLetter(song) {
  const letter = (song.letter || '#').toUpperCase()
  return /^[A-Z]$/.test(letter) ? letter : '#'
}

function matchSearch(song, terms) {
  if (!terms || !terms.length) return true
  const hay = `${song.title || ''} ${song.artist || ''} ${song.album || ''}`.toLowerCase()
  return terms.every((t) => hay.includes(String(t).toLowerCase()))
}

function sortSongs(list, cateKey = 'title', desc = false) {
  const key = ['title', 'artist', 'album'].includes(cateKey) ? cateKey : 'title'
  const sorted = [...list].sort((a, b) =>
    String(a[key] || '').localeCompare(String(b[key] || ''), 'zh-Hans-CN', { numeric: true })
  )
  return desc ? sorted.reverse() : sorted
}

function groupByLetter(list) {
  const map = new Map()
  for (const song of list) {
    const letter = normLetter(song)
    if (!map.has(letter)) map.set(letter, [])
    map.get(letter).push(song)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, data]) => ({ letter, label: letter, data }))
}

function getSongList(args = {}) {
  const { cateKey = 'title', desc = false, searchText = [] } = args
  const terms = (Array.isArray(searchText) ? searchText : [searchText]).filter(Boolean)
  const filtered = state.songs.filter((s) => matchSearch(s, terms))
  const sorted = sortSongs(filtered, cateKey, desc)
  return { groups: groupByLetter(sorted), total: sorted.length, list: sorted }
}

/** 拼音首字母（专辑 / 艺术家分组要用，和歌曲列表保持一致） */
function firstLetter(text) {
  try {
    const arr = pinyin(String(text || ''), { pattern: 'first', toneType: 'none', type: 'array' })
    const ch = String(arr?.[0]?.[0] || '#').toUpperCase()
    return /^[A-Z]$/.test(ch) ? ch : '#'
  } catch {
    return '#'
  }
}

function getAlbums() {
  const map = new Map()
  for (const song of state.songs) {
    const name = song.album || '未知专辑'
    if (!map.has(name)) {
      map.set(name, {
        id: name,
        name,
        // 列表页卡片用的是 item.album（跳详情时 query 也传这个）
        album: name,
        artist: song.artist || '',
        cover: song.cover || '',
        coverUrl: song.coverUrl || '',
        song_count: 0,
        letter: firstLetter(name),
      })
    }
    map.get(name).song_count += 1
  }
  return [...map.values()]
}

function getArtists() {
  const map = new Map()
  for (const song of state.songs) {
    const name = song.artist || '未知艺术家'
    if (!map.has(name)) {
      map.set(name, {
        id: name,
        name,
        // 列表页卡片用的是 item.artist
        artist: name,
        album: '',
        cover: song.cover || '',
        coverUrl: song.coverUrl || '',
        song_count: 0,
        letter: firstLetter(name),
      })
    }
    map.get(name).song_count += 1
  }
  return [...map.values()]
}

function byName(list, key, searchVal = '', order = 'asc') {
  const kw = String(searchVal || '').toLowerCase()
  const filtered = kw ? list.filter((item) => String(item.name || '').toLowerCase().includes(kw)) : list
  const sorted = [...filtered].sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'))
  if (order === 'desc') sorted.reverse()
  return sorted
}

/** 专辑 / 艺术家详情：Album.vue / Artist.vue 是直接 `list.value = res`，所以必须返回数组 */
function songsOf(predicate) {
  return sortSongs(state.songs.filter(predicate), 'title', false)
}

// ---- 歌单 ------------------------------------------------------------------
// 原版歌单存在 SQLite（Rust 侧）。网页里没有数据库，用 localStorage 存，
// 结构：[{ id, name, songIds: [] }]
const PLAYLIST_KEY = 'meow-playlists'

function readPlaylists() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function writePlaylists(list) {
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式下写不了就算了
  }
}

function nextPlaylistId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function playlistSongs(ids) {
  const wanted = new Set(ids || [])
  return sortSongs(state.songs.filter((s) => wanted.has(s.id)), 'title', false)
}

// ------------------------------------------- 音乐库目录（句柄持久化）
//
// 浏览器不给真实路径，但 FileSystemDirectoryHandle 是可结构化克隆的，能塞进 IndexedDB：
//   * 页面加载 -> 取回句柄 -> queryPermission({mode:'read'})：已授权直接静默重扫；
//     是 prompt/denied 就先不动（requestPermission 必须由用户手势触发），
//     在设置页显示「重新授权并扫描」按钮等用户点。
//   * 不支持 showDirectoryPicker 的浏览器（Firefox / Safari）退回到 <input webkitdirectory>，
//     那条路只有本次会话有效，界面上会提示「刷新后需要重新选择文件夹」。
const DIR_DB = 'meow-music-lib'
const DIR_STORE = 'dirHandles'

const dirState = {
  supported: false,
  restored: false, // 是否已经尝试过恢复
  // [{ id, name, permission: 'granted' | 'prompt' | 'denied' | 'error', songCount, error }]
  dirs: [],
}

/** 支持情况：既要 File System Access API，也要能存句柄的 IndexedDB */
function supportsDirPicker() {
  return (
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function' &&
    typeof indexedDB !== 'undefined' &&
    (typeof window.isSecureContext === 'undefined' || window.isSecureContext)
  )
}

function dirDbOpen() {
  return new Promise((resolve, reject) => {
    let req = null
    try {
      req = indexedDB.open(DIR_DB, 1)
    } catch (err) {
      reject(err)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DIR_STORE)) db.createObjectStore(DIR_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 一次事务：run(store) 返回 IDBRequest，事务完成时用 request.result 兑现 */
async function dirDbRun(mode, run) {
  const db = await dirDbOpen()
  return new Promise((resolve, reject) => {
    let req = null
    let tx = null
    try {
      tx = db.transaction(DIR_STORE, mode)
      req = run(tx.objectStore(DIR_STORE))
    } catch (err) {
      db.close()
      reject(err)
      return
    }
    tx.oncomplete = () => {
      const result = req ? req.result : undefined
      db.close()
      resolve(result)
    }
    tx.onerror = () => {
      const err = tx.error || req?.error
      db.close()
      reject(err)
    }
    tx.onabort = () => {
      const err = tx.error || req?.error
      db.close()
      reject(err)
    }
  })
}

/** IndexedDB 里存的是 { id, name, handle, addedAt }，handle 靠结构化克隆落盘 */
const dirDbAll = () => dirDbRun('readonly', (store) => store.getAll())
const dirDbPut = (record) => dirDbRun('readwrite', (store) => store.put(record))
const dirDbDelete = (id) => dirDbRun('readwrite', (store) => store.delete(id))

async function queryDirPermission(handle) {
  try {
    if (typeof handle?.queryPermission !== 'function') return 'prompt'
    return (await handle.queryPermission({ mode: 'read' })) || 'prompt'
  } catch {
    return 'prompt'
  }
}

async function requestDirPermission(handle) {
  try {
    if (typeof handle?.requestPermission !== 'function') return 'prompt'
    return (await handle.requestPermission({ mode: 'read' })) || 'prompt'
  } catch (err) {
    console.warn('[meow] 请求目录授权失败', err)
    return 'denied'
  }
}

function dirStatus() {
  return {
    supported: supportsDirPicker(),
    restored: dirState.restored,
    dirs: dirState.dirs.map((d) => ({ ...d })),
  }
}

/** 状态变了就通知设置页（Common.vue 监听 meow:music-dir-updated） */
function notifyDirs() {
  dirState.supported = supportsDirPicker()
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('meow:music-dir-updated', { detail: dirStatus() }))
  } catch {
    // 老浏览器没有 CustomEvent 就算了，界面靠 get_music_dir_status 兜底
  }
}

async function updateDirEntry(id, patch) {
  const entry = dirState.dirs.find((d) => d.id === id)
  if (entry) Object.assign(entry, patch)
  notifyDirs()
}

/** 只在「自己扫进来的」歌上打 source；构建时 public/songs 那批没有这个字段，永远删不到 */
function releaseSongUrl(song) {
  for (const key of ['path', 'url', 'cover', 'coverUrl']) {
    const value = song?.[key]
    if (typeof value === 'string' && value.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(value)
      } catch {
        // 忽略
      }
    }
  }
}

function removeSongsBySource(source) {
  if (!source) return 0
  const keep = []
  let removed = 0
  for (const song of state.songs) {
    if (song.source === source) {
      releaseSongUrl(song)
      removed += 1
    } else {
      keep.push(song)
    }
  }
  state.songs = keep
  return removed
}

/** 清掉所有用户扫进来的歌（有 source 的），构建清单那批留着 */
function removeUserSongs() {
  const keep = []
  let removed = 0
  for (const song of state.songs) {
    if (typeof song.source === 'string' && song.source) {
      releaseSongUrl(song)
      removed += 1
    } else {
      keep.push(song)
    }
  }
  state.songs = keep
  return removed
}

function songsOfSource(source) {
  return state.songs.filter((s) => s.source === source).length
}

/** 递归收集目录里的音频文件：目录往下走，只认音频扩展名（和 config.mts 一致） */
async function collectAudioFiles(dirHandle, prefix = '') {
  const out = []
  for await (const entry of dirHandle.values()) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      out.push(...(await collectAudioFiles(entry, relPath)))
    } else if (entry.kind === 'file' && AUDIO_RE.test(entry.name)) {
      out.push({ handle: entry, name: entry.name, relPath })
    }
  }
  return out
}

/** 扫一个持久化目录：先按 source 清掉上次的同目录歌曲，所以重扫不会重复 */
async function scanDirRecord(record) {
  const items = await collectAudioFiles(record.handle)
  return await scanEntries(items, `dir:${record.id}`)
}

/** 页面加载时调用：把上次授权过的目录捡回来 */
async function restoreMusicDirs() {
  dirState.supported = supportsDirPicker()
  if (!dirState.supported) {
    dirState.restored = true
    notifyDirs()
    return dirStatus()
  }
  let records = []
  try {
    records = (await dirDbAll()) || []
  } catch (err) {
    console.warn('[meow] 读 IndexedDB 里的目录句柄失败', err)
  }
  dirState.dirs = records.map((r) => ({ id: r.id, name: r.name, permission: 'prompt', songCount: 0 }))
  notifyDirs()

  for (const record of records) {
    try {
      const permission = await queryDirPermission(record.handle)
      if (permission !== 'granted') {
        // 不弹窗、不自动 request（浏览器要求用户手势），交给设置页的按钮
        await updateDirEntry(record.id, { permission })
        continue
      }
      await scanDirRecord(record)
      await updateDirEntry(record.id, {
        permission: 'granted',
        songCount: songsOfSource(`dir:${record.id}`),
        error: '',
      })
    } catch (err) {
      console.warn(`[meow] 恢复目录失败：${record.name}`, err)
      await updateDirEntry(record.id, { permission: 'error', error: '目录不可用（可能被移动或删除）' })
    }
  }
  dirState.restored = true
  notifyDirs()
  return dirStatus()
}

/** 设置页「选择文件夹」：拿目录句柄 -> 存 IndexedDB -> 扫描 */
async function pickMusicDir() {
  if (!supportsDirPicker()) return { ok: false, reason: 'unsupported' }
  dirState.supported = true
  let handle = null
  try {
    // 必须在用户手势里调用（设置页的按钮点击）
    handle = await window.showDirectoryPicker({ mode: 'read' })
  } catch (err) {
    return {
      ok: false,
      reason: err?.name === 'AbortError' ? 'canceled' : 'error',
      message: String(err?.message || err),
    }
  }
  if (!handle) return { ok: false, reason: 'canceled' }

  let records = []
  try {
    records = (await dirDbAll()) || []
  } catch {
    records = []
  }
  // 同一个目录之前选过就复用旧记录（句柄之间只有 isSameEntry 靠得住）
  let record = null
  for (const r of records) {
    try {
      if (await r.handle.isSameEntry(handle)) {
        record = r
        break
      }
    } catch {
      // 句柄失效，忽略
    }
  }
  if (!record) {
    record = {
      id: `dir-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: Date.now(),
    }
  }
  record.handle = handle
  record.name = handle.name || record.name || '音乐库目录'
  try {
    await dirDbPut(record)
  } catch (err) {
    console.warn('[meow] 目录句柄存 IndexedDB 失败（本次会话内仍可用）', err)
  }
  if (!dirState.dirs.some((d) => d.id === record.id)) {
    dirState.dirs.push({ id: record.id, name: record.name, permission: 'granted', songCount: 0 })
  }

  try {
    const added = await scanDirRecord(record)
    await updateDirEntry(record.id, {
      permission: 'granted',
      songCount: songsOfSource(`dir:${record.id}`),
      error: '',
    })
    return { ok: true, id: record.id, name: record.name, added }
  } catch (err) {
    await updateDirEntry(record.id, { permission: 'error', error: '读取目录失败' })
    return { ok: false, reason: 'error', message: String(err?.message || err) }
  }
}

/** 「重新授权并扫描」：先 requestPermission（用户点出来的手势），再重扫 */
async function rescanMusicDir({ id } = {}) {
  let records = []
  try {
    records = (await dirDbAll()) || []
  } catch {
    records = []
  }
  const record = records.find((r) => r.id === id)
  if (!record) return { ok: false, reason: 'missing' }

  let permission = await queryDirPermission(record.handle)
  if (permission !== 'granted') permission = await requestDirPermission(record.handle)
  await updateDirEntry(record.id, { permission })
  if (permission !== 'granted') return { ok: false, reason: 'denied', permission }

  try {
    const added = await scanDirRecord(record)
    await updateDirEntry(record.id, {
      songCount: songsOfSource(`dir:${record.id}`),
      error: '',
    })
    return { ok: true, id: record.id, name: record.name, added }
  } catch (err) {
    await updateDirEntry(record.id, { permission: 'error', error: '读取目录失败' })
    return { ok: false, reason: 'error', message: String(err?.message || err) }
  }
}

/** 移除目录：清 IndexedDB 里的句柄 + 删掉这个目录扫出来的歌（构建清单不受影响） */
async function removeMusicDir({ id } = {}) {
  if (!id) return 0
  try {
    await dirDbDelete(id)
  } catch (err) {
    console.warn('[meow] 删 IndexedDB 里的目录句柄失败', err)
  }
  const removed = removeSongsBySource(`dir:${id}`)
  dirState.dirs = dirState.dirs.filter((d) => d.id !== id)
  notifyDirs()
  return removed
}

/** <input webkitdirectory> 的首层目录名，用来当 input: 系列的来源标记 */
function rootDirName(files) {
  const first = Array.from(files || [])[0]
  const rel = String(first?.webkitRelativePath || '')
  return rel.split('/')[0] || ''
}

// ---------------------------------------------------------------- 命令表

const commands = {
  // --- 播放
  play_music: ({ path }) => playMusic(path),
  // 全屏播放页的频谱用这个（返回 AnalyserNode 本体，不走序列化）
  get_analyser: () => ensureAnalyser(),
  is_paused: () => (audio ? audio.paused : true),
  start: async () => {
    const el = ensureAudio()
    startProgressLoop()
    await el.play().catch(() => {})
  },
  pause: () => {
    audio?.pause()
  },
  set_volume: ({ value }) => {
    const el = ensureAudio()
    // 原版传 0~1；保险起见大于 1 的当百分比处理
    el.volume = Math.min(1, Math.max(0, Number(value) > 1 ? Number(value) / 100 : Number(value) || 0))
  },
  try_seek: ({ pos }) => {
    if (!audio) return
    const seconds = Math.max(0, Number(pos) || 0)
    if (Number.isFinite(seconds)) audio.currentTime = seconds
  },
  get_random: ({ min = 0, max = 0 }) => {
    const lo = Math.ceil(min)
    const hi = Math.floor(max)
    return lo + Math.floor(Math.random() * Math.max(1, hi - lo + 1))
  },

  // --- 音乐库
  get_song_list: getSongList,
  get_album_list: ({ searchVal = '', order = 'asc' } = {}) => {
    const albums = byName(getAlbums(), 'name', searchVal, order)
    // 列表页是 v-for="item in list" 里再 v-for="item.data"，所以要分组数组
    return { albums: groupByLetter(albums), total: albums.length }
  },
  get_artist_list: ({ searchVal = '', order = 'asc' } = {}) => {
    const artists = byName(getArtists(), 'name', searchVal, order)
    return { artists: groupByLetter(artists), total: artists.length }
  },
  get_album_by_album_name: (args = {}) => {
    const name = args.albumName ?? args.album ?? args.name ?? ''
    return songsOf((s) => (s.album || '未知专辑') === name)
  },
  get_artist_by_artist_name: (args = {}) => {
    const name = args.artistName ?? args.artist ?? args.name ?? ''
    return songsOf((s) => (s.artist || '未知艺术家') === name)
  },
  is_empty: () => state.songs.length === 0,
  // 演示的音乐库是固定的，扫盘相关一律按「已有 N 首」返回，让 UI 不报错
  scan_dir: async (args = {}) => {
    // 用户在设置里选了文件夹：浏览器给的是 File 列表，交给 scanFiles 读标签 + 封面
    if (args.files && args.files.length) {
      const root = rootDirName(args.files) || args.musicLibPath || '本地文件夹'
      return await scanFiles(args.files, `input:${root}`)
    }
    return state.songs.length
  },
  // 清空：只清用户自己选的目录（句柄 + 扫出来的歌），构建时 public/songs 那批留着
  clear_music_lib: async () => {
    try {
      for (const record of (await dirDbAll()) || []) await dirDbDelete(record.id)
    } catch (err) {
      console.warn('[meow] 清 IndexedDB 里的目录句柄失败', err)
    }
    const removed = removeUserSongs()
    dirState.dirs = []
    notifyDirs()
    return removed
  },
  delete_by_music_lib_path: async ({ path, id } = {}) => {
    // 持久化目录优先按 id 删（同名目录也不怕认错）；退化的 input 方案按来源名删本次会话的歌
    let records = []
    try {
      records = (await dirDbAll()) || []
    } catch {
      records = []
    }
    const record = records.find((r) => r.id === id) || records.find((r) => r.name === path)
    if (record) {
      await removeMusicDir({ id: record.id })
      return true
    }
    removeSongsBySource(`input:${path}`)
    return true
  },

  // --- 音乐库目录（File System Access API + IndexedDB 持久化句柄）
  get_music_dir_status: () => dirStatus(),
  pick_music_dir: () => pickMusicDir(),
  rescan_music_dir: (args = {}) => rescanMusicDir(args),
  remove_music_dir: (args = {}) => removeMusicDir(args),

  // --- 歌单（网页端存 localStorage）
  get_playlist_list: () =>
    readPlaylists().map((pl) => ({
      ...pl,
      song_count: (pl.songIds || []).length,
      coverUrl: playlistSongs(pl.songIds)[0]?.coverUrl || '',
    })),
  get_playlist_songs: ({ id } = {}) => {
    const pl = readPlaylists().find((p) => p.id === id)
    return pl ? playlistSongs(pl.songIds) : []
  },
  create_playlist: ({ name } = {}) => {
    const list = readPlaylists()
    const pl = { id: nextPlaylistId(), name: String(name || '新建歌单'), songIds: [] }
    list.push(pl)
    writePlaylists(list)
    return pl
  },
  rename_playlist: ({ id, name } = {}) => {
    const list = readPlaylists()
    const pl = list.find((p) => p.id === id)
    if (pl && name) {
      pl.name = String(name)
      writePlaylists(list)
    }
    return true
  },
  delete_playlist: ({ id } = {}) => {
    writePlaylists(readPlaylists().filter((p) => p.id !== id))
    return true
  },
  add_to_playlist: ({ id, songIds } = {}) => {
    const list = readPlaylists()
    const pl = list.find((p) => p.id === id)
    if (!pl) return false
    const ids = Array.isArray(pl.songIds) ? pl.songIds : []
    for (const sid of Array.isArray(songIds) ? songIds : [songIds]) {
      if (sid != null && !ids.includes(sid)) ids.push(sid)
    }
    pl.songIds = ids
    writePlaylists(list)
    return true
  },
  remove_from_playlist: ({ id, songId } = {}) => {
    const list = readPlaylists()
    const pl = list.find((p) => p.id === id)
    if (pl) {
      pl.songIds = (pl.songIds || []).filter((s) => s !== songId)
      writePlaylists(list)
    }
    return true
  },

  // --- 云听 / 壁纸 / 窗口：这些依赖原生能力，一律空实现
  get_cloud_list: () => [],
  scan_cloud_list: () => [],
  clear_cloud_songs: () => true,
  get_backgrounds: () => [],
  add_backgrounds: () => [],
  delete_bg_by_id: () => true,
  get_next_background: () => null,
  show_window: () => true,
  start_listen: () => true,
  get_taskbar_height: () => 0,
}

/**
 * 扫一批音频文件并追加进音乐库（File 和 FileSystemFileHandle 共用这一份逻辑）：
 * 用 music-metadata 读标签/时长/内嵌歌词/封面，封面转 blob URL。
 *
 * items 里每项：{ file } 或者 { handle, name, relPath }
 * source 标记这批歌的来源（'dir:<handleId>' / 'input:<目录名>'），移除目录时按它删；
 * 同一个来源重扫会先清掉旧歌，不会重复。
 *
 * 注意浏览器的限制：拿不到「真实路径」，所以播放走 blob URL。
 */
async function scanEntries(items, source) {
  if (source) removeSongsBySource(source)
  let added = 0
  for (const item of items || []) {
    try {
      const file = item?.file || (item?.handle?.getFile ? await item.handle.getFile() : null)
      if (!file) continue
      const name = String(item.name || file.name || '')
      const meta = await parseBlob(file, { duration: true, skipPostHeaders: true })
      const common = meta?.common || {}
      const stem = name.replace(/\.[^.]+$/, '')
      const title = String(common.title || stem).trim()
      const artist = String(common.artist || '').trim()
      const ms = Math.round((meta?.format?.duration || 0) * 1000)
      const total = Math.round(ms / 1000)
      const blobUrl = URL.createObjectURL(file)
      let cover = ''
      const pic = Array.isArray(common.picture) ? common.picture[0] : null
      if (pic?.data) {
        cover = URL.createObjectURL(new Blob([pic.data], { type: pic.format || 'image/jpeg' }))
      }
      state.songs.push({
        id: `user-${Date.now().toString(36)}-${added}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        artist,
        artists: artist,
        album: String(common.album || '').trim(),
        path: blobUrl,
        url: blobUrl,
        filename: name,
        relPath: item.relPath || file.webkitRelativePath || name,
        source: source || '',
        duration: ms,
        durationStr: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
        cover,
        coverUrl: cover,
        letter: firstLetter(title),
        lyrics: (Array.isArray(common.lyrics) && common.lyrics[0]?.text) || '',
        size: file.size,
      })
      added += 1
    } catch (err) {
      console.warn('[meow] 扫描失败：' + (item?.name || item?.file?.name || ''), err)
    }
  }
  state.songs.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN', { numeric: true }))
  return added
}

/**
 * <input webkitdirectory> 那条路：把 File 列表包成 scanEntries 要的形状再交给它。
 * （不支持 showDirectoryPicker 的浏览器走这里，只有本次会话有效。）
 */
async function scanFiles(files, source) {
  const items = []
  for (const file of Array.from(files || [])) {
    const name = String(file?.name || '')
    if (!AUDIO_RE.test(name) && !(file?.type || '').startsWith('audio/')) continue
    items.push({ file, name, relPath: file.webkitRelativePath || name })
  }
  return await scanEntries(items, source)
}

export async function invoke(cmd, args = {}) {
  const handler = commands[cmd]
  if (!handler) {
    console.warn(`[meow] 未实现的命令：${cmd}`)
    return null
  }
  return handler(args ?? {})
}
