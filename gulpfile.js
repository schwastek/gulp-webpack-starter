const { src, dest, series, parallel, watch } = require('gulp');
const bs = require('browser-sync').create();
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const gulpif = require('gulp-if');
const del = require('del');
const yargs = require('yargs');
const webpack = require('webpack');

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// Load webpack configuration
const webpackConfig = require(PRODUCTION ? './webpack.prod.js' : './webpack.dev.js');
const webpackCompiler = webpack(webpackConfig);

function copy() {
  return src(['src/**/*', '!src/{scss,js}', '!src/{scss,js}/**/*'])
    .pipe(dest('dist/'));
}

async function clean() {
  await del('dist/');
}

function css() {

  // Filter to remove all false values from the array
  const plugins = [
    autoprefixer(),
    PRODUCTION && cssnano()
  ].filter(Boolean);

  return src('src/scss/app.scss')
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(dest('dist/css/'))
    .pipe(bs.stream());
}

function js(done) {
  webpackCompiler.run((err, stats) => {
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      return;
    }

    const info = stats.toJson();

    if (stats.hasErrors()) {
      console.error(info.errors);
    }

    if (stats.hasWarnings()) {
      console.warn(info.warnings);
    }

    console.log(stats.toString({colors: true}));

    // Done processing
    done();
  });
}

function server(done) {
  bs.init({
    server: {
        baseDir: 'dist/'
    }
  }, done);
}

function reload(done) {
  bs.reload();
  done();
}

function watching() {
  watch(['src/**/*', '!src/{scss,js}', '!src/{scss,js}/**/*'], {ignorePermissionErrors: true}, series(copy, reload));
  watch('src/scss/**/*.{scss,sass}', css);
  watch('src/js/**/*.js', series(js, reload));
}

exports.build = series(clean, parallel(copy, css, js));
exports.default = series(clean, parallel(copy, css, js), server, watching);
