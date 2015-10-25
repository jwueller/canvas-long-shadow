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

gulp.task('clean', function () {
    return del([
        'dist/'
    ]);
});

gulp.task('browser-dist', function () {
    var isProd = gutil.env.production;

    return browserify('./index.js', {debug: true, standalone: 'CanvasLongShadow'}).bundle()
        .pipe(source('canvas-long-shadow' + (isProd ? '.min' : '') + '.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true, debug: !isProd}))
            .pipe(header([
                '// ${meta.name} v${meta.version}',
                '// (c) 2015 ${meta.author}',
                '// ${meta.homepage}',
                '// ${meta.license} license',
            ].join('\n') + '\n', {meta: meta}))
            .pipe(isProd ? uglify({preserveComments: 'license'}) : gutil.noop())
        .pipe(sourcemaps.write('./', {addComment: !isProd}))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('package-browser-dist', ['browser-dist'], function () {
    return gulp.src([
            'dist/**',
            'demo/**',
            'README.md',
        ], {base: '.'})
        .pipe(zip('canvas-long-shadow-v' + meta.version + '.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('default', gutil.env.production ? ['package-browser-dist'] : ['browser-dist']);
