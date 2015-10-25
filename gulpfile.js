'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var header = require('gulp-header');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var zip = require('gulp-zip');
var del = require('del');

var meta = require('./package.json');

//
// library tasks
//

function buildBrowserDist(envName) {
    var shouldMinify = envName === 'production';
    var shouldAddSourceMapComment = envName === 'development';

    return browserify('./index.js', {debug: true, standalone: 'CanvasLongShadow'}).bundle()
        .pipe(source('canvas-long-shadow' + (shouldMinify ? '.min' : '') + '.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true, debug: shouldAddSourceMapComment}))
            .pipe(header([
                '// ${meta.name} v${meta.version}',
                '// (c) 2015 ${meta.author}',
                '// ${meta.homepage}',
                '// ${meta.license} license',
            ].join('\n') + '\n', {meta: meta}))
            .pipe(shouldMinify ? uglify({preserveComments: 'license'}) : gutil.noop())
        .pipe(sourcemaps.write('./', {addComment: shouldAddSourceMapComment}))
        .pipe(gulp.dest('./dist/'));
}

gulp.task('clean', function () {
    return del(['dist/']);
});

gulp.task('browser-dev', function () {
    return buildBrowserDist('development');
});

gulp.task('browser-prod', function () {
    return buildBrowserDist('production');
});

gulp.task('build', ['clean', 'browser-dev', 'browser-prod'], function () {
    return gulp.src([
            'dist/**',
            'demo/**',
            'README.md'
        ], {base: '.'})
        .pipe(zip('canvas-long-shadow-v' + meta.version + '.zip'))
        .pipe(gulp.dest('dist/'));
});

//
// gh-pages tasks
//

gulp.task('clean-gh-pages', function () {
    return del(['dist/gh-pages/']);
});

gulp.task('gh-pages', ['clean-gh-pages', 'browser-prod'], function () {
    return gulp.src([
            'dist/*.min.js',
            'demo-src/*'
        ])
        .pipe(gulp.dest('dist/gh-pages/'));
});

//
// meta tasks
//

gulp.task('build-all', ['build', 'gh-pages']);
gulp.task('clean-all', ['clean', 'clean-gh-pages']);

gulp.task('default', ['build-all']);
