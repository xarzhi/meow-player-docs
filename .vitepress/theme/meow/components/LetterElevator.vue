<template>
	<div class="letterElevator">
		<div class="letters_nav" v-if="playerStore.needLetterElevator">
			<!-- <LiquidGlass> -->
			<div class="letter_box">
				<div
					class="letter_wrapper"
					v-for="letter in letters"
					@click="letterTransport(letter)"
					@mousemove="letterMouseMove($event, letter)"
					@mouseleave="letterMouseLeave($event, letter)"
				>
					<span
						:class="{
							letter: true,
							disabled: isDisabled(letter),
						}"
					>
						{{ letter }}
					</span>
				</div>
			</div>
			<!-- </LiquidGlass> -->
		</div>
	</div>
	<div
		class="current_letter"
		v-if="current_letter_visible"
		:style="{
			top: current_letter_top + 'px',
		}"
	>
		<div class="letter">
			{{ current_letter }}
		</div>
	</div>
</template>

<script setup>
import { usePlayerStore } from '@/stores/index.js'
// import LiquidGlass from './LiquidGlass.vue'
import { ref } from 'vue'
const emit = defineEmits(['click'])
const props = defineProps({
	list: {
		type: Array,
		default: () => [],
	},
})

const playerStore = usePlayerStore()
const current_letter_top = ref(0)
const current_letter = ref('')
const current_letter_visible = ref(false)

const letterTransport = letter => {
	emit('click', letter)
}

const isDisabled = letter => {
	return props.list.findIndex(item => item.letter === letter) === -1
}

const letterMouseMove = (e, letter) => {
	const element = e.target
	const rect = element.getBoundingClientRect()
	current_letter_top.value = rect.top - (30 - rect.height) / 2
	current_letter.value = letter
	current_letter_visible.value = true
}
const letterMouseLeave = () => {
	current_letter_visible.value = false
}

const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ#']
</script>

<style lang="scss" scoped>
.letterElevator {
	top: 50%;
	height: 100%;
	width: 100px;
	right: 9px;
	position: fixed;
	max-height: calc(100% - var(--top-height) - var(--player-height) - 80px);
	transform: translate(0, -50%);
	display: flex;
	justify-content: end;
	align-items: center;
	overflow: hidden;
	z-index: 99;
	&:hover {
		.letters_nav {
			right: 0;
			transition-delay: 0s;
		}
	}

	.letters_nav {
		
		position: absolute;
		border-radius: 4px;
		transition: right 0.3s;
		transition-delay: 0.5s;
		width: 30px;
		right: -40px;
		display: flex;
		box-sizing: border-box;
		align-items: center;
		background-color: var(--letter-evt-bg);

		backdrop-filter: blur(10px);
		border-radius: 20px;
		&::-webkit-scrollbar {
			display: none;
		}
		&.show {
			opacity: 1;
		}

		.letter_box {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			width: 100%;
			padding: 10px 0;
			box-sizing: border-box;
			height: 65%;
			background-color: transparent;
			overflow-y: auto;
			scrollbar-width: none;
			-ms-overflow-style: none;
			.letter_wrapper {
				display: flex;
				justify-content: center;
				// margin-bottom: 3px;
				color: var(--letter-evt-text);
				.letter {
					width: 100%;
					display: flex;
					justify-content: center;
					align-items: center;
					border-radius: 3px;
					font-family: 'Comfortaa';
					font-size: 12px;
					height: 18px;
					line-height: 20px;
					position: relative;
					cursor: pointer;
					text-shadow: 0 0 18px #333;
					&.disabled {
						cursor: not-allowed;
					}
					&:hover {
						background-color: rgba($color: #000, $alpha: 0.5);
						color: #fff;
						&::before {
							opacity: 1;
						}
					}
				}
			}
		}
	}
}
.current_letter {
	user-select: none;
	position: fixed;
	right: 55px;
	width: 30px;
	height: 30px;
	text-align: center;
	display: flex;
	justify-content: center;
	align-items: center;
	font-family: 'Comfortaa';
	border-radius: 50% 50% 0 50%;
	background-color: var(--evt-letter-bg);
	transform: rotate(-45deg);
	z-index: 99;

	.letter {
		color: #fff;
		color: var(--evt-letter-color);
		font-weight: 600;
		transform: rotate(45deg);
	}
}
</style>
