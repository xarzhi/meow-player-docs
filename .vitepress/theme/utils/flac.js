// FLAC 元数据读取：Vorbis comment（标题/艺术家/专辑/歌词）+ PICTURE（内嵌封面）。
// FLAC 没有 ID3，标签是 Vorbis comment，封面是 PICTURE 元数据块。
// 纯字节解析、不依赖任何库；FLAC 的元数据块都在音频帧之前，所以只读文件开头一段就够。

const BLOCK_VORBIS_COMMENT = 4
const BLOCK_PICTURE = 6

function u32be(b, o) {
  return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]
}

function u32le(b, o) {
  return (b[o] + (b[o + 1] << 8) + (b[o + 2] << 16) + (b[o + 3] << 24)) >>> 0
}

function utf8(bytes) {
  try {
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

function parseVorbisComment(b, start, end, out) {
  let p = start
  if (p + 4 > end) return
  const vendorLen = u32le(b, p)
  p += 4 + vendorLen
  if (p + 4 > end) return
  const count = u32le(b, p)
  p += 4
  for (let i = 0; i < count && p + 4 <= end; i++) {
    const len = u32le(b, p)
    p += 4
    if (p + len > end) break
    const line = utf8(b.subarray(p, p + len))
    p += len
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).toUpperCase()
    const value = line.slice(eq + 1).trim()
    if (!value) continue
    if (key === 'TITLE' && !out.title) out.title = value
    else if (key === 'ARTIST' && !out.artist) out.artist = value
    else if (key === 'ALBUM' && !out.album) out.album = value
    else if ((key === 'LYRICS' || key === 'UNSYNCEDLYRICS') && !out.lyrics) out.lyrics = value
  }
}

function parsePicture(b, start, end, out) {
  let p = start
  if (p + 4 > end) return
  p += 4 // 图片类型（3 = 封面）
  if (p + 4 > end) return
  const mimeLen = u32be(b, p)
  p += 4
  if (p + mimeLen > end) return
  const mime = utf8(b.subarray(p, p + mimeLen)) || 'image/jpeg'
  p += mimeLen
  if (p + 4 > end) return
  const descLen = u32be(b, p)
  p += 4 + descLen
  p += 16 // width / height / depth / colors
  if (p + 4 > end) return
  const dataLen = u32be(b, p)
  p += 4
  // 图片数据没被读全就放弃这张封面（读全了才用）
  if (dataLen <= 0 || p + dataLen > end) return
  out.coverType = mime
  out.coverBytes = b.subarray(p, p + dataLen)
}

/**
 * @param {Uint8Array} buf 文件开头的一段字节
 * @returns {{title:string,artist:string,album:string,lyrics:string,coverBytes:Uint8Array|null,coverType:string,ok:boolean}}
 */
export function parseFlac(buf) {
  const out = {
    title: '',
    artist: '',
    album: '',
    lyrics: '',
    coverBytes: null,
    coverType: '',
    ok: false,
  }
  if (!buf || buf.length < 8) return out
  // 'fLaC'
  if (!(buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43)) return out
  out.ok = true

  let p = 4
  while (p + 4 <= buf.length) {
    const header = buf[p]
    const isLast = (header & 0x80) !== 0
    const type = header & 0x7f
    const len = (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3]
    const dataStart = p + 4
    const dataEnd = dataStart + len

    if (type === BLOCK_VORBIS_COMMENT && dataEnd <= buf.length) {
      parseVorbisComment(buf, dataStart, dataEnd, out)
    } else if (type === BLOCK_PICTURE && dataEnd <= buf.length && !out.coverBytes) {
      parsePicture(buf, dataStart, dataEnd, out)
    }

    // 已经是最后一块，或者这一块的数据超出本次读取范围，就不再往后找
    if (isLast || dataEnd > buf.length) break
    p = dataEnd
  }
  return out
}
