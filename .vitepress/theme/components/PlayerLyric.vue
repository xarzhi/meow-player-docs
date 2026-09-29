<script setup>
// 逐字填充歌词行：当前句按整句时长做行内插值，逐字点亮。
import { computed } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  time: { type: Number, default: 0 },
  /** 没有时间轴的纯文本歌词行（有 lines 时忽略） */
  plain: { type: Array, default: () => [] },
})

// 二分找出当前句
const activeIndex = computed(() => {
  const l = props.lines
  if (!l.length) return -1
  let lo = 0
  let hi = l.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (l[mid].time <= props.time) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
})

const active = computed(() => (activeIndex.value >= 0 ? props.lines[activeIndex.value] : null))
const upcoming = computed(() => props.lines[activeIndex.value + 1] || null)

const progress = computed(() => {
  if (!active.value) return 0
  const start = active.value.time
  const end = upcoming.value ? upcoming.value.time : start + 4
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (props.time - start) / (end - start)))
})

const chars = computed(() => (active.value ? Array.from(active.value.text) : []))
const filled = computed(() => Math.round(progress.value * chars.value.length))

// 有逐字时间标签就按真实时间点亮，否则按整句时长做行内插值
const filledByWords = computed(() => {
  const words = active.value?.words
  if (!words || !words.length) return -1
  let count = 0
  for (const w of words) {
    if (w.time <= props.time) count += Array.from(w.char).length
    else break
  }
  return count
})
</script>

<template>
  <div class="mp-lyric">
    <template v-if="active">
      <span
        v-for="(ch, i) in chars"
        :key="i"
        class="mp-char"
        :class="{ on: filledByWords >= 0 ? i < filledByWords : i < filled }"
        >{{ ch }}</span
      >
    </template>
    <!-- 没有时间轴：就平铺显示，不做假同步 -->
    <div v-else-if="plain.length" class="mp-lyric-plain">
      <span v-for="(line, i) in plain" :key="i">{{ line }}<br /></span>
    </div>
    <span v-else class="mp-lyric-idle">
      {{ lines.length ? '· · ·' : '没有歌词（放一个同名 .lrc 就会被读到）' }}
    </span>
  </div>
</template>

<style scoped>
.mp-lyric {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
  letter-spacing: 0.02em;
  white-space: pre-wrap;
  word-break: break-word;
}
.mp-char {
  color: var(--vp-c-text-3);
  transition: color 0.12s linear;
}
/* 已经唱到的那几个字高亮 */
.mp-char.on {
  color: var(--vp-c-brand-1);
}
.mp-lyric-idle {
  color: var(--vp-c-text-3);
  font-size: 12px;
}
/* 无时间轴歌词：小窗口里平铺，可滚动 */
.mp-lyric-plain {
  align-self: stretch;
  max-height: 52px;
  padding: 2px 4px;
  overflow-y: auto;
  color: var(--vp-c-text-3);
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
  scrollbar-width: none;
}
.mp-lyric-plain::-webkit-scrollbar {
  display: none;
}
</style>
