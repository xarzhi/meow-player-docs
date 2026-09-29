// 播放器内核：文件扫描 -> 播放列表 -> Web Audio 图（10 段均衡器 -> 真 FFT 分析器 -> 输出）
//
// 这里刻意不引入任何依赖：
//   * 音频播放用 <audio> + URL.createObjectURL（本地文件不走网络）
//   * 频谱用 AnalyserNode 的 FFT（getByteFrequencyData），和 GPUI 版一样是真算出来的
//   * 10 段均衡器用 10 个 BiquadFilterNode(peaking)，频率点与 App 一致（31Hz ~ 16kHz）
//   * 标签/封面/歌词用自写的 utils/id3.js，歌词用 utils/lrc.js
//
// SSR 安全：模块顶层和 setup 里都不碰 window / Audio / AudioContext，
// 这些只在用户操作（点击、选文件）触发的函数里惰性创建。

import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useData } from 'vitepress'
import { parseLrc } from '../utils/lrc.js'
import { readTags, tagsFromFilename } from '../utils/meta.js'

// public/songs 的清单由 .vitepress/config.mts 在启动/构建时扫出来，塞进 themeConfig。
// 静态托管没有目录列表接口，前端没法自己列出一个文件夹里有什么，只能构建期生成清单。
// 走 themeConfig → 站点数据这条路，是因为 vite.define 在这个项目的 dev 下不生效。
function readThemeValue(key) {
  try {
    const value = useData().theme.value?.[key]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

// 读标签时最多取文件开头这么多字节（Range 请求）
const META_HEAD_BYTES = 4 * 1024 * 1024

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export const EQ_PRESETS = {
  默认: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  流行: [-1, 0, 2, 4, 4, 2, 0, -1, -1, -1],
  摇滚: [4, 3, 1, -1, -2, -1, 1, 3, 4, 4],
  人声: [-3, -2, -1, 1, 3, 4, 3, 1, 0, -1],
  低音: [6, 5, 4, 2, 0, -1, -2, -2, -1, 0],
  高音: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 5],
}

const AUDIO_RE = /\.(mp3|flac|wav|m4a|aac|ogg|oga|opus|wma|aif|aiff|ape)$/i
const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp)$/i
const COVER_RE = /^(cover|folder|front|album|封面|专辑)/i
const MAX_TRACKS = 300

const collator =
  typeof Intl !== 'undefined' ? new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' }) : null

function baseName(name) {
  return name.replace(/\.[^.]+$/, '')
}

function dirOf(file) {
  const rel = file.webkitRelativePath || file.name
  const i = rel.lastIndexOf('/')
  return i === -1 ? '' : rel.slice(0, i)
}

/** 把数组按并发上限跑完，单个失败不影响其它 */
async function runLimited(items, limit, fn) {
  const queue = items.slice()
  const workers = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      try {
        await fn(item)
      } catch {
        // 单个文件解析失败就跳过
      }
    }
  })
  await Promise.all(workers)
}

export function usePlayer() {
  // VitePress 的 base：dev 和 Pages 下都能把 public/songs/x 拼成正确路径
  let base = '/'
  try {
    base = useData().site.value.base || '/'
  } catch {
    // 没有 VitePress 上下文时退回根路径
  }
  // config.mts 扫出来的歌单清单
  const librarySongs = readThemeValue('songs')
  const libraryLyrics = readThemeValue('lyricFiles')

  const tracks = ref([])
  const index = ref(-1)
  const playing = ref(false)
  const time = ref(0)
  const duration = ref(0)
  const volume = ref(0.85)
  const loopMode = ref('list')
  const eqGains = ref([...EQ_PRESETS['默认']])
  const eqEnabled = ref(true)
  const scanning = ref(false)
  const notice = ref('')
  const analyser = shallowRef(null)
  const demoPlaying = ref(false)

  const current = computed(() => (index.value >= 0 ? tracks.value[index.value] || null : null))
  const lyricLines = computed(() => parseLrc(current.value?.lyrics || ''))
  // 没有时间轴的纯文本歌词（很多 FLAC 的内嵌歌词就是这种，lrc-kit 解析出 0 行）。
  // 顺带把「作词 : 林夕」这类信息行滤掉，只留歌词本体。
  const plainLyrics = computed(() => {
    if (lyricLines.value.length) return []
    const raw = current.value?.lyrics || ''
    if (!raw) return []
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^[^:：]{1,8}\s*[:：]\s*\S/.test(line))
  })
  const loopLabel = computed(() => ({ list: '顺序', one: '单曲', shuffle: '随机' })[loopMode.value] || '顺序')

  // 只有在浏览器里、且用户真的操作过之后才会有值
  let audio = null
  let ctx = null
  let inputGain = null
  let filters = []
  let analyserNode = null
  let demoNodes = []
  const urls = new Set()

  function ensureAudio() {
    if (audio) return audio
    audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volume.value
    audio.addEventListener('timeupdate', () => {
      time.value = audio.currentTime || 0
    })
    const syncDuration = () => {
      duration.value = Number.isFinite(audio.duration) ? audio.duration : 0
    }
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('durationchange', syncDuration)
    audio.addEventListener('play', () => {
      playing.value = true
    })
    audio.addEventListener('pause', () => {
      playing.value = false
    })
    audio.addEventListener('ended', () => {
      if (loopMode.value === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else if (loopMode.value === 'shuffle') {
        loadTrack(Math.floor(Math.random() * tracks.value.length), true)
      } else if (index.value < tracks.value.length - 1) {
        loadTrack(index.value + 1, true)
      } else {
        playing.value = false
      }
    })
    return audio
  }

  /** 建立 Web Audio 图：<audio> -> 增益 -> 10 段 EQ -> 分析器 -> 输出 */
  function ensureGraph() {
    if (ctx) return
    if (typeof window === 'undefined') return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    try {
      ctx = new AC()
      inputGain = ctx.createGain()
      const src = ctx.createMediaElementSource(ensureAudio())
      src.connect(inputGain)
      let node = inputGain
      filters = EQ_BANDS.map((freq) => {
        const b = ctx.createBiquadFilter()
        b.type = 'peaking'
        b.frequency.value = freq
        b.Q.value = 1.1
        b.gain.value = 0
        node.connect(b)
        node = b
        return b
      })
      analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = 2048
      analyserNode.smoothingTimeConstant = 0.8
      node.connect(analyserNode)
      analyserNode.connect(ctx.destination)
      analyser.value = analyserNode
      applyEq()
    } catch {
      // 极少数环境建不了图（比如没有 Web Audio），退化成普通 <audio> 播放
      ctx = null
    }
  }

  function applyEq() {
    if (!filters.length) return
    filters.forEach((f, i) => {
      f.gain.value = eqEnabled.value ? Number(eqGains.value[i]) || 0 : 0
    })
  }

  function setEqGains(next) {
    eqGains.value = [...next]
    applyEq()
  }

  function setEqEnabled(v) {
    eqEnabled.value = !!v
    applyEq()
  }

  async function resumeCtx() {
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // 忽略
      }
    }
  }

  function loadTrack(i, autoplay = false) {
    const n = tracks.value.length
    if (!n) return
    index.value = ((i % n) + n) % n
    const t = tracks.value[index.value]
    const a = ensureAudio()
    time.value = 0
    duration.value = 0
    try {
      a.src = t.url
    } catch {
      return
    }
    if (autoplay) play()
  }

  async function play() {
    if (!tracks.value.length) return
    ensureGraph()
    const a = ensureAudio()
    if (!a.src) loadTrack(Math.max(0, index.value), false)
    // 不 await：标签/封面是锦上添花，不能挡住出声
    ensureMeta(index.value)
    await resumeCtx()
    try {
      await a.play()
    } catch {
      // 浏览器可能因为自动播放策略拒绝，用户再点一次即可
    }
  }

  function pause() {
    if (audio) audio.pause()
  }

  function toggle() {
    if (playing.value) pause()
    else play()
  }

  function stop() {
    if (!audio) return
    audio.pause()
    try {
      audio.removeAttribute('src')
      audio.load()
    } catch {
      // 忽略
    }
    time.value = 0
    duration.value = 0
    playing.value = false
  }

  function next(autoplay = true) {
    if (!tracks.value.length) return
    if (loopMode.value === 'shuffle') {
      loadTrack(Math.floor(Math.random() * tracks.value.length), autoplay)
    } else {
      loadTrack(index.value + 1, autoplay)
    }
  }

  function prev() {
    if (!tracks.value.length) return
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    loadTrack(index.value - 1, playing.value)
  }

  function seek(seconds) {
    if (!audio || !Number.isFinite(seconds)) return
    const total = duration.value || audio.duration || 0
    if (!total) return
    audio.currentTime = Math.min(Math.max(0, seconds), total)
    time.value = audio.currentTime
  }

  function seekRatio(ratio) {
    const total = duration.value
    if (!total) return
    seek(total * Math.min(Math.max(0, ratio), 1))
  }

  function setVolume(v) {
    volume.value = Math.min(Math.max(0, Number(v) || 0), 1)
    if (audio) audio.volume = volume.value
  }

  function cycleLoop() {
    const order = ['list', 'one', 'shuffle']
    loopMode.value = order[(order.indexOf(loopMode.value) + 1) % order.length]
  }

  function clearList() {
    stop()
    for (const u of urls) URL.revokeObjectURL(u)
    urls.clear()
    tracks.value = []
    index.value = -1
  }

  /** 直接按 public/songs 的清单建库，不需要用户选文件 */
  function loadLibrary(list, lrcFiles = []) {
    stop()
    for (const u of urls) URL.revokeObjectURL(u)
    urls.clear()
    const items = Array.isArray(list) ? list : []
    // 同名 .lrc 与音频配对（大小写不敏感）
    const lrcMap = new Map()
    for (const raw of Array.isArray(lrcFiles) ? lrcFiles : []) {
      const name = typeof raw === 'string' ? raw : raw?.file || ''
      if (name) lrcMap.set(name.replace(/\.[^.]+$/, '').toLowerCase(), name)
    }
    tracks.value = items.map((raw) => {
      const fileName = typeof raw === 'string' ? raw : raw?.file || ''
      const guess = tagsFromFilename(fileName)
      return {
        file: fileName,
        size: (typeof raw === 'object' && raw?.size) || 0,
        title: guess.title,
        artist: guess.artist,
        album: '',
        lyrics: '',
        cover: '',
        lrcFile: lrcMap.get(baseName(fileName).toLowerCase()) || '',
        url: `${base}songs/${encodeURIComponent(fileName)}`,
        metaLoaded: false,
        metaLoading: false,
      }
    })
    index.value = tracks.value.length ? 0 : -1
    time.value = 0
    duration.value = 0
  }

  /** 只取文件开头一段（Range 请求），避免为了读标签把整首歌拉下来 */
  async function fetchHead(url, size) {
    const end = Math.max(0, Math.min(META_HEAD_BYTES, size || META_HEAD_BYTES) - 1)
    const res = await fetch(url, { headers: { Range: `bytes=0-${end}` } })
    if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`)
    // 服务端忽略 Range 时会回 200 + 整个文件：大文件直接放弃，别把几十上百 MB 拉下来
    if (res.status === 200 && size > META_HEAD_BYTES) {
      try {
        res.body?.cancel()
      } catch {
        // 忽略
      }
      throw new Error('服务端不支持 Range')
    }
    return new Uint8Array(await res.arrayBuffer())
  }

  /** 懒加载某一首的标签/封面/歌词：只在真要播它的时候才去读 */
  async function ensureMeta(i) {
    const t = tracks.value[i]
    if (!t || t.metaLoaded || t.metaLoading) return
    // 只对 songs 目录里的曲目做这件事（用户拖进来的文件在 scan 时已经读过了）
    if (!t.url.startsWith(`${base}songs/`)) return
    t.metaLoading = true
    try {
      const bytes = await fetchHead(t.url, t.size)
      const tags = await readTags(new Blob([bytes]), t.file)
      if (tags.title) t.title = tags.title
      if (tags.artist) t.artist = tags.artist
      if (tags.album) t.album = tags.album
      if (tags.coverBytes) {
        const blobUrl = URL.createObjectURL(
          new Blob([tags.coverBytes], { type: tags.coverType || 'image/jpeg' })
        )
        urls.add(blobUrl)
        if (t.cover) URL.revokeObjectURL(t.cover)
        t.cover = blobUrl
      }
      // 同名 .lrc 优先于内嵌歌词（内嵌的经常是没有时间轴的纯文本）
      if (t.lrcFile) {
        try {
          const res = await fetch(`${base}songs/${encodeURIComponent(t.lrcFile)}`)
          if (res.ok) t.lyrics = await res.text()
        } catch {
          // 取不到 .lrc 就用内嵌的
        }
      }
      if (!t.lyrics && tags.lyrics) t.lyrics = tags.lyrics
    } catch {
      // 读不到就继续用文件名兜底的标题，不重试
    } finally {
      t.metaLoading = false
      t.metaLoaded = true
    }
  }

  /** 扫描用户选中的文件夹（input[webkitdirectory] 或拖进来的文件列表） */
  async function scan(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    scanning.value = true
    notice.value = ''
    try {
      const lrcs = new Map()
      const covers = new Map()
      const audios = []
      for (const f of files) {
        const dir = dirOf(f)
        if (/\.lrc$/i.test(f.name)) {
          lrcs.set(`${dir}/${baseName(f.name)}`, f)
        } else if (IMAGE_RE.test(f.name) && COVER_RE.test(f.name)) {
          if (!covers.has(dir)) covers.set(dir, f)
        } else if (AUDIO_RE.test(f.name) || (f.type || '').startsWith('audio/')) {
          audios.push({ file: f, dir })
        }
      }

      const picked = audios.slice(0, MAX_TRACKS)
      const list = []
      await runLimited(picked, 4, async ({ file, dir }) => {
        const tags = await readTags(file, file.name)
        let lyrics = tags.lyrics || ''
        const lrcFile = lrcs.get(`${dir}/${baseName(file.name)}`)
        if (lrcFile) {
          try {
            lyrics = await lrcFile.text()
          } catch {
            // 用内嵌歌词
          }
        }
        let cover = ''
        if (tags.coverBytes) {
          const blob = new Blob([tags.coverBytes], { type: tags.coverType || 'image/jpeg' })
          cover = URL.createObjectURL(blob)
          urls.add(cover)
        } else if (covers.has(dir)) {
          cover = URL.createObjectURL(covers.get(dir))
          urls.add(cover)
        }
        const url = URL.createObjectURL(file)
        urls.add(url)
        list.push({
          title: tags.title || baseName(file.name),
          artist: tags.artist || '',
          album: tags.album || '',
          cover,
          lyrics,
          url,
        })
      })

      if (!list.length) {
        notice.value = '这个文件夹里没找到音频文件'
        return
      }

      list.sort((a, b) => (collator ? collator.compare(a.title, b.title) : a.title.localeCompare(b.title)))

      // 换列表前把旧 blob URL 释放掉（先取快照，再清空，最后释放）
      const old = Array.from(urls)
      urls.clear()
      for (const t of list) {
        urls.add(t.url)
        if (t.cover) urls.add(t.cover)
      }
      for (const u of old) URL.revokeObjectURL(u)

      tracks.value = list
      index.value = 0
      loadTrack(0, false)
      if (audios.length > MAX_TRACKS) {
        notice.value = `歌曲较多，只取了前 ${MAX_TRACKS} 首`
      }
    } finally {
      scanning.value = false
    }
  }

  /** 没有任何音频文件时也能看到频谱：合成一段扫频信号，走同一条 EQ + 分析器链 */
  async function playDemoTone() {
    ensureGraph()
    if (!ctx) return
    await resumeCtx()
    stopDemoTone()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(inputGain)
    for (let k = 0; k < 4; k++) {
      const t0 = now + k * 3.2
      osc.frequency.setValueAtTime(110, t0)
      osc.frequency.exponentialRampToValueAtTime(9000, t0 + 2.7)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.0)
    }
    osc.start(now)
    osc.stop(now + 4 * 3.2 + 0.1)
    demoNodes = [osc, gain]
    demoPlaying.value = true
    osc.onended = () => {
      demoPlaying.value = false
      demoNodes = []
    }
  }

  function stopDemoTone() {
    for (const n of demoNodes) {
      try {
        n.stop && n.stop()
        n.disconnect()
      } catch {
        // 忽略
      }
    }
    demoNodes = []
    demoPlaying.value = false
  }

  onBeforeUnmount(() => {
    stopDemoTone()
    if (audio) {
      try {
        audio.pause()
      } catch {
        // 忽略
      }
    }
    for (const u of urls) URL.revokeObjectURL(u)
    urls.clear()
    if (ctx) {
      try {
        ctx.close()
      } catch {
        // 忽略
      }
    }
  })

  return {
    // 状态
    tracks,
    librarySongs,
    index,
    current,
    playing,
    time,
    duration,
    volume,
    loopMode,
    loopLabel,
    eqGains,
    eqEnabled,
    scanning,
    notice,
    analyser,
    demoPlaying,
    lyricLines,
    plainLyrics,
    // 操作
    scan,
    play,
    pause,
    toggle,
    stop,
    next,
    prev,
    seek,
    seekRatio,
    setVolume,
    cycleLoop,
    setEqGains,
    setEqEnabled,
    clearList,
    loadTrack,
    loadLibrary,
    libraryLyrics,
    ensureMeta,
    playDemoTone,
    stopDemoTone,
  }
}
