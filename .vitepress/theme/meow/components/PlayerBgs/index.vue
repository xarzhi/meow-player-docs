<template>
    <div class="player_bg">
        <component :is="Blur"></component>
        <!-- <StarrySky /> -->
        <!-- <AdvergeColor /> -->
    </div>

</template>

<script setup>
import Blur from './Blur.vue';
import { usePlayerStore } from '@/stores/index.js'
import StarrySky from './StarrySky.vue'
const playerStore = usePlayerStore()

</script>

<style lang="scss" scoped>
.player_bg {
    width: 100%;
    height: 100%;
    position: relative;
}

.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
    opacity: 1;
}

.fade-enter-from {
    opacity: 0;
}

.fade-leave-to {
    opacity: 0;
}
</style>
