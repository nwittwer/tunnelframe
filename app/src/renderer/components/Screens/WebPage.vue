<template>
  <webview
    ref="frame"
    class="frame"
    :preload="injectScript"
    allowpopups
    enableremotemodule="true"
    plugins="true"
    webpreferences="contextIsolation=yes, nodeIntegration=yes"
  />
</template>

<script>
import path from 'path'
import { mapState } from 'vuex'
import { state as reflexState, setPublisher } from '~/mixins/reflex-sync'
const { remote } = require('electron')
const fs = remote.require('fs')

export default {
  props: {
    id: {
      type: String,
      required: true,
      default: '',
    },
    allowInteractions: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      options: {
        history: true,
      },
    }
  },
  computed: {
    ...mapState({
      url: (state) => state.history.currentPage.url,
    }),
    injectScript() {
      // const appPath = remote.app.getPath('appData')
      // Load the inject script
      const injectScriptPath =
        'file://' + path.join(process.resourcesPath, './inject.js')

      // Make sure the inject file is found
      try {
        fs.accessSync(injectScriptPath.replace('file://', ''))
      } catch (err) {
        console.log(`No inject script found at: ${injectScriptPath}`)
        throw new Error(err)
      }

      return injectScriptPath
    },
  },
  watch: {
    url: {
      // When the URL is changed, load the new site
      handler() {
        this.loadSite()
      },
    },
    allowInteractions(value) {
      // Toggle frame pointer-events
      const element = this.$refs.frame
      if (value === true) {
        element.style.pointerEvents = 'auto' // Allow interacting with webpage
      } else if (value === false) {
        element.style.pointerEvents = 'none' // Disable interactions with webpage
      }
    },
  },
  mounted() {
    const vm = this

    // Once the WebView is rendered
    this.$nextTick(() => {
      const frame = vm.$refs.frame

      // Bind event listeners
      this.bindEventListeners()

      // Load the <webview> the initial time
      this.loadSite()

      // Watch for History actions
      // TODO Better way to watch for VueX actions?
      this.unsubscribeAction = this.$store.subscribeAction((action, state) => {
        switch (action.type) {
          case 'history/reload':
            this.reload()
            break

          case 'history/back':
            this.back()
            break

          case 'history/forward':
            this.forward()
            break

          default:
            break
        }
      })
    })
  },
  beforeDestroy() {
    // Unbind any listeners
    this.unbindEventListeners()

    // Unsubscribe from Store
    this.unsubscribeAction()
  },
  methods: {
    bindEventListeners() {
      // Remove navigation event
      const frame = this.$refs.frame
      frame.addEventListener('will-navigate', this.willNavigate)

      // Listen for incoming events
      this.$bus.$on('REFLEX_SYNC', this.syncResponder)
    },
    unbindEventListeners() {
      // Remove navigation event
      const frame = this.$refs.frame
      frame.removeEventListener('will-navigate', this.willNavigate)

      // Detach from the frame. Important!
      this.$bus.$off('REFLEX_SYNC', this.syncResponder)
    },
    syncResponder(args) {
      // Remove navigation event
      const frame = this.$refs.frame

      if (!frame) {
        console.error('Frame not found?')
        return
      }

      console.log(args)
      console.log('publisher', reflexState.publisher)

      // Do the following actions inside of the <WebView>
      if (this.id === reflexState.publisher) {
        // Don't trigger on the origin
        // TODO Tell the Webview to change its state to origin = true
        frame.send('REFLEX_SYNC_setState', {
          isOrigin: true,
        })
      } else {
        console.log('REFLEX EVENT:', args)

        // Update state
        frame.send('REFLEX_SYNC_setState', {
          isOrigin: false,
        })

        // Send event back to the frame
        frame.send('REFLEX_SYNC_setDOMEffect', {
          ...args,
        })
      }
    },
    reload() {
      // Reload the current page
      this.loadSite({
        history: false,
      })
    },
    back() {
      // Load the previous page
      // const frame = this.$refs.frame

      // VueX
      const pages = this.$store.state.history.pages
      // const currentPage = this.$store.state.history.currentPage.index
      const nextPage = this.$store.state.history.currentPage.index - 1
      // frame.loadURL(pages[nextPage]);

      // Update the URL in the store
      this.$store.commit('history/changeSiteData', {
        url: pages[nextPage],
      })

      // TODO Improve the way new pages are loaded
      // to take into account the history state
      // i.e. something like this:
      // store.dispatch("loadNewSite", "site.com")
    },
    forward() {
      // Load the next page
      // const frame = this.$refs.frame

      // VueX
      const pages = this.$store.state.history.pages
      // const currentPage = this.$store.state.history.currentPage.index
      const nextPage = this.$store.state.history.currentPage.index + 1
      // frame.loadURL(pages[nextPage]);

      // Update the URL in the store
      this.$store.commit('history/changeSiteData', {
        url: pages[nextPage],
      })

      // TODO Improve the way new pages are loaded
      // to take into account the history state
      // i.e. something like this:
      // store.dispatch("loadNewSite", "site.com")
    },
    /**
     * Loads a site
     * Data and listeners should clear after each call
     * By default, saves the URL to the history
     * @param {object} options Accepts a history option. When true, will save URL to history.
     */
    loadSite(options = { history: true }) {
      // const vm = this
      const frame = this.$refs.frame

      // The frame has been destroyed
      // Remove event listeners
      if (!frame) {
        this.removeListeners()
        throw new Error('Frame listeners still active after component destroy.')
      }

      // Turn history saving on/off
      switch (options.history) {
        case true:
          this.options.history = true
          break

        case false:
          this.options.history = false
          break

        default:
          break
      }

      // Initialize the event listeners
      this.addListeners()

      // Set the URL, start loading
      frame.setAttribute('src', this.url)
    },
    addListeners() {
      const frame = this.$refs.frame
      frame.addEventListener('did-start-loading', this.loadstart) // loadstart
      frame.addEventListener('did-attach-webview', () => {
        console.log('attached webview!!')
      }) // loadstart
      frame.addEventListener('dom-ready', this.contentloaded) // contentload
      frame.addEventListener('did-stop-loading', this.loadstop) // loadstop
      frame.addEventListener('ipc-message', this.onMessageReceived) // Listen for response

      // Fatal
      frame.addEventListener('did-fail-load', this.loadabort) // Failed to load
      frame.addEventListener('loadabort', this.loadabort) // loadabort
    },
    removeListeners() {
      const frame = this.$refs.frame
      frame.removeEventListener('did-start-loading', this.loadstart)
      frame.removeEventListener('dom-ready', this.contentloaded)
      frame.removeEventListener('did-stop-loading', this.loadstop)
      frame.removeEventListener('ipc-message', this.onMessageReceived)

      // Fatal
      frame.removeEventListener('did-fail-load', this.loadabort)
      frame.removeEventListener('loadabort', this.loadabort)
    },
    loadstart() {
      this.$emit('loadstart') // Show loading spinner

      // Change the title to Loading...
      // TODO Add a VueX action for this?
      this.$store.commit('history/changeSiteData', {
        title: 'Loading...',
      })
    },
    contentloaded() {
      const frame = this.$refs.frame

      frame.send('bridgeToFrame', {
        id: this.id,
      })
    },
    onMessageReceived(event) {
      if (event.channel === 'REFLEX_SYNC') {
        // BUS: https://binbytes.com/blog/create-global-event-bus-in-nuxtjs
        const data = event.args[0]
        // console.log(data)

        // TODO This can fail if multiple artboards are selected
        // TODO wait for did-attach-webview event
        if (this.allowInteractions) {
          // The sender
          setPublisher(this.id) // Update the publisher

          // Only capture actions while allowed
          this.$bus.$emit('REFLEX_SYNC', {
            ...data,
          })
        }

        // Update the scroll info in the parent components
        if (data.event.type === 'scroll') {
          const { x, y } = data.origin.scrollOffset
          this.$emit('scroll', {
            x,
            y,
          })
        }
      } else if (event.channel === 'initiateBridge') {
        const returnedData = event.args[0]
        const title = returnedData.title
        const favicon = returnedData.favicon

        // TODO Add to VueX Action
        this.$store.commit('history/changeSiteData', {
          title,
          favicon,
        })
      } else if (event.channel === 'unload') {
        console.log('Unloading')
        // this.removeListeners();
      } else {
        console.log('Unrecognized channel', event.args[0])
      }
    },
    loadstop() {
      const frame = this.$refs.frame
      this.$emit('loadend') // Hide loading spinner

      // History
      // If the call said history:false, then we need to update history
      // TODO Shouldn't this only update when history:true?
      if (this.options.history === false) {
        this.$store.commit(
          'history/updateHistory',
          remote.webContents.fromId(frame.getWebContentsId()).history
        )
      }
    },
    loadabort() {
      this.$emit('loadend') // Hide loading spinner

      // @TODO: Update with Electron API
      new Notification('Aborted', {
        body: 'The site stopped loading for some reason.',
      })

      // Remove the event listeners related to site loading
      this.removeListeners()
    },
    willNavigate(event) {
      // Handle user clicking on a link inside of the webview
      // TODO This should add a new page to the History
      // TODO Add to VueX Action
      this.$store.commit('history/changeSiteData', {
        url: event.url,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.frame,
webview {
  height: 100%;
  width: 100%;
  position: relative;
  pointer-events: none; // Prevent interactions/events by default
}
</style>
