<template lang="pug"> 
div(class="btn" :class="[variantClasses]" v-bind="$attrs")
  slot
    .btn__loader(v-if="loading")
        slot(name="loading")
          svg(viewBox="0 0 40 40")
            circle(
              cx="20" cy="20" r="18"
              fill="transparent"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round")
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'rfx-button',
  props: {
    /**
     * The kind of button
     */
    kind: {
      type: String,
      default: 'default',
      validator: function (value) {
        return ['default', 'primary', 'secondary'].includes(value)
      },
    },
    /**
     * Should the button be fully rounded?
     */
    oval: {
      type: Boolean,
      default: false,
    },
    /**
     * Loading state
     */
    loading: { type: Boolean },
    /**
     * Position of optional icon slot
     */
    iconPosition: {
      type: String,
      default: 'left',
      validator: function (value) {
        return ['left', 'right'].includes(value)
      },
    },
  },
  setup(props, { slots }) {
    const variantClasses = computed(() => {
      return {
        'btn--default': props.kind === 'default',
        'btn--primary': props.kind === 'primary',
        'btn--secondary': props.kind === 'secondary',
        'btn--loading': props.loading,
        'btn--oval': props.oval,
        'justify-between': props.iconPosition === 'right', // Justify when icon is on the right TODO make this less hacky
      }
    })

    const iconClasses = computed(() => {
      // When should there be some space between the icon and the text in the button?
      // Only when there's text
      return {
        'icon--left': hasText && props.iconPosition === 'left' && !props.oval,
        'icon--right': hasText && props.iconPosition === 'right' && !props.oval,
      }
    })

    const hasIcon = computed(() => {
      return !!slots['icon']
    })

    const hasText = computed(() => {
      return !!slots.default && !!slots.default[0]
    })

    return {
      variantClasses,
      iconClasses,
      hasIcon,
      hasText,
    }
  },
})
</script>

<style lang="scss" scoped>
$spinner-size: 1rem;

.btn {
  position: relative;
  cursor: pointer;
  line-height: 1rem;
  // Styles
  @apply text-black font-semibold bg-white rounded-lg shadow-md;
  // Layout
  @apply flex items-center space-x-4 px-4 py-2;
  // Transitions
  @apply transition-all duration-100 ease-out;
  // Prevent text selection
  @apply select-none;

  &:hover {
    @apply bg-gray-100;
  }

  &:active {
    @apply bg-gray-300;
  }

  &:focus {
    @apply outline-none ring-2 ring-red-500 ring-opacity-75;
  }

  &--oval {
    border-radius: 50%;
    display: inline-block;
    line-height: 1rem;
    // max-height: 2rem;
    width: 2rem;
    height: 2rem;
    padding: 0;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    @apply flex items-center justify-center; // Flex
  }

  &--loading {
    cursor: wait;
    opacity: 0.8;
  }

  &[disabled] {
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.4;
    -webkit-tap-highlight-color: transparent;
  }

  // Disable visual feedback on loading and disabled buttons.
  &--loading:hover:before,
  &--loading:focus:before,
  &--loading:active:before,
  &[disabled]:before {
    opacity: 0;
  }

  &__loader {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: inherit;
    svg {
      height: 1rem;
    }
    circle {
      stroke-dasharray: (3.14 * $spinner-size);
      transform-origin: 50%;
      animation: spinner 2s linear infinite;
    }
  }
}

.btn--primary {
  @apply text-white bg-blue-500;

  &:hover {
    @apply bg-blue-400;
  }

  &:active {
    @apply bg-blue-600;
  }
}

.btn--secondary {
  @apply text-black bg-gray-200;

  &:hover {
    @apply bg-gray-100;
  }

  &:active {
    @apply bg-gray-300;
  }
}

.icon {
  &--left {
    @apply mr-2;
  }
  &--right {
    @apply ml-2;
  }
}

@keyframes spinner {
  0% {
    transform: rotate(0deg);
    stroke-dashoffset: (0.66 * $spinner-size);
  }
  50% {
    transform: rotate(720deg);
    stroke-dashoffset: (3.14 * $spinner-size);
  }
  100% {
    transform: rotate(1080deg);
    stroke-dashoffset: (0.66 * $spinner-size);
  }
}
</style>
