const gulp = require('gulp')
const replace = require('gulp-replace')
const inquirer = require('inquirer')
const exec = require('child_process').exec
const chalk = require('chalk')
const release = require('gulp-github-release')
const notify = require('gulp-notify')
const opn = require('opn')

// PROCESS
// Ask about the version
// Help out with bumping (optional) + creating a changelog
// Build Mac, Windows + sign (MacOS) using Electron-Builder
// Draft a release on Github, and upload the Mac + Windows files
// Clean up the /build folder

// Update process.env based on .env file (in root directory)
require('dotenv').config()

// Import configuration settings
const CONFIG = require('../config.js')

// Get current app version
const CURRENT_APP_VERSION = require('../../package.json').version
let NEXT_APP_VERSION

// Changelog variable
let CHANGELOG
let COMPARE_VERSION
let PATH_TO_MAC_ZIP

// Confirm version number
gulp.task('version-app:prompt-version', function (done) {
  inquirer.prompt([{
    type: 'input',
    name: 'version',
    message: 'What release version is this? (Currently ' + CURRENT_APP_VERSION + '):'
  }])
    .then(function (res) {
      if (res.version) {
        NEXT_APP_VERSION = res.version
        console.log(chalk.yellow(`Version updated to ${NEXT_APP_VERSION} 👍`))
      } else {
        NEXT_APP_VERSION = CURRENT_APP_VERSION
        console.log(chalk.yellow(`Version: ${NEXT_APP_VERSION}`))
      }

      // Update the final ZIP path with the version
      PATH_TO_MAC_ZIP = 'build/Reflex-' + NEXT_APP_VERSION + '.dmg'

      done()
    })
})

// Bumps the version number
// `src/package.json` and `dist/package.json`
gulp.task('version-app:version', function () {
  return gulp.src('./package.json', {
    base: './'
  })
    .pipe(replace(CURRENT_APP_VERSION, NEXT_APP_VERSION))
    .pipe(gulp.dest('./'))
})

// Choose what version you'd like to compare to
// This will create a link viewable in Github
// Defaults to master branch
gulp.task('version-app:prompt-version-diff', function (done) {
  inquirer.prompt([{
    type: 'input',
    name: 'version',
    message: `Branch/Git tag to compare to ${NEXT_APP_VERSION}: `
  }])
    .then(function (res) {
      if (res.version) {
        // Successful comparison to x version
        COMPARE_VERSION = res.version
        console.log(chalk.yellow(`Got it, will compare changes in ${COMPARE_VERSION} to ${NEXT_APP_VERSION} 👍`))
      } else {
        // Nothing chosen, default to master
        COMPARE_VERSION = 'master'
        console.log(chalk.yellow(`Comparing changes in ${COMPARE_VERSION} to master`))
      }
      done()
    })
})

// Creates a changelog from Git log
// Compares the commits from branch A that are not in branch B
// Then stores it to a variable that can later be used for a
// git log origin/branch-a..origin/branch-b --abbrev-commit --pretty=oneline
gulp.task('version-app:changelog', function (cb) {
  // As long as the new version isn't comparing to master...
  // Prepend with a "v" ("v1.0.0") instead of just "1.0.0"
  if (COMPARE_VERSION.includes('master') == false) {
    COMPARE_VERSION = 'v' + COMPARE_VERSION
    NEXT_APP_VERSION = 'v' + NEXT_APP_VERSION
  }

  exec(`git log ${COMPARE_VERSION}.. --abbrev-commit --pretty=oneline`, function (err, stdout, stderr) {
    // CHANGELOG = stdout
    CHANGELOG = `\n\n [View all changes since ${COMPARE_VERSION}](../../compare/${COMPARE_VERSION}..${NEXT_APP_VERSION})`
    console.log(chalk.yellow('Changelog:\n' + CHANGELOG))
    cb(err)
  })
})

// Clean the `build` folder
gulp.task('build-app:clean', (done) => {
  exec(`npm run build:clean`, function (err, stdout, stderr) {
    if (err) return false
    done()
  })
})

gulp.task('build-app:main', (done) => {
  exec(`npm run build`, function (err, stdout, stderr) {
    if (err) return false
    done()
  })
})

// Creates a draft release on Github
// 1. Open the file: `.env` (root directory of this project)
// 2. You can create a Github token here: https://github.com/settings/tokens
// 3. Add: `GITHUB_TOKEN=replace_with_your_token`
// 4. Save the file
gulp.task('deploy-app:draft-release', function () {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
  return gulp.src(PATH_TO_MAC_ZIP)
    .pipe(release({
      owner: 'nwittwer',
      token: GITHUB_TOKEN, // Did you set already add your Github token in a .env file?
      tag: NEXT_APP_VERSION, // format: v0.0.0
      draft: true, // draft or public
      prerelease: false,
      manifest: require('../../package.json'), // package.json from which default values will be extracted if they're missing
      notes: CHANGELOG
    }))
    .pipe(notify({
      title: '🎉 Shift ' + NEXT_APP_VERSION + ' release draft created!',
      message: 'Opening in browser...'
    }))
})

// Opens the Github Releases page
gulp.task('deploy-app:open-release-in-browser', function (done) {
  opn('https://github.com/nwittwer/shift/releases')
  done()
})

// Build task
gulp.task('build-app', gulp.series(
  'build-app:clean',
  'build-app:main'
))

// Versioning tasks
gulp.task('version-app', gulp.series(
  'version-app:prompt-version',
  'version-app:version',
  'version-app:prompt-version-diff',
  'version-app:changelog'
))

// Deploy tasks
// TODO: Split this into another file? How to keep the variable values across files?
gulp.task('deploy-app', gulp.series(
  'deploy-app:draft-release',
  'deploy-app:open-release-in-browser'
))
