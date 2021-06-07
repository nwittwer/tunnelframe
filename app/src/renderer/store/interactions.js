export const state = () => ({
  // isPanning: false,
  // isZooming: false,
  internal: {
    isPanzooming: false,
    isSelectingArea: false,
    isResizingArtboard: false,
  },
  isWebInteractionContext: false,
  panzoomEnabled: true,
})

export const getters = {
  /**
   * Getter to check if any states are true
   * Is Interacting = true when any internal state is true
   */
  isInteracting: (state) => {
    let isOn = false

    for (const s in state.internal) {
      if (state[s] === true) {
        isOn = true
      }
    }

    return isOn
  },

  /**
   * Is the current user in the
   * app context or the web interaction context?
   */
  currentContext: (state) => {
    // TODO this should also take into consideration if 1+ screens are selected,
    // or if there is a panzoom event happening
    return state.isWebInteractionContext ? 'web' : 'app'
  },
}

export const mutations = {
  interactionSetState: (state, { key, value }) => {
    if (state.internal[key] !== value) {
      state.internal[key] = value
    }
  },
  setPanzoomState: (state, { value }) => {
    state.panzoomEnabled = value
  },
  setWebInteractionState: (state, value) => {
    state.isWebInteractionContext = value
  },
}
