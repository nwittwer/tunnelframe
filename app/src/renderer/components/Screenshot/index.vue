<template>
  <div id="screenshots">
    <!-- One selected -->
    <transition name="slide-fade">
      <div v-if="selectedArtboards.length > 0" class="modal">
        <div>
          <Button role="primary" @click="screenshotSelected">
            Save
            {{
              selectedArtboards.length > 1
                ? selectedArtboards.length + ' images...'
                : selectedArtboards.length + ' image...'
            }}
          </Button>
          <Button
            v-if="selectedArtboards.length === 1"
            role="secondary"
            @click="copyToClipboard"
          >
            Copy to Clipboard
          </Button>
          <!-- <Button
            v-if="selectedArtboards.length === 1"
            role="secondary"
            @click="copyToClipboard"
            >Run Cross-browser</Button
          > -->
        </div>
        <Button
          role="secondary"
          class="modal__close button"
          @click="clearAllSelected"
        >
          Clear Selection
        </Button>
      </div>
    </transition>

    <!-- TODO Show the file path in Finder -->
    <!-- <a href="#" @click="showInFinder()">Show in Finder</a> -->
  </div>
</template>

<script>
import { mapState } from 'vuex'
import * as capture from './capture.js'

export default {
  name: 'Screenshots',

  data() {
    return {
      isScreenshotMode: false,
      filePath: '',
    }
  },

  computed: {
    // Bind to our Vuex Store's URL value
    artboards() {
      return this.$store.state.artboards.list
    },
    selectedArtboards() {
      return this.$store.state.selectedArtboards
    },
    ...mapState({
      selectedArtboards: (state) => state.selectedArtboards,
    }),
  },

  methods: {
    clearAllSelected() {
      this.$store.dispatch('selectedArtboards/selectedArtboardsEmpty')
    },

    async screenshotAll() {
      try {
        await capture.captureAll(this)
      } catch (err) {
        throw new Error(err)
      }
    },

    async screenshotSelected() {
      try {
        await capture.captureMultiple(this.selectedArtboards)
      } catch (err) {
        throw new Error(err)
      }
    },

    async copyToClipboard() {
      await capture.copyToClipboard(this.selectedArtboards).catch((err) => {
        console.error(err)
      })
      // TODO Notify the user when the image has been saved to clipboard
      // TODO Notify the user if there's an error copying to clipboard
    },
  },
}
</script>

<style lang="scss" scoped>
@import '~@/scss/_variables';

#screenshots {
  .modal {
    position: fixed;
    bottom: 2rem;
    margin: 0 auto;
    left: 0;
    right: 0;
  }
}

.modal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 700px;
  background: white;
  padding: 1rem;
  z-index: 100;
  background: #ffffff;
  border: 1px solid #c8c8c8;
  border-radius: 4px;

  .modal__close {
    color: black;
    cursor: pointer;
  }
}

/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-fade-enter-active {
  transition: all 300ms ease;
}
.slide-fade-leave-active {
  transition: all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-fade-enter,
.slide-fade-leave-to {
  transform: translateY(4rem);
  opacity: 0;
}
</style>
