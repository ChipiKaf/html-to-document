const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packages = ['.', 'packages/core', 'packages/adapters/docx', 'packages/adapters/pdf'];

packages.forEach((dir) => {
  const changelog = path.join(dir, 'CHANGELOG.md');
  if (!fs.existsSync(changelog)) {
    return;
  }
  try {
    execSync(`npx conventional-changelog -p angular -i ${changelog} -s`, {
      stdio: 'inherit',
    });
    console.log(`Updated changelog for ${dir}`);
  } catch (err) {
    console.error(`Failed to update changelog for ${dir}`);
    process.exitCode = 1;
  }
});
