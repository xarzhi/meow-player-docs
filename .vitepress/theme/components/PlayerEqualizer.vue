<script setup>
// 10 段均衡器：频率点与 App 一致（31Hz ~ 16kHz），每段 ±12dB，带预设。
import { computed } from 'vue'
import { EQ_BANDS, EQ_PRESETS } from '../hooks/usePlayer.js'

const props = defineProps({
  gains: { type: Array, default: () => new Array(10).fill(0) },
  enabled: { type: Boolean, default: true },
})

const emit = defineEmits(['update:gains', 'update:enabled'])

const presetNames = Object.keys(EQ_PRESETS)
const activePreset = computed(() => {
  for (const [name, values] of Object.entries(EQ_PRESETS)) {
    if (values.length === props.gains.length && values.every((v, i) => Math.abs(v - props.gains[i]) < 0.01)) {
      return name
    }
  }
  return ''
})

function label(freq) {
  return freq >= 1000 ? `${freq / 1000}k` : String(freq)
}

function onInput(i, e) {
  const next = [...props.gains]
  next[i] = Number(e.target.value)
  emit('update:gains', next)
}

function applyPreset(name) {
  emit('update:gains', [...EQ_PRESETS[name]])
}
</script>

<template>
  <div class="mp-eq">
    <div class="mp-eq-head">
      <span class="mp-eq-title">均衡器</span>
      <label class="mp-eq-switch">
        <input type="checkbox" :checked="enabled" @change="emit('update:enabled', $event.target.checked)" />
        <span>{{ enabled ? '开' : '关' }}</span>
      </label>
    </div>

    <div class="mp-eq-presets">
      <button
        v-for="name in presetNames"
        :key="name"
        class="mp-chip"
        :class="{ on: activePreset === name }"
        type="button"
        @click="applyPreset(name)"
      >
        {{ name }}
      </button>
    </div>

    <div class="mp-eq-bands" :class="{ off: !enabled }">
      <div v-for="(freq, i) in EQ_BANDS" :key="freq" class="mp-eq-band">
        <span class="mp-eq-db">{{ Number(gains[i] || 0) > 0 ? '+' : '' }}{{ Number(gains[i] || 0).toFixed(0) }}</span>
        <div class="mp-eq-slot">
          <input
            class="mp-eq-range"
            type="range"
            min="-12"
            max="12"
            step="1"
            :value="gains[i] || 0"
            :aria-label="`${label(freq)}Hz`"
            @input="onInput(i, $event)"
          />
        </div>
        <span class="mp-eq-freq">{{ label(freq) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp-eq {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--vp-c-divider);
}
.mp-eq-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.mp-eq-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.mp-eq-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  user-select: none;
}
.mp-eq-switch input {
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}
.mp-eq-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.mp-chip {
  font-size: 11px;
  line-height: 1;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.18s;
}
.mp-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.mp-chip.on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}
.mp-eq-bands {
  display: flex;
  justify-content: space-between;
  gap: 2px;
  transition: opacity 0.2s;
}
.mp-eq-bands.off {
  opacity: 0.4;
}
.mp-eq-band {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.mp-eq-slot {
  height: 86px;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 竖向滑块：旋转横放的 range，兼容性比 writing-mode 稳 */
.mp-eq-range {
  width: 86px;
  height: 16px;
  transform: rotate(-90deg);
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}
.mp-eq-db,
.mp-eq-freq {
  font-size: 9px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
