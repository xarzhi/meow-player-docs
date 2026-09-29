// 歌词时间轴解析交给 lrc-kit：
// 它除了行时间戳，还能解析 <mm:ss.xx> 这种逐字标签（wordTimestamps），
// 以及 [ti:] / [ar:] 这些信息行 —— 这些细节没必要自己写正则。

import { Lrc, timestampToString } from 'lrc-kit'

/**
 * @param {string} raw LRC 文本
 * @returns {{time:number,text:string,words:{time:number,char:string}[]|null}[]} 按时间升序
 */
export function parseLrc(raw) {
  if (!raw || typeof raw !== 'string') return []
  try {
    const lrc = Lrc.parse(raw, { enhanced: true })
    return lrc.lyrics.map((line) => ({
      time: line.timestamp,
      text: line.content,
      // 有的 LRC 带逐字时间（<mm:ss.xx>），有的话就按真实时间填充，比整句插值准
      words:
        Array.isArray(line.wordTimestamps) && line.wordTimestamps.length
          ? line.wordTimestamps.map((w) => ({ time: w.timestamp, char: w.content }))
          : null,
    }))
  } catch {
    return []
  }
}

/** 秒 -> mm:ss */
export function formatTime(sec) {
  const n = Number(sec)
  if (!Number.isFinite(n) || n < 0) return '00:00'
  return timestampToString(n).split('.')[0]
}
