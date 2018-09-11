'use strict'

const gulp = require('gulp')
const multiDest = require('gulp-multi-dest')
const babel = require('gulp-babel')
const path = require('path')
const size = require('gulp-size')
const buffer = require('vinyl-buffer')
const uglify = require('gulp-uglify')
const cleanCSS = require('gulp-clean-css')
const imageMin = require('gulp-imagemin')
const merge = require('event-stream').concat
const clean = require('gulp-clean')
const remember = require('gulp-remember')
const sass = require('gulp-sass')
const sassInheritance = require('gulp-sass-inheritance')
const plumber = require('gulp-plumber')
const autoprefixer = require('autoprefixer')
const cache = require('gulp-cached')
const watch = require('gulp-watch')
const postcss = require('gulp-postcss')
const postcssFixes = require('postcss-fixes')

// Cache keys for gulp-cached
const CACHE_KEYS = {
  buildJS: 'build:js',
  minJS: 'min:js',
  buildSass: 'build:sass',
  buildCSS: 'build:css',
  formatCSS: 'format:css'
}

const supportedBrowsers = ['> 1%', 'IE 10'] // https://github.com/browserslist/browserslist

function ffBuild (config = {}) {
  config = Object.assign({
    root: '.',
    vendor: {
      js: 'plugins',
      css: 'plugins'
    }
  }, config)

  const publicDir = path.join(config.root, 'public')
  const targetDir = path.join(config.root, 'target', 'web', 'public', 'main')

  function buildJS () {
    const sources = [`${config.root}/assets/javascripts/**/*.js`, `!${config.root}/assets/javascripts/${config.vendor.js}/**/*`]
    const babelConfig = {
      presets: [
        'flow',
        [
          'env',
          {
            'targets': {
              'browsers': supportedBrowsers
            }
          }
        ]
      ],
      'plugins': ['transform-remove-console'],
      'comments': false
    }

    const dest = multiDest([path.join(publicDir, 'javascripts'), path.join(targetDir, 'javascripts')])

    return gulp
      .src(sources)
      .pipe(plumber())
      .pipe(cache(CACHE_KEYS.buildJS))
      .pipe(babel(babelConfig))
      .pipe(remember(CACHE_KEYS.buildJS))
      .pipe(dest)
  }

  /**
     * Build CSS files by autoprefixing
     */
  function buildCSS () {
    const sources = [
      `${config.root}/assets/stylesheets/**/*.css`,
      `!${config.root}/assets/stylesheets/**/*.scss`,
      `!${config.root}/assets/stylesheets/${config.vendor.css}/**/*`
    ]
    const dest = multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')])

    return gulp
      .src(sources)
      .pipe(plumber())
      .pipe(cache(CACHE_KEYS.buildCSS))
      .pipe(postcss([
        postcssFixes(),
        autoprefixer({ browsers: supportedBrowsers })
      ]))
      .pipe(remember(CACHE_KEYS.buildCSS))
      .pipe(dest)
  }

  /**
     * Build Sass files
     */
  function buildSass () {
    const sources = [
      `${config.root}/assets/stylesheets/**/*.scss`,
      `!${config.root}/assets/stylesheets/${config.vendor.css}/**/*`
    ]
    const dest = multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')])

    return gulp
      .src(sources)
      .pipe(plumber())
      .pipe(cache(CACHE_KEYS.buildSass))
      .pipe(sassInheritance({ dir: './assets/stylesheets/' }))
      .pipe(sass())
      .pipe(postcss([
        postcssFixes(),
        autoprefixer({ browsers: supportedBrowsers })
      ]))
      .pipe(remember(CACHE_KEYS.buildSass))
      .pipe(dest)
  }

  function build () {
    return merge([buildJS(), buildCSS(), buildSass()])
  }

  /**
     * Minify JS assets using uglify
     */
  function minifyJS () {
    const sources = [`${publicDir}/javascripts/**/*.js`, `!${publicDir}/javascripts/plugins/**/*`]
    const dest = [path.join(publicDir, 'javascripts'), path.join(targetDir, 'javascripts')]

    return gulp
      .src(sources)
      .pipe(plumber())
      .pipe(size({ title: 'js:before' }))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(size({ title: 'js:after' }))
      .pipe(multiDest(dest))
  }

  /**
     * Minify CSS files in a IE 9 compatible manner using clean-css
     */
  function minifyCSS () {
    const sources = [`${publicDir}/stylesheets/**/*.css`]
    const cleanCSSConfig = { compatibility: 'ie9' }
    const dest = multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')])

    return gulp
      .src(sources)
      .pipe(plumber())
      .pipe(size({ title: 'css:before' }))
      .pipe(cleanCSS(cleanCSSConfig))
      .pipe(size({ title: 'css:after' }))
      .pipe(dest)
  }

  /**
     * Minify image assets using imagemin
     */
  function minifyImages () {
    const source = `${publicDir}/images/**/*`
    const dest = multiDest([path.join(publicDir, 'images'), path.join(targetDir, 'images')])

    return gulp
      .src(source)
      .pipe(plumber())
      .pipe(imageMin([
        imageMin.gifsicle({ interlaced: true, optimizationLevel: 2 }),
        imageMin.jpegtran({ progressive: true }),
        imageMin.optipng({ optimizationLevel: 5 }),
        imageMin.svgo({
          plugins: [
            { removeViewBox: true },
            { cleanupIDs: false }
          ]
        })
      ]))
      .pipe(dest)
  }

  /**
     * Merge JS, CSS & Image minification
     */
  function minify () {
    return merge([minifyImages(), minifyJS(), minifyCSS()])
  }

  /**
     * Copy vendor JS files to public
     */
  function copyVendorJS () {
    const source = `${config.root}/assets/javascripts/${config.vendor.js}/**/*`
    const dest = multiDest([path.join(publicDir, 'javascripts', `${config.vendor.js}`), path.join(targetDir, 'javascripts', `${config.vendor.js}`)])
    return gulp
      .src(source)
      .pipe(dest)
  }

  /**
     *  Copy vendor CSS files to public
     */
  function copyVendorCSS () {
    const source = `${config.root}/assets/stylesheets/${config.vendor.css}/**/*`
    const dest = multiDest([path.join(publicDir, 'stylesheets', `${config.vendor.css}`), path.join(targetDir, 'stylesheets', `${config.vendor.css}`)])
    return gulp
      .src(source)
      .pipe(dest)
  }

  /**
     * Copy over image assets
     */
  function copyImages () {
    const source = `${config.root}/assets/images/**`
    const dest = multiDest([path.join(publicDir, 'images'), path.join(targetDir, 'images')])
    return gulp.src(source, { allowEmpty: true })
      .pipe(dest)
  }

  /**
     * Copy over font assets
     */
  function copyFonts () {
    const source = `${config.root}/assets/fonts/**`
    const dest = multiDest([path.join(publicDir, 'fonts'), path.join(targetDir, 'fonts')])
    return gulp.src(source, { allowEmpty: true })
      .pipe(dest)
  }

  /**
     * Copy over font assets
     */
  function copyCSSFonts () {
    const source = `${config.root}/assets/stylesheets/fonts/**`
    const dest = multiDest([path.join(publicDir, 'stylesheets', 'fonts'), path.join(targetDir, 'fonts')])
    return gulp.src(source, { allowEmpty: true })
      .pipe(dest)
  }

  /**
     * Copy Images & vendor JS & CSS to public directory
     */
  function copy () {
    return merge([copyVendorJS(), copyVendorCSS(), copyImages(), copyFonts(), copyCSSFonts()])
  }

  function runClean () {
    console.log('cleaning...')
    return gulp.src([publicDir, targetDir], { read: false, allowEmpty: true }).pipe(clean())
  }

  function runBuild (done) {
    return merge(copy(), build()).on('end', () => {
      minify().on('end', done)
    })
  }

  function runDefault () {
    const watchDirs = {
      js: `${config.root}/assets/javascripts/**/*.js`,
      css: [
        `${config.root}/assets/stylesheets/**/*.css`,
        `${config.root}/assets/stylesheets/**/*.scss`
      ],
      images: [`${config.root}/assets/images/**`],
      fonts: [`${config.root}/assets/stylesheets/fonts/**`, `${config.root}/assets/fonts/**`]
    }

    watch(watchDirs.js, function (done) {
      process.stdout.write('js building...')
      return merge(buildJS()).on('end', () => {
        process.stdout.write('done \n')
      })
    })

    watch(watchDirs.css, function cssBuild () {
      process.stdout.write('css/scss building...')
      return merge(buildCSS(), buildSass()).on('end', () => {
        process.stdout.write('done\n')
      })
    }
    )

    watch(watchDirs.images, function imageBuild () {
      process.stdout.write('images changed. copying...')
      return merge(copyImages()).on('end', () => {
        process.stdout.write('done\n')
      })
    })

    watch(watchDirs.fonts, function fontBuild () {
      process.stdout.write('fonts changed. copying...')
      return merge(copyFonts(), copyCSSFonts()).on('end', () => {
        process.stdout.write('done\n')
      })
    })

    return merge(copy(), build())
  }

  // gulp.task('build', gulp.series(runClean, runBuild))
  // gulp.task('default', gulp.series(runClean, runDefault))

  return {
    runClean,
    runBuild,
    runDefault
  }
}

module.exports = ffBuild
