'use strict'

const gulp = require('gulp')
const babel = require('gulp-babel')
const size = require('gulp-size')
const buffer = require('vinyl-buffer')
const uglify = require('gulp-uglify')
const cleanCSS = require('gulp-clean-css')
const imageMin = require('gulp-imagemin')
const merge = require('event-stream').concat
const clean = require('gulp-clean')
const remember = require('gulp-remember')
const less = require('gulp-less')
const sass = require('gulp-sass')
const plumber = require('gulp-plumber')
const autoprefixer = require('gulp-autoprefixer')
const cache = require('gulp-cached')
const watch = require('gulp-watch')
const prettier = require('gulp-prettier')

// Cache keys for gulp-cached
const CACHE_KEYS = {
    buildJS: 'build:js',
    minJS: 'min:js',
    buildLess: 'build:less',
    buildSass: 'build:sass',
    buildCSS: 'build:css',
    formatCSS: 'format:css'
}

function ffBuild({ vendor = {} } = {}) {
    Object.assign(vendor, {
        js: 'plugins',
        css: 'plugins'
    })
    // Build assets

    function buildJS() {
        return gulp
            .src(['./assets/javascripts/**/*.js', `!./assets/javascripts/${vendor.js}/**/*`])
            .pipe(plumber())
            .pipe(cache(CACHE_KEYS.buildJS))
            .pipe(
                babel({
                    plugins: ['transform-react-jsx'],
                    presets: [
                        [
                            'env',
                            {
                                targets: {
                                    browsers: ['ie >= 9']
                                }
                            }
                        ]
                    ]
                })
            )
            .pipe(remember(CACHE_KEYS.buildJS))
            .pipe(gulp.dest('public/javascripts'))
    }

    /**
     * Build CSS files by autoprefixing
     */
    function buildCSS() {
        return gulp
            .src([
                './assets/stylesheets/**/*.css',
                '!./assets/stylesheets/**/*.less',
                '!./assets/stylesheets/**/*.scss',
                `!./assets/stylesheets/${vendor.css}/**/*`
            ])
            .pipe(plumber())
            .pipe(cache(CACHE_KEYS.buildCSS))
            .pipe(autoprefixer({ browsers: ['ie >= 9'] }))
            .pipe(remember(CACHE_KEYS.buildCSS))
            .pipe(gulp.dest('./public/stylesheets'))
    }

    /**
     * Build Less files
     */
    function buildLess() {
        return gulp
            .src(['./assets/stylesheets/**/*.less', `!./assets/stylesheets/${vendor.css}/**/*`])
            .pipe(plumber())
            .pipe(cache(CACHE_KEYS.buildLess))
            .pipe(less())
            .pipe(autoprefixer({ browsers: ['ie >= 9'] }))
            .pipe(remember(CACHE_KEYS.buildLess))
            .pipe(gulp.dest('./public/stylesheets'))
    }

    /**
     * Build Sass files
     */
    function buildSass() {
        return gulp
            .src(['./assets/stylesheets/**/*.scss', `!./assets/stylesheets/${vendor.css}/**/*`])
            .pipe(plumber())
            .pipe(cache(CACHE_KEYS.buildSass))
            .pipe(sass())
            .pipe(autoprefixer({ browsers: ['ie >= 9'] }))
            .pipe(remember(CACHE_KEYS.buildSass))
            .pipe(gulp.dest('./public/stylesheets'))
    }

    function build() {
        return merge([buildJS(), buildCSS(), buildLess(), buildSass()])
    }

    /**
     * Format Stylesheets using prettier
     */
    function formatCSS() {
        return gulp
            .src([
                './assets/stylesheets/**/*',
                '!./assets/stylesheets/**/*.less',
                '!./assets/stylesheets/**/*.scss',
                `!./assets/stylesheets/${vendor.css}/**/*`
            ])
            .pipe(plumber())
            .pipe(prettier())
            .pipe(gulp.dest('./dist'))
    }

    /**
     * Format stylesheets & JS
     */
    function format() {
        return merge([formatCSS()])
    }

    /**
     * Minify JS assets using uglify
     */
    function minifyJS() {
        return gulp
            .src(['public/javascripts/**/*.js', '!./public/javascripts/plugins/**/*'])
            .pipe(plumber())
            .pipe(size({ title: 'JS before minification' }))
            .pipe(buffer())
            .pipe(uglify())
            .pipe(size({ title: 'JS after minification' }))
            .pipe(gulp.dest('public/javascripts'))
    }

    /**
     * Minify CSS files in a IE 9 compatible manner using clean-css
     */
    function minifyCSS() {
        return gulp
            .src(['./public/stylesheets/**/*.css'])
            .pipe(plumber())
            .pipe(size({ title: 'CSS before minification' }))
            .pipe(cleanCSS({ compatibility: 'ie9' }))
            .pipe(size({ title: 'CSS after minification' }))
            .pipe(gulp.dest('./public/stylesheets'))
    }

    /**
     * Minify image assets using imagemin
     */
    function minifyImages() {
        return gulp
            .src('./public/images/**/*')
            .pipe(plumber())
            .pipe(imageMin())
            .pipe(gulp.dest('./public/images'))
    }

    /**
     * Merge JS, CSS & Image minification
     */
    function minify() {
        return merge([minifyImages(), minifyJS(), minifyCSS()])
    }

    /**
     * Copy vendor JS files to public
     */
    function copyVendorJS() {
        return gulp
            .src(`./assets/javascripts/${vendor.js}/**/*`)
            .pipe(gulp.dest(`./public/javascripts/${vendor.js}`))
    }

    function copyVendorCSS() {
        return gulp
            .src(`./assets/stylesheets/${vendor.css}/**/*`)
            .pipe(gulp.dest(`./public/stylesheets/${vendor.css}`))
    }

    /**
     * Copy over image assets
     */
    function copyImages() {
        return gulp.src('./assets/images/**').pipe(gulp.dest('./public/images'))
    }

    /**
     * Copy Images & vendor JS & CSS to public directory
     */
    function copy() {
        return merge([copyVendorJS(), copyVendorCSS(), copyImages()])
    }

    /**
     * Clean public directory
     */
    gulp.task('clean', function() {
        console.log('Cleaning project...')
        return gulp.src('./public', { read: false }).pipe(clean())
    })

    /**
     * Create production build in public folder
     */
    gulp.task('build', ['clean'], function() {
        console.log('Building for production...')
        return merge(copy(), build()).on('end', minify)
    })

    gulp.task('default', ['clean'], function() {
        // Setup watching of JS, CSS & Images

        watch('./assets/javascripts/**/*.js', function() {
            console.log('JS file changed. Building...')
            return buildJS()
        })

        watch(
            [
                './assets/stylesheets/**/*.less',
                './assets/stylesheets/**/*.css',
                './assets/stylesheets/**/*.scss'
            ],
            function() {
                console.log('Stylesheet file changed. Building...')
                return merge(buildCSS(), buildLess(), buildSass())
            }
        )

        watch(['./assets/images/**'], function() {
            console.log('Image file changed. Building...')
            return copyImages()
        })

        return merge(copy(), build())
    })
}

module.exports = ffBuild
