var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  src: 'src/facade.js'
};

gulp.task('default', function() {
  return gulp.src(paths.src)
    .pipe(concat('facade.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(concat('facade.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));
});
