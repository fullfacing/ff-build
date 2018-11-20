const gulp = require('gulp')
const ffBuild = require('../')

const {runBuild, runClean, runDefault}= ffBuild({env: {
    name: 'Tiaan du Plessis'
}})

gulp.task('build', gulp.series(runClean, runBuild))
gulp.task('default', gulp.series(runClean, runDefault))