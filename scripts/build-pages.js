const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const distDir = path.join(projectRoot, 'dist');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(source, destination) {
  ensureDir(destination);

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
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
  const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./login/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magalu System</title>
</head>
<body>
  <p>Redirecionando para o login...</p>
</body>
</html>
`;

  fs.writeFileSync(rootIndexPath, content, 'utf8');
}

function write404Page() {
  const notFoundPath = path.join(distDir, '404.html');
  const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./login/">
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

fs.rmSync(distDir, { recursive: true, force: true });
copyDir(publicDir, distDir);
writeRouteIndex('login', 'login.html');
writeRouteIndex('teste', 'teste.html');
writeRouteIndex('agenda', 'agenda.html');
writeRootIndex();
write404Page();

console.log('Build do GitHub Pages gerado em dist/.');