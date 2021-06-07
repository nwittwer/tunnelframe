<template>
  <div
    class="panzoom-container"
    :class="{ 'dev-visual-debugger': showCanvasDebugger }"
  >
    <PanzoomControls :instance="this.panzoomInstance" />
    <div
      ref="parent"
      :class="{
        'dev-visual-debugger': showCanvasDebugger,
        'panzoom-exclude': this.panzoomEnabled, // Allow pointer-events when panzoom is disabled
      }"
    >
      <slot />
    </div>
  </div>
</template>

<script>
import Panzoom from '@panzoom/panzoom'
import { mapState, mapGetters } from 'vuex'
import { ipcRenderer } from 'electron'
import isElectron from 'is-electron'
import PanzoomControls from './PanzoomControls.vue'

export default {
  components: {
    PanzoomControls,
  },
  data() {
    return {
      DOMElement: null,
      panzoomInstance: {},
    }
  },
  computed: {
    ...mapState({
      showCanvasDebugger: (state) => state.dev.showCanvasDebugger,
      panzoomEnabled: (state) => state.interactions.panzoomEnabled,
    }),
    ...mapGetters('interactions', ['isInteracting']),
  },
  watch: {
    // Watch for changes and change Panzoom accordingly
    panzoomEnabled(state) {
      state = true

      if (state === true) {
        // Enable panzoom
        this.panzoomInstance.bind() // Add event listeners

        this.panzoomInstance.setOptions({
          disablePan: false,
          disableZoom: false,
          cursor: 'grab',
        })
      } else {
        // Disable panzoom
        this.panzoomInstance.destroy() // Remove event listeners until re-enabled

        this.panzoomInstance.setOptions({
          disablePan: true,
          disableZoom: true,
          cursor: 'default',
        })
      }
    },
  },
  mounted() {
    // Initialize
    this.DOMElement = this.$refs.parent
    this.$root.$panzoom = Panzoom(this.DOMElement, {
      canvas: true, // Allows parent to control child
      cursor: 'grab',
    })

    // Reference inside of this component
    this.panzoomInstance = this.$root.$panzoom

    // Enable event listeners
    this.$nextTick(() => {
      this.enableEventListeners()
    })
  },
  methods: {
    enableEventListeners() {
      const instance = this.panzoomInstance
      const element = this.DOMElement
      const vm = this

      // element.addEventListener("panzoomchange", event => {
      //   console.log(event.detail); // => { x: 0, y: 0, scale: 1 }
      // });

      // TODO Add tests for these

      // Handle mouse & touch events
      this.mouseHandlers(element, instance, vm)

      // Mousewheel zoom w/ CMD/CTRL key
      this.wheelHandler(element, instance, vm)

      // Listen for menu bar events
      if (isElectron()) {
        ipcRenderer.on('menu_zoom-in', this.panzoomInstance.zoomIn)
        ipcRenderer.on('menu_zoom-out', this.panzoomInstance.zoomOut)
        // ipcRenderer.on("menu_zoom-to-fit", this.panzoomInstance.fitToScreen);
        ipcRenderer.on('menu_show-developer-canvas-debugger', () => {
          this.$store.commit('dev/toggleCanvasDebugger')
        })
      }
    },
    /**
     * Handles wheel events (i.e. mousewheel)
     * @param DOMElement DOM element that Panzoom is on
     * @param instance The Panzoom instance
     */
    wheelHandler(DOMElement, instance, vm) {
      DOMElement.parentElement.addEventListener('wheel', onWheel)

      function onWheel(event) {
        if (!vm.panzoomEnabled) return false // Only do this if Panzoom is enabled

        // Prevent default scroll event
        event.preventDefault()

        // Require the CMD/CTRL key to be pressed
        // This prevents accidental scrolling
        if (event.ctrlKey || event.metaKey || event.altKey) {
          instance.zoomWithWheel(event)
        } else {
          // Allow trackpads to pan using two fingers
          const currentPan = instance.getPan()

          const newPan = {
            x: currentPan.x - event.deltaX,
            y: currentPan.y - event.deltaY,
          }

          instance.pan(newPan.x, newPan.y)
        }
      }
    },
    /**
     * Handles mouse and touch events
     * @param DOMElement DOM element that Panzoom is on
     * @param instance The Panzoom instance
     */
    mouseHandlers(DOMElement, instance, vm) {
      // TODO These DO NOT WORK
      const parentElement = DOMElement.parentElement

      // Emit start events
      const onEvents = ['mousedown', 'touchstart', 'gesturestart']
      onEvents.forEach((name) => {
        parentElement.addEventListener(name, startEvents)
      })

      const offEvents = ['mouseup', 'touchend', 'gestureend']
      offEvents.forEach((name) => {
        parentElement.removeEventListener(name, startEvents)
        parentElement.addEventListener(name, endEvents)
      })

      function startEvents(e) {
        // Only continue if Panzoom is enabled
        if (vm.panzoomEnabled === false) {
          // e.stopPropogation()
          return false
        }

        vm.panzoomInstance.setOptions({
          cursor: 'grabbing',
        })

        vm.$store.commit('interactions/interactionSetState', {
          key: 'isPanzooming',
          value: true,
        })
      }

      function endEvents(e) {
        vm.panzoomInstance.setOptions({
          cursor: 'grab',
        })

        vm.$store.commit('interactions/interactionSetState', {
          key: 'isPanzooming',
          value: false,
        })

        parentElement.removeEventListener(name, endEvents)
      }
    },
    fitToScreen() {
      // TODO Re-attach fitToScreen
      // this.panzoomInstance.fitToScreen();
    },
  },
}
</script>

<style lang="scss" scoped>
.panzoom-container {
  // position: absolute;
  // overflow: hidden;
  // outline: none;
  height: 100%;
  width: 100%;
  position: relative;
  // position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
}

#parent {
  height: auto;
  width: auto;
  position: relative;
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  user-select: none;
}

#child {
  height: 100%;
  width: 100%;
}

.dev-visual-debugger {
  &:before,
  &:after {
    position: absolute;
    height: 100%;
    width: 100%;
    content: '';
    z-index: 1;
    pointer-events: none;
  }

  // Vertical line
  &:before {
    left: 50%;
    border-left: 1px solid red;
  }

  // Horizonal line
  &:after {
    top: 50%;
    left: 0;
    border-top: 1px solid red;
  }

  // Nested debugger
  .dev-visual-debugger {
    // Vertical line
    &:before {
      left: 50%;
      border-left: 1px solid green;
    }

    // Horizonal line
    &:after {
      top: 50%;
      border-top: 1px solid green;
    }
  }
}
</style>
