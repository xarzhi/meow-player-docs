// 极简 ID3v2 读取器：只为了取出 标题 / 艺术家 / 专辑 / 内嵌封面(APIC) / 内嵌歌词(USLT)。
// 不引入任何依赖；只读文件头部若干 MB，遇到不认识的结构就停下并返回已经拿到的部分。
// 只处理 ID3v2.3 / v2.4（v2.2 太老，直接放弃）。
//
// parseId3Bytes 是纯字节函数，既能在浏览器里用，也能在 Node 里直接跑测试；
// readTags 是给「本地 File 对象」用的便捷包装。

const TEXT_FRAMES = { TIT2: 'title', TPE1: 'artist', TALB: 'album' }

function syncSafe(b, o) {
  return ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f)
}

function uint32(b, o) {
  return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]
}

function decode(bytes, enc) {
  try {
    if (enc === 0) return new TextDecoder('iso-8859-1').decode(bytes)
    // 带 BOM 时 TextDecoder('utf-16') 会自动判断大小端
    if (enc === 1) return new TextDecoder('utf-16').decode(bytes)
    if (enc === 2) return new TextDecoder('utf-16be').decode(bytes)
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

// 读一个 0x00 结尾的字符串（utf-16 是双字节结尾），返回 [字符串, 下一个下标]
function readCString(b, start, end, enc) {
  if (enc === 1 || enc === 2) {
    let i = start
    while (i + 1 < end && !(b[i] === 0 && b[i + 1] === 0)) i += 2
    return [decode(b.subarray(start, i), enc), Math.min(i + 2, end)]
  }
  let i = start
  while (i < end && b[i] !== 0) i++
  return [decode(b.subarray(start, i), enc), Math.min(i + 1, end)]
}

/**
 * 解析一段以 ID3v2 头开头的字节。
 * @param {Uint8Array} buf
 */
export function parseId3Bytes(buf) {
  const out = {
    title: '',
    artist: '',
    album: '',
    coverBytes: null,
    coverType: '',
    lyrics: '',
    ok: false,
  }
  // 'ID3'
  if (!buf || buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return out
  const major = buf[3]
  if (major < 3) return out
  const flags = buf[5]
  const tagEnd = Math.min(10 + syncSafe(buf, 6), buf.length)
  let p = 10
  if (flags & 0x40) {
    // 扩展头
    p += major === 4 ? syncSafe(buf, p) : uint32(buf, p) + 4
  }
  out.ok = true

  while (p + 10 <= tagEnd) {
    const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3])
    if (!/^[A-Z0-9]{4}$/.test(id)) break
    const size = major === 4 ? syncSafe(buf, p + 4) : uint32(buf, p + 4)
    const frameFlags = (buf[p + 8] << 8) | buf[p + 9]
    const start = p + 10
    const end = Math.min(start + size, tagEnd)
    if (size <= 0 || start >= end) break

    const gzip = major === 4 ? frameFlags & 0x0008 : frameFlags & 0x0080
    const crypt = major === 4 ? frameFlags & 0x0004 : frameFlags & 0x0040
    if (!gzip && !crypt) {
      try {
        if (TEXT_FRAMES[id]) {
          const enc = buf[start]
          out[TEXT_FRAMES[id]] = decode(buf.subarray(start + 1, end), enc).replace(/\0+$/, '').trim()
        } else if (id === 'APIC' && !out.coverBytes) {
          const enc = buf[start]
          let i = start + 1
          let j = i
          while (j < end && buf[j] !== 0) j++
          const mime = decode(buf.subarray(i, j), 0) || 'image/jpeg'
          i = j + 1
          i += 1 // 图片类型字节
          const [, afterDesc] = readCString(buf, i, end, enc)
          if (afterDesc < end) {
            out.coverType = mime
            out.coverBytes = buf.subarray(afterDesc, end)
          }
        } else if (id === 'USLT' && !out.lyrics) {
          const enc = buf[start]
          const afterLang = start + 1 + 3 // 编码字节 + 3 字节语言
          const [, afterDesc] = readCString(buf, afterLang, end, enc)
          out.lyrics = decode(buf.subarray(afterDesc, end), enc).trim()
        }
      } catch {
        // 单个帧坏掉不影响其它帧
      }
    }
    p = start + size
  }
  return out
}

/**
 * 给本地 File / Blob 用：读开头若干字节再解析。
 * @param {Blob} file
 * @param {number} maxBytes
 */
export async function readTags(file, maxBytes = 3 * 1024 * 1024) {
  try {
    const buf = new Uint8Array(await file.slice(0, maxBytes).arrayBuffer())
    return parseId3Bytes(buf)
  } catch {
    return parseId3Bytes(null)
  }
}
