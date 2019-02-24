const gulp = require('gulp')
const exec = require('child_process').exec

// 1. Open the app
//  Remove all user data
//  Reload

// 2. Start recording
//  Create Basic 3 screens
//  Go to demo website (medium.com)
//  Click sync, scroll down
//  Show screenshot functionality

// 3. Save video...wait to finish
// 4. Convert video to GIF

const MOV_FILE = 'screenshot.mov'

// Convert input video to a GIF
// gulp.task('makeGIF:palette', (done) => {
//   exec(`ffmpeg -i ${MOV_FILE} -y -vf fps=15,scale=360:-1:flags=lanczos,palettegen palette.png`, function (err) {
//     if (err) return false
//     done(err)
//   })
// })

// gulp.task('makeGIF:convert', (done) => {
//   exec(`ffmpeg -i palette.png -y -filter_complex "fps=15,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse" screenshot.gif`, function (err) {
//     if (err) {
//       console.log(err)
//       return false
//     }
//     done(err)
//   })
// })

gulp.task('makeVID', (done) => {
  exec(`ffmpeg -i screenshot.mov -movflags faststart -pix_fmt yuv420p -vf "scale=720:-1" screenshot.mp4`, function (err) {
    if (err) {
      console.log(err)
      return false
    }
    done(err)
  })
})

gulp.task('makeGIF', gulp.series(
  // 'makeGIF:palette',
  // 'makeGIF:convert'
  'makeVID'
))

// ffmpeg -i ./screenshot.mov -vf scale=720:-1:flags=lanczos,palettegen palette.png -r 10 -f gif - | gifsicle --optimize=1 --delay=3 > ./screenshot.gif
