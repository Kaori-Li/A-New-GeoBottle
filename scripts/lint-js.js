#!/usr/bin/env node
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const parser = require(require.resolve('@babel/parser', { paths: [process.cwd()] }));

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node scripts/lint-js.js <dir|file> [dir|file...]');
  process.exit(1);
}

const collectJsFiles = (entryPath, files = []) => {
  const st = statSync(entryPath);

  if (st.isFile()) {
    if (entryPath.endsWith('.js')) {
      files.push(entryPath);
    }
    return files;
  }

  const entries = readdirSync(entryPath);
  entries.forEach((entry) => {
    const full = join(entryPath, entry);
    const entryStat = statSync(full);

    if (entryStat.isDirectory()) {
      if (['node_modules', '.git', 'android', 'ios'].includes(entry)) {
        return;
      }
      collectJsFiles(full, files);
      return;
    }

    if (full.endsWith('.js')) {
      files.push(full);
    }
  });

  return files;
};

const allFiles = targets.flatMap((target) => collectJsFiles(target));
allFiles.forEach((file) => {
  const source = readFileSync(file, 'utf8');
  parser.parse(source, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  });
});

console.log(`Syntax parse passed for ${allFiles.length} files.`);
