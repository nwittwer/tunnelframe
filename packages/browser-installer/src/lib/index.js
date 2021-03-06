"use strict";

// import "core-js/stable";
// import "regenerator-runtime/runtime";

const packageName = "electron-playwright-browser-installer";
import playwright from "playwright-core";

// We'll prepend console.log messages for this library
// via https://stackoverflow.com/a/16259739/1114901
(function () {
  const logTypes = ["log", "error", "info"];
  if (console.log) {
    const generator = (type) => {
      var old = console[type];
      console[type] = function () {
        Array.prototype.unshift.call(
          arguments,
          `${packageName.toUpperCase()}:`
        );
        old.apply(this, arguments);
      };
    };
    // Apply to each type of console
    logTypes.map(generator);
  }
})();

/**
 * This file exposes a class interface for
 * displaying the browser installation progress
 */
const { installBrowsersWithProgressBar } = require("./install/installer");
import { promises as fs } from "fs";
/**
 * Attach to the EventEmitter
 * This allows us to stream the download progress
 */
import { downloadEmitter } from "./emitter";

export class Installer {
  constructor(options = {}) {
    options = options || {};
    this.browsers = options.browsers || ["chromium", "firefox", "webkit"];
  }

  async run() {
    const isInstalled = await this.checkIfInstalled();

    if (isInstalled) {
      console.log("Browsers are installed.");
    } else {
      // Not installed yet
      console.log("Browsers are NOT installed!");
      await this.install();
    }
  }

  async checkIfInstalled(dirPath) {
    // Check for installed browsers in a directory
    console.log("Checking if browsers are installed...");

    return false; // TODO Actually check a directory...
  }

  async install(
    options = {
      browsers: this.browsers,
    }
  ) {
    if (options.browsers.length) {
      for (const browser of options.browsers) {
        console.log(`Path: ${getPackagedPlaywrightExecPath(browser)}`);
      }
    } else {
      console.error("No browsers were passed in to install");
      return false;
    }

    // Ensure the the user has configured the expected environment variable
    if (process.env.PLAYWRIGHT_BROWSERS_PATH !== "0") {
      console.log("Env var PLAYWRIGHT_BROWSERS_PATH is missing or incorrect");
      return false;
    }

    // Start listening for download events
    // Listen to progress events
    downloadEmitter.on("progress", async ({ current, total, name }) => {
      const msg = `Downloading ${name} - ${current}/${total}`;
      console.log(msg);
    });

    downloadEmitter.on("done", async () => {
      // Function here
      // console.log(`It's done downloading!`);
    });

    // Example via Playwright's Github Installer
    // https://github.com/microsoft/playwright/blob/master/install-from-github.js#L29
    await installBrowsersWithProgressBar(__dirname).catch((err) => {
      console.error(`Failed to install browsers, caused by\n${err.stack}`);
      process.exit(1);
    });

    // Verify that there is a directory for each of the browsers
    const checkInstallDir = async () => {
      const results = await ls(`${__dirname}/.local-browsers`);
      const { browsers } = options;
      return browsers.every((v) => results.find((x) => x.includes(v)));
    };

    if ((await checkInstallDir()) === true) {
      console.log("Browsers are installed.");
      return true;
    } else {
      console.error("Browsers are NOT installed!");
      return false;
    }
  }
}

// Find all files & folders at a path
// https://stackoverflow.com/a/59042581/1114901
async function ls(path) {
  try {
    const tempArr = [];
    const dir = await fs.opendir(path); // Opens a stream https://nodejs.org/api/fs.html#fs_class_fs_dir

    for await (const dirent of dir) {
      tempArr.push(dirent.name);
    }

    return tempArr; // return all the files & directories at the output dir
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Amend the Playwright executable path when packaged
// via https://github.com/puppeteer/puppeteer/issues/2134#issuecomment-408221446
export function getPackagedPlaywrightExecPath(browser) {
  if (!browser) console.error("No browser name given.");

  function replaceAll(str, mapObj) {
    const re = new RegExp(Object.keys(mapObj).join("|"), "gi");

    return str.replace(re, function (matched) {
      return mapObj[matched.toLowerCase()];
    });
  }

  const mapObj = {
    playwright: "electron-playwright-browser-installer",
    "app.asar": "app.asar.unpacked",
  };

  // Generate the correct paths
  // console.log("Playwright module", !!playwright);
  const initialPath = playwright[browser].executablePath();
  const updatedPath = replaceAll(initialPath, mapObj);
  console.log(
    "Is the path the same as initially?",
    initialPath === updatedPath,
    `Changed to: ${updatedPath}`
  );

  return updatedPath;
}

// Export the default (Installer class)
// export default {
//   Installer,
//   getPackagedPlaywrightExecPath,
// };
