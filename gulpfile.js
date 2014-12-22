var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  vendor: [
       'bower_components/lodash/dist/lodash.min.js',
      ],
  src: 'src/nachoBackend.js'
};

gulp.task('default', function() {
  var src = paths.vendor.concat(paths.src);
  return gulp.src(src)
    .pipe(concat('nachoBackend.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(concat('nachoBackend.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));
});
