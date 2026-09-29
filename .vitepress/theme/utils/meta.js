// 标签解析：交给 music-metadata（浏览器/Node 通用，MP3 / FLAC / M4A / OGG / WAV 全支持）。
// 它负责 ID3v2、Vorbis comment、APIC、PICTURE、内嵌歌词这些容器内部的细节。
// 只有「文件名兜底」留在这里 —— 这不是解析，是几行字符串处理。

import { parseBlob } from 'music-metadata'

/**
 * 从「歌名 - 艺术家.ext」这种文件名里猜标题和艺术家。
 * 容器里读不到标签时用它兜底，列表才不会显示成一串文件名。
 * @param {string} fileName
 */
export function tagsFromFilename(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '')
  const parts = base.split(/\s+-\s+/)
  if (parts.length >= 2) {
    return { title: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() }
  }
  return { title: base.trim(), artist: '' }
}

/**
 * 读一个音频 Blob 的标签。可以是只有文件开头一段的 Blob（配合 Range 请求用）。
 * @param {Blob} blob
 * @param {string} fileName 兜底用
 * @returns {Promise<{title:string,artist:string,album:string,lyrics:string,coverBytes:Uint8Array|null,coverType:string,parsed:boolean}>}
 */
export async function readTags(blob, fileName = '') {
  const fromName = tagsFromFilename(fileName)
  const out = {
    title: fromName.title,
    artist: fromName.artist,
    album: '',
    lyrics: '',
    coverBytes: null,
    coverType: '',
    parsed: false,
  }
  try {
    // duration: false 避免为了算时长去扫整个文件（时长交给 <audio> 自己报）
    const meta = await parseBlob(blob, { duration: false, skipPostHeaders: true })
    const common = meta?.common || {}
    if (common.title) out.title = String(common.title).trim()
    if (common.artist) out.artist = String(common.artist).trim()
    if (common.album) out.album = String(common.album).trim()

    const lyric = Array.isArray(common.lyrics) ? common.lyrics[0] : null
    if (lyric?.text) out.lyrics = String(lyric.text)

    const picture = Array.isArray(common.picture) ? common.picture[0] : null
    if (picture?.data) {
      out.coverBytes = picture.data
      out.coverType = picture.format || 'image/jpeg'
    }
    out.parsed = Boolean(common.title || common.artist || picture?.data || lyric?.text)
  } catch {
    // 解析失败就用文件名兜底
  }
  return out
}
