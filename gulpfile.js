const fs = require('fs');
const path = require('path');
const { src, dest, series, watch } = require('gulp');
const cleanCss = require('gulp-clean-css');
const terser = require('gulp-terser');

const projectRoot = __dirname;
const publicDir = path.join(projectRoot, 'public');
const distDir = path.join(projectRoot, 'dist');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDist(done) {
  fs.rmSync(distDir, { recursive: true, force: true });
  done();
}

function copyPublic() {
  return src('public/**/*', { cwd: projectRoot, encoding: false })
    .pipe(dest('dist', { cwd: projectRoot }));
}

function minifyStyles() {
  return src('dist/**/*.css', { cwd: projectRoot, allowEmpty: true })
    .pipe(cleanCss())
    .pipe(dest('dist', { cwd: projectRoot }));
}

function minifyScripts() {
  return src('dist/**/*.js', { cwd: projectRoot, allowEmpty: true })
    .pipe(terser())
    .pipe(dest('dist', { cwd: projectRoot }));
}

function writeRouteIndex(routeName, sourceFileName) {
  const sourcePath = path.join(publicDir, sourceFileName);
  const destinationDir = path.join(distDir, routeName);
  const destinationPath = path.join(destinationDir, 'index.html');

  ensureDir(destinationDir);
  fs.copyFileSync(sourcePath, destinationPath);
}

function writeRootIndex() {
  const rootIndexPath = path.join(distDir, 'index.html');
  const sourcePath = path.join(publicDir, 'index.html');

  fs.copyFileSync(sourcePath, rootIndexPath);
}

function write404Page() {
  const notFoundPath = path.join(distDir, '404.html');
  const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magalu System</title>
</head>
<body>
  <p>Pagina nao encontrada. Redirecionando...</p>
</body>
</html>
`;

  fs.writeFileSync(notFoundPath, content, 'utf8');
}

function writePagesRoutes(done) {
  writeRouteIndex('login', 'index.html');
  writeRouteIndex('primeiro-acesso', 'first-access.html');
  writeRouteIndex('perfil', 'perfil.html');
  writeRouteIndex('teste', 'perfil.html');
  writeRouteIndex('agenda', 'agenda.html');
  writeRouteIndex('feed', 'feed.html');
  writeRouteIndex('scanner', 'perfil.html');
  writeRootIndex();
  write404Page();
  console.log('Build do GitHub Pages gerado em dist/.');
  done();
}

function watchPages() {
  watch('public/**/*', { cwd: projectRoot }, series(buildPages));
}

const buildPages = series(cleanDist, copyPublic, minifyStyles, minifyScripts, writePagesRoutes);

exports.clean = cleanDist;
exports['build-pages'] = buildPages;
exports.watch = watchPages;
exports.default = buildPages;