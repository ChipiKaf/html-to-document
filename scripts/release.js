const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release.js <version>');
  process.exit(1);
}

function latestTag() {
  try {
    return execSync('git describe --tags --abbrev=0').toString().trim();
  } catch (e) {
    return null;
  }
}

function hasChangesSince(tag, dir) {
  if (!tag) return true;
  const diff = execSync(`git diff ${tag} HEAD -- ${dir}`).toString().trim();
  return diff.length > 0;
}

function getChangelogVersion(dir) {
  const changelog = path.join(dir, 'CHANGELOG.md');
  if (!fs.existsSync(changelog)) return null;
  const lines = fs.readFileSync(changelog, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^## \[(.+)\]/);
    if (m) return m[1];
  }
  return null;
}

function updateChangelog(dir, version) {
  const changelog = path.join(dir, 'CHANGELOG.md');
  if (!fs.existsSync(changelog)) return;
  const content = fs.readFileSync(changelog, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n## [${version}] - ${date}\n\n- Automated release\n`;
  const updated = content.replace(/^# Changelog/, `# Changelog${entry}`);
  fs.writeFileSync(changelog, updated, 'utf8');
}

function bumpPackage(dir, version) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

const tag = latestTag();
const packages = ['.', 'packages/core', 'packages/adapters/docx', 'packages/adapters/pdf', 'packages/html-to-document'];

packages.forEach((dir) => {
  if (!hasChangesSince(tag, dir)) {
    console.log(`No changes in ${dir}, skipping.`);
    return;
  }
  const found = getChangelogVersion(dir);
  if (found !== version) {
    console.error(`Changelog in ${dir} does not have entry for version ${version}`);
    process.exit(1);
  }
  bumpPackage(dir, version);
  updateChangelog(dir, version);
  console.log(`Updated ${dir} to version ${version}`);
});
