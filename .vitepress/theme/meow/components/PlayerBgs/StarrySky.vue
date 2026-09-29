<template>
    <div class="bg">
        <canvas ref="canvasRef" @touchmove="onTouchMove" @mouseleave="onMouseLeave"></canvas>
    </div>
</template>

<script setup>
import { onMounted, ref, reactive, computed, nextTick, onUnmounted } from 'vue';
const STAR_COLOR = ref("#fff");
const STAR_SIZE = ref(3);
const STAR_MIN_SCALE = ref(0.2);
const OVERFLOW_THRESHOLD = ref(50);
const STAR_COUNT = computed(() => (window.innerWidth + window.innerHeight) / 8)

const canvasRef = ref(null);
const context = ref()

const scale = ref(1); // device pixel ratio
const width = ref()
const height = ref()
const stars = reactive([]);
const pointerX = ref();
const pointerY = ref();
const velocity = reactive({ x: 0, y: 0, tx: 0, ty: 0, z: 0.0009 });
const touchInput = ref(false);



onMounted(() => {
    const canvas = canvasRef.value
    context.value = canvas.getContext("2d");

    generate();
    resize();
    step();


    window.addEventListener('resize', resize)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
})



onUnmounted(() => {
    window.removeEventListener('resize', resize)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseleave', onMouseLeave)
})

function generate() {
    for (let i = 0; i < STAR_COUNT.value; i++) {
        stars.push({
            x: 0,
            y: 0,
            z: STAR_MIN_SCALE.value + Math.random() * (1 - STAR_MIN_SCALE.value),
        });
    }
}
function placeStar(star) {
    star.x = Math.random() * width.value;
    star.y = Math.random() * height.value;
}
function recycleStar(star) {
    let direction = "z";
    let vx = Math.abs(velocity.x);
    let vy = Math.abs(velocity.y);
    if (vx > 1 || vy > 1) {
        let axis;
        if (vx > vy) {
            axis = Math.random() < vx / (vx + vy) ? "h" : "v";
        } else {
            axis = Math.random() < vy / (vx + vy) ? "v" : "h";
        }
        if (axis === "h") {
            direction = velocity.x > 0 ? "l" : "r";
        } else {
            direction = velocity.y > 0 ? "t" : "b";
        }
    }
    star.z = STAR_MIN_SCALE.value + Math.random() * (1 - STAR_MIN_SCALE.value);
    if (direction === "z") {
        star.z = 0.1;
        star.x = Math.random() * width.value;
        star.y = Math.random() * height.value;
    } else if (direction === "l") {
        star.x = -OVERFLOW_THRESHOLD.value;
        star.y = height.value * Math.random();
    } else if (direction === "r") {
        star.x = width.value + OVERFLOW_THRESHOLD.value;
        star.y = height.value * Math.random();
    } else if (direction === "t") {
        star.x = width.value * Math.random();
        star.y = -OVERFLOW_THRESHOLD.value;
    } else if (direction === "b") {
        star.x = width.value * Math.random();
        star.y = height.value + OVERFLOW_THRESHOLD.value;
    }
}
function resize() {
    nextTick(() => {
        scale.value = window.devicePixelRatio || 1;
        width.value = window.innerWidth * scale.value;
        height.value = window.innerHeight * scale.value;
        canvasRef.value.width = width.value;
        canvasRef.value.height = height.value;
        stars.forEach(placeStar);
    })
}
function step() {
    context.value.clearRect(0, 0, width.value, height.value);
    update();
    render();
    requestAnimationFrame(step);
}
function update() {
    velocity.tx *= 0.96;
    velocity.ty *= 0.96;
    velocity.x += (velocity.tx - velocity.x) * 0.8;
    velocity.y += (velocity.ty - velocity.y) * 0.8;
    stars.forEach((star) => {
        star.x += velocity.x * star.z;
        star.y += velocity.y * star.z;
        star.x += (star.x - width.value / 2) * velocity.z * star.z;
        star.y += (star.y - height.value / 2) * velocity.z * star.z;
        star.z += velocity.z;
        if (
            star.x < -OVERFLOW_THRESHOLD.value ||
            star.x > width.value + OVERFLOW_THRESHOLD.value ||
            star.y < -OVERFLOW_THRESHOLD.value ||
            star.y > height.value + OVERFLOW_THRESHOLD.value
        ) {
            recycleStar(star);
        }
    });
}
function render() {
    stars.forEach((star) => {
        context.value.beginPath();
        context.value.lineCap = "round";
        context.value.lineWidth = STAR_SIZE.value * star.z * scale.value;
        context.value.globalAlpha = 0.5 + 0.5 * Math.random();
        context.value.strokeStyle = STAR_COLOR.value;
        context.value.moveTo(star.x, star.y);

        let tailX = velocity.x * 2;
        let tailY = velocity.y * 2;
        if (Math.abs(tailX) < 0.1) tailX = 0.5;
        if (Math.abs(tailY) < 0.1) tailY = 0.5;
        context.value.lineTo(star.x + tailX, star.y + tailY);

        context.value.stroke();
    });
}

function movePointer(x, y) {
    if (typeof pointerX.value === "number" && typeof pointerY.value === "number") {
        let ox = x - pointerX.value;
        let oy = y - pointerY.value;
        velocity.tx = velocity.tx + (ox / 8) * scale.value * (touchInput.value ? 1 : -1);
        velocity.ty = velocity.ty + (oy / 8) * scale.value * (touchInput.value ? 1 : -1);
    }
    pointerX.value = x;
    pointerY.value = y;
}
function onMouseMove(event) {
    touchInput.value = false;
    movePointer(event.clientX, event.clientY);
}
function onTouchMove(event) {
    touchInput.value = true;
    movePointer(event.touches[0].clientX, event.touches[0].clientY, true);
    event.preventDefault();
}
function onMouseLeave() {
    pointerX.value = null;
    pointerY.value = null;
}




</script>

<style lang="scss" scoped>
@keyframes animatedGradient {
    0% {
        background-position: 0% 75%;
    }

    50% {
        background-position: 100% 50%;
    }

    100% {
        background-position: 0% 75%;
    }
}



.bg {
    width: 100%;
    height: 100%;
    background-image: linear-gradient(-225deg,
            #231557 0%,
            #43107a 29%,
            #ff1361 100%);

    background-size: 400% 400%;
    animation: animatedGradient 8s ease infinite;

    canvas {
        background-color: transparent;
    }
}
</style>
