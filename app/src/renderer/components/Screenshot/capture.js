import { clipboard, nativeImage, shell } from 'electron'
import { dialog, webContents } from '@electron/remote'

import isElectron from 'is-electron'

const path = require('path')
const fs = require('fs')
const moment = require('moment')

function getWebview(id) {
  // TODO add test here, selectors are brittle
  const dom = document.querySelector(`[artboard-id="${id}"] webview`)
  return webContents.fromId(dom.getWebContentsId())
}

export async function capture(id, title, screenshotPath) {
  async function saveScreenshot(screenshot) {
    if (!screenshotPath) {
      // Case: no path set yet (single screenshot save)
      // Prompt location to save screenshot
      if (isElectron()) {
        const fileSelection = dialog.showOpenDialog({
          properties: ['openFile', 'openDirectory', 'createDirectory'],
        })

        await fileSelection.then((result) => {
          console.log(result)

          if (result.canceled || !result.filePaths.length) return false

          try {
            makeFile(result.filePaths[0], screenshot)
          } catch (e) {
            // Nothing was selected
            console.log('No file or directory selected')
          }
        })
      }
    } else {
      // Case: already has a path (multi-save)
      makeFile(screenshotPath, screenshot)
    }
  }

  // Create the file
  function makeFile(filePath, screenshot) {
    const timestamp = moment().format('YYYY-MM-D_h-mm-ssa')

    title ? (title = `_${title}_`) : (title = '')

    fs.writeFile(
      path.join(filePath, `reflex${title}${timestamp}.png`),
      screenshot,
      (err) => {
        if (err) throw err

        // Alert the user that the screenshot was saved
        new Notification('Screenshot saved', {
          body: filePath,
        })

        // Open in Finder
        shell.openItem(filePath)
      }
    )
  }

  try {
    // Capture the <webview>
    // Loop through the selected Webviews
    const webview = getWebview(id)
    const image = await webview.capturePage()
    saveScreenshot(image.toPNG())
  } catch (error) {
    throw new Error(error)
  }
}

export async function captureMultiple(ids) {
  // Accepts an array of ids to capture [ 0, 1 ]
  if (!ids) return false

  // 1. Capture the path to save all
  const fileSelection = dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory', 'createDirectory'],
  })

  await fileSelection.then((result) => {
    if (result.canceled || !result.filePaths.length) return false

    try {
      // Capture each & save it
      for (const item of ids) {
        capture(item, `${item}`, result.filePaths[0])
      }

      return result.filePaths[0]
    } catch (err) {
      throw new Error(err)
    }
  })
}

// Capture ALL the screens
export function captureAll(vm) {
  // 1. Get the file path to save all
  dialog.showOpenDialog(
    {
      properties: ['openFile', 'openDirectory', 'createDirectory'],
    },
    async function (filePaths) {
      // 2. Capture each & save it
      for (let i = 0; i < vm.artboards.length; i++) {
        await capture(i, `${vm.artboards[i].title}_${i}`, filePaths[0])
      }

      return filePaths[0]
    }
  )
}

// Take a screenshot
// Return the image (NativeImage) as a Promise
export async function screenshot(id) {
  try {
    const webview = getWebview(id)

    // Get the dimensions of the WebView
    const rect = await webview.executeJavaScript(
      `(() => ({ x: 0, y: 0, width: document.body.offsetWidth, height: document.body.offsetHeight }) )()`
    )

    // Scale based on DPI
    const DPI = window.devicePixelRatio // TODO make this configurable rather than based on the current device's pixel density
    rect.width = rect.width * DPI
    rect.height = rect.width * DPI

    // TODO bug: capturePage only captures part of the WebView that is within the window's viewport...
    // https://github.com/electron/electron/issues/8587
    // https://github.com/electron/electron/issues/8314

    // TODO add an option to hide scrollbars-- this is easily done by `webview.capturePage(rect)`

    // Return an image
    return webview.capturePage()
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Save an image to the user's clipboard
 * https://electronjs.org/docs/api/clipboard#clipboardwriteimageimage-type
 * @param {*} id This is the unique id of an artboard, not the HTML DOM index
 */
export async function copyToClipboard(id) {
  try {
    const image = await screenshot(id)
    // Convert again to the proper format
    // NativeImage in PNG format
    // https://electronjs.org/docs/api/native-image
    // via https://github.com/electron/electron/issues/8151#issuecomment-265288291

    const img = nativeImage.createFromBuffer(image.toPNG())

    // Write to clipboard
    clipboard.writeImage(img)

    // Done
    return true
  } catch (err) {
    throw new Error(err)
  }
}
