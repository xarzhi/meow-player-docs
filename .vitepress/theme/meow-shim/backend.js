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

const state = {
  songs: [],
  base: '/',
  ready: false,
}

/** 由挂载组件调用，把 config.mts 扫好的清单和 base 交进来 */
export function initBackend({ songs, base } = {}) {
  if (Array.isArray(songs)) state.songs = songs
  if (base) state.base = base.endsWith('/') ? base : `${base}/`
  state.ready = true
  // 方便在浏览器控制台里直接调命令自查（例如 __meowInvoke('get_album_list', {})）
  if (typeof window !== 'undefined') window.__meowInvoke = invoke
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

// ---------------------------------------------------------------- 命令表

const commands = {
  // --- 播放
  play_music: ({ path }) => playMusic(path),
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
  scan_dir: () => state.songs.length,
  clear_music_lib: () => true,
  delete_by_music_lib_path: () => true,

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

export async function invoke(cmd, args = {}) {
  const handler = commands[cmd]
  if (!handler) {
    console.warn(`[meow] 未实现的命令：${cmd}`)
    return null
  }
  return handler(args ?? {})
}
