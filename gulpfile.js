const fs = require('fs');
const path = require('path');
const { src, dest, series, watch } = require('gulp');
const cleanCss = require('gulp-clean-css');
const terser = require('gulp-terser');
const sass = require('sass');

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
  writeRouteIndex('cadastro-users', 'users-register.html');
  writeRouteIndex('cadastro-usuarios', 'users-register.html');
  writeRouteIndex('perfil', 'perfil.html');
  writeRouteIndex('linktree', 'linktree.html');
  writeRouteIndex('logistica', 'logistica.html');
  writeRouteIndex('boas-praticas', 'boas-praticas.html');
  writeRouteIndex('estandes', 'estandes.html');
  writeRouteIndex('palco-1', 'questions-stage.html');
  writeRouteIndex('questions-palco-1', 'questions-stage.html');
  writeRouteIndex('perguntas-palco-1', 'questions-stage.html');
  writeRouteIndex('palco-2', 'questions-stage.html');
  writeRouteIndex('questions-palco-2', 'questions-stage.html');
  writeRouteIndex('perguntas-palco-2', 'questions-stage.html');
  writeRouteIndex('palco-3', 'questions-stage.html');
  writeRouteIndex('questions-palco-3', 'questions-stage.html');
  writeRouteIndex('perguntas-palco-3', 'questions-stage.html');
  writeRouteIndex('palco-4', 'questions-stage.html');
  writeRouteIndex('questions-palco-4', 'questions-stage.html');
  writeRouteIndex('perguntas-palco-4', 'questions-stage.html');
  writeRouteIndex('palco-5', 'questions-stage.html');
  writeRouteIndex('questions-palco-5', 'questions-stage.html');
  writeRouteIndex('perguntas-palco-5', 'questions-stage.html');
  writeRouteIndex('perguntas-palestra-1', 'questions-palestra-1.html');
  writeRouteIndex('questions-palestra-1', 'questions-palestra-1.html');
  writeRouteIndex('perguntas-palestra-2', 'questions-palestra-2.html');
  writeRouteIndex('questions-palestra-2', 'questions-palestra-2.html');
  writeRouteIndex('perguntas-palestra-3', 'questions-palestra-3.html');
  writeRouteIndex('questions-palestra-3', 'questions-palestra-3.html');
  writeRouteIndex('moderacao-perguntas', 'questions-moderation.html');
  writeRouteIndex('questions-moderation', 'questions-moderation.html');
  writeRouteIndex('question-moderation', 'questions-moderation.html');
  writeRouteIndex('perguntas-aprovadas', 'questions-approved.html');
  writeRouteIndex('questions-approved', 'questions-approved.html');
  writeRouteIndex('qrcode-presenca-palco', 'questions-session-qrcode.html');
  writeRouteIndex('questions-session-qrcode', 'questions-session-qrcode.html');
  writeRouteIndex('checkin-presenca-palco', 'questions-session-checkin.html');
  writeRouteIndex('questions-session-checkin', 'questions-session-checkin.html');
  writeRouteIndex('teste', 'perfil.html');
  writeRouteIndex('agenda', 'agenda.html');
  writeRouteIndex('feed', 'feed.html');
  writeRouteIndex('scanner', 'perfil.html');
  writeRootIndex();
  write404Page();
  console.log('Build estatico gerado em dist/ para Cloudflare Pages.');
  done();
}

function watchPages() {
  watch(['public/**/*', 'scss/**/*'], { cwd: projectRoot }, series(buildPages));
}

function compileScss() {
  const scssPath = path.join(projectRoot, 'scss', 'styles.scss');
  const cssPath = path.join(publicDir, 'styles.css');
  const result = sass.compile(scssPath, { style: 'expanded' });
  fs.writeFileSync(cssPath, result.css);
  return Promise.resolve();
}

const buildPages = series(cleanDist, compileScss, copyPublic, minifyStyles, minifyScripts, writePagesRoutes);

exports.clean = cleanDist;
exports['build-pages'] = buildPages;
exports.watch = watchPages;
exports.default = buildPages;