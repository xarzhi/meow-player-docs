import { defineConfig } from 'vitepress'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFile } from 'music-metadata'
import { pinyin } from 'pinyin-pro'
import wasm from 'vite-plugin-wasm'

// Meow Player 的文档站。跑起来：`pnpm dev`

// GitHub Pages 项目站点的地址是 https://<user>.github.io/<repo>/，
// 所以 base 必须写成仓库名。仓库改名或换自定义域名时只改这一行。
const base = '/meow-player-docs/'

const AUDIO_RE = /\.(mp3|flac|wav|m4a|aac|ogg|oga|opus|wma|aif|aiff|ape)$/i

/** 统一的路径（正斜杠，Vite 用） */
const p = (...parts) => resolve(...parts).split('\\').join('/')

const rootDir = process.cwd()
const themeDir = p(rootDir, '.vitepress/theme')
const meowDir = p(themeDir, 'meow')
const shimDir = p(themeDir, 'meow-shim')
const coversDir = p(rootDir, 'public/covers')

// ---- public/songs 音乐库 ----------------------------------------------------
// 静态托管没有目录列表接口，前端没法自己「扫」出一个文件夹里有啥，所以：
//   1. 启动/构建时用 music-metadata（Node 侧）读出标签、时长、内嵌歌词和封面
//   2. 封面写成 public/covers/*.jpg 当静态资源（省得浏览器为了看图下整首歌）
//   3. 整个清单塞进 themeConfig -> 站点数据，前端直接读
// 新增歌曲后重启 dev（或重新 build）即可收录。

function resolveSongsDir() {
  const candidates = []
  try {
    candidates.push(fileURLToPath(new URL('../public/songs', import.meta.url)))
  } catch {
    // 配置被打包时 import.meta.url 可能不可用，忽略
  }
  candidates.push(p(rootDir, 'public/songs'))
  for (const dir of candidates) {
    try {
      if (statSync(dir).isDirectory()) return dir
    } catch {
      // 试下一个
    }
  }
  return candidates[candidates.length - 1]
}

function readLyricFiles() {
  try {
    return readdirSync(resolveSongsDir()).filter((f) => /\.lrc$/i.test(f))
  } catch {
    return []
  }
}

function safeName(text) {
  return String(text || 'cover')
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .slice(0, 40)
}

function mmss(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

async function buildLibrary() {
  const dir = resolveSongsDir()
  let files = []
  try {
    files = readdirSync(dir).filter((f) => AUDIO_RE.test(f))
  } catch {
    return []
  }
  try {
    mkdirSync(coversDir, { recursive: true })
  } catch {
    // 建不了目录就只是没有封面
  }

  const songs = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const full = resolve(dir, file)
    let meta = null
    try {
      meta = await parseFile(full, { duration: true, skipPostHeaders: true })
    } catch (err) {
      console.warn(`[meow] 读标签失败：${file} —— ${err?.message || err}`)
    }
    const common = meta?.common || {}
    const stem = file.replace(/\.[^.]+$/, '')
    const title = String(common.title || stem).trim()
    const artist = String(common.artist || '').trim()
    const album = String(common.album || '').trim()
    const duration = Math.round((meta?.format?.duration || 0) * 1000)

    // 封面：直接写成静态文件（同名已存在就复用，不重复写）
    let coverUrl = ''
    const pic = Array.isArray(common.picture) ? common.picture[0] : null
    if (pic?.data) {
      const ext = String(pic.format || '').includes('png') ? 'png' : 'jpg'
      const name = `${i + 1}-${safeName(title)}.${ext}`
      const out = resolve(coversDir, name)
      try {
        if (!existsSync(out)) writeFileSync(out, Buffer.from(pic.data))
        coverUrl = `covers/${name}`
      } catch (err) {
        console.warn(`[meow] 写封面失败：${name} —— ${err?.message || err}`)
      }
    }

    const lyrics = (Array.isArray(common.lyrics) && common.lyrics[0]?.text) || ''

    // 首字母分组（拼音），和 App 的「按拼音首字母分组」对齐
    let letter = '#'
    try {
      const py = pinyin(title, { pattern: 'first', toneType: 'none', type: 'array' })
      letter = String(py?.[0]?.[0] || '#').toUpperCase()
    } catch {
      // 用 #
    }

    let size = 0
    try {
      size = statSync(full).size
    } catch {
      // 忽略
    }

    songs.push({
      id: i + 1,
      title,
      artist,
      artists: artist,
      album,
      path: `songs/${file}`,
      filename: file,
      duration,
      durationStr: mmss(duration),
      cover: coverUrl,
      coverUrl,
      letter: /^[A-Z]$/.test(letter) ? letter : '#',
      lyrics,
      size,
    })
  }

  songs.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN', { numeric: true }))
  return songs
}

const songs = await buildLibrary()
const lyricFiles = readLyricFiles()
console.log(`[meow] 音乐库：${songs.length} 首（封面 ${songs.filter((s) => s.coverUrl).length} 个）`)

export default defineConfig({
  lang: 'zh-CN',
  title: 'Meow Player',
  description: '一个使用 Rust + GPUI 实现的本地音乐播放器',
  base,
  cleanUrls: true,
  // 浏览器标签页图标。注意：head 里的路径不会自动拼 base，必须自己加。
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}logo.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}logo.png` }],
  ],
  vite: {
    plugins: [wasm()],
    resolve: {
      alias: [
        // 把 Tauri 的 API 整体接到网页替身上，这样从 meow-player 搬过来的页面一行都不用改
        { find: /^@tauri-apps\//, replacement: `${shimDir}/` },
        // 原项目 vite.config.js 里的那套别名
        { find: /^@\//, replacement: `${meowDir}/` },
        { find: '@components', replacement: `${meowDir}/components` },
        { find: '@assets', replacement: `${meowDir}/assets` },
        { find: '@stores', replacement: `${meowDir}/stores` },
        { find: '@utils', replacement: `${meowDir}/utils` },
        { find: '@hooks', replacement: `${meowDir}/hooks` },
        { find: '@directives', replacement: `${meowDir}/directives` },
        { find: '@router', replacement: `${meowDir}/router` },
      ],
    },
    build: {
      // 原项目的 build.target 就是 esnext（AMLL 的 wasm 需要）
      target: 'esnext',
    },
  },
  themeConfig: {
    // public/songs 的清单。放在 themeConfig 里是因为它会被序列化进客户端「站点数据」，
    // dev 和 build 两条路都能拿到 —— 比 vite.define 可靠（后者在这个项目里 dev 下不生效）。
    // 用展开的方式塞进去，避免 TS 对未知字段报错。
    ...({ songs, lyricFiles } as Record<string, unknown>),
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '下载', link: 'https://gitee.com/xarzhi/meow-player/releases' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '这是什么', link: '/guide/' },
          { text: '安装与上手', link: '/guide/install' },
          { text: '功能一览', link: '/guide/features' },
          { text: '性能与资源占用', link: '/guide/performance' },
          { text: '为什么做它', link: '/guide/why' },
          { text: '快捷键', link: '/guide/shortcuts' },
          { text: '常见问题', link: '/guide/faq' },
        ],
      },
    ],
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '主题',
    returnToTopLabel: '回到顶部',
    search: { provider: 'local' },
    footer: {
      message: '基于 Rust + GPUI，仅供学习交流',
      copyright: 'Meow Player',
    },
  },
})
