

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkgPath = path.resolve(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const useLatest = process.env.USE_NPM_LATEST === "true";
const version = useLatest ? "html-to-document@latest" : "../packages/html-to-document";
const versionPdf = useLatest ? "html-to-document-adapter-pdf@latest" : "../packages/adapters/pdf";
// The PDF deconverter package is not yet published, so always use the local
// package even when USE_NPM_LATEST is set.
const versionPdfDeconv = "../packages/deconverters/pdf";

try {
  execSync(`npm install ${version} --no-save`, { stdio: "inherit" });
  console.log(`✅ Installed html-to-document: ${version}`);
} catch (error) {
  console.error(`❌ Failed to install html-to-document: ${version}`);
  process.exit(1);
}

try {
  execSync(`npm install ${versionPdf} --no-save`, { stdio: "inherit" });
  console.log(`✅ Installed html-to-document-adapter-pdf: ${versionPdf}`);
} catch (error) {
  console.error(`❌ Failed to install html-to-document-adapter-pdf: ${versionPdf}`);
  process.exit(1);
}

try {
  execSync(`npm install ${versionPdfDeconv} --no-save`, { stdio: "inherit" });
  console.log(`✅ Installed html-to-document-deconverter-pdf: ${versionPdfDeconv}`);
} catch (error) {
  console.error(`❌ Failed to install html-to-document-deconverter-pdf: ${versionPdfDeconv}`);
  process.exit(1);
}
