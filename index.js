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
const less = require('gulp-less')
const sass = require('gulp-sass')
const sassInheritance = require('gulp-sass-inheritance')
const plumber = require('gulp-plumber')
const autoprefixer = require('gulp-autoprefixer')
const cache = require('gulp-cached')

// Cache keys for gulp-cached
const CACHE_KEYS = {
    buildJS: 'build:js',
    minJS: 'min:js',
    buildLess: 'build:less',
    buildSass: 'build:sass',
    buildCSS: 'build:css',
    formatCSS: 'format:css'
}

const publicDir = './public'
const targetDir = path.join('./target', 'web', 'public', 'main')

function ffBuild({ vendor = {} } = {}) {
    Object.assign(
        {
            js: 'plugins',
            css: 'plugins'
        },
        vendor
    )
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
                                    browsers: ['last 3 version']
                                }
                            }
                        ]
                    ]
                })
            )
            .pipe(remember(CACHE_KEYS.buildJS))
            .pipe(multiDest([path.join(publicDir, 'javascripts'), path.join(targetDir, 'javascripts')]))
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
            .pipe(autoprefixer({ browsers: ['last 3 version'] }))
            .pipe(remember(CACHE_KEYS.buildCSS))
            .pipe(multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')]))
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
            .pipe(autoprefixer({ browsers: ['last 3 version'] }))
            .pipe(remember(CACHE_KEYS.buildLess))
            .pipe(multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')]))
    }

    /**
     * Build Sass files
     */
    function buildSass() {
        return gulp
            .src(['./assets/stylesheets/**/*.scss', `!./assets/stylesheets/${vendor.css}/**/*`])
            .pipe(plumber())
            .pipe(cache(CACHE_KEYS.buildSass))
            .pipe(sassInheritance({dir: './assets/stylesheets/'}))
            .pipe(sass())
            .pipe(autoprefixer({ browsers: ['last 3 version'] }))
            .pipe(remember(CACHE_KEYS.buildSass))
            .pipe(multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')])) 
    }

    function build() {
        return merge([buildJS(), buildCSS(), buildLess(), buildSass()])
    }

    /**
     * Format Stylesheets using prettier
     */
    // function formatCSS() {
    //     return gulp
    //         .src([
    //             './assets/stylesheets/**/*',
    //             '!./assets/stylesheets/**/*.less',
    //             '!./assets/stylesheets/**/*.scss',
    //             `!./assets/stylesheets/${vendor.css}/**/*`
    //         ])
    //         .pipe(plumber())
    //         .pipe(prettier())
    //         .pipe(gulp.dest('./dist'))
    // }

    /**
     * Format stylesheets & JS
     */
    // function format() {
    //     return merge([formatCSS()])
    // }

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
            .pipe(multiDest([path.join(publicDir, 'javascripts'), path.join(targetDir, 'javascripts')]))
    }

    /**
     * Minify CSS files in a IE 9 compatible manner using clean-css
     */
    function minifyCSS() {
        return gulp
            .src(['./public/stylesheets/**/*.css'])
            .pipe(plumber())
            .pipe(size({ title: 'CSS prior to minification' }))
            .pipe(cleanCSS({ compatibility: 'ie9' }))
            .pipe(size({ title: 'CSS post minification' }))
            .pipe(multiDest([path.join(publicDir, 'stylesheets'), path.join(targetDir, 'stylesheets')]))
    }

    /**
     * Minify image assets using imagemin
     */
    function minifyImages() {
        return gulp
            .src('./public/images/**/*')
            .pipe(plumber())
            .pipe(imageMin())
            .pipe(multiDest([path.join(publicDir, 'images'), path.join(targetDir, 'images')]))
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
            .pipe(multiDest([path.join(publicDir, 'javascripts', `${vendor.js}`), path.join(targetDir, 'javascripts', `${vendor.js}`)]))
    }

    /**
     *  Copy vendor CSS files to public
     */
    function copyVendorCSS() {
        return gulp
            .src(`./assets/stylesheets/${vendor.css}/**/*`)
            .pipe(multiDest([path.join(publicDir, 'stylesheets', `${vendor.css}`), path.join(targetDir, 'stylesheets', `${vendor.css}`)]))
    }

    /**
     * Copy over image assets
     */
    function copyImages() {
        return gulp.src('./assets/images/**')
            .pipe(multiDest([path.join(publicDir, 'images'), path.join(targetDir, 'images')]))
    }

    /**
     * Copy over font assets
     */
    function copyFonts() {
        return gulp.src('./assets/fonts/**')
            .pipe(multiDest([path.join(publicDir, 'fonts'), path.join(targetDir, 'fonts')]))
    }

    /**
     * Copy Images & vendor JS & CSS to public directory
     */
    function copy() {
        return merge([copyVendorJS(), copyVendorCSS(), copyImages(), copyFonts()])
    }

    /**
     * Clean public directory
     */
    gulp.task('clean', function() {
        console.log('Cleaning project...')
        return gulp.src([publicDir, targetDir], { read: false }).pipe(clean())
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

        gulp.watch('./assets/javascripts/**/*.js', function() {
            process.stdout.write('JS file changed. Building...')
            return buildJS().on('end', () => {
                process.stdout.write('Done! \n')
            })
        })

        gulp.watch(
            [
                './assets/stylesheets/**/*.less',
                './assets/stylesheets/**/*.css',
                './assets/stylesheets/**/*.scss'
            ],
            function() {
                process.stdout.write('Stylesheet file changed. Building...')
                return merge(buildCSS(), buildLess(), buildSass()).on('end', () => {
                    process.stdout.write('Done!\n')
                })
            }
        )

        gulp.watch(['./assets/images/**'], function() {
            process.stdout.write('Image file changed. Building...')
            return copyImages().on('end', () => {
                process.stdout.write('Done!\n')
            })
        })

        return merge(copy(), build())
    })
}

module.exports = ffBuild
