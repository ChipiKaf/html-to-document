

const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const useLatest = process.env.USE_NPM_LATEST === "true";
pkg.dependencies["html-to-document"] = useLatest ? "latest" : "file:../";

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`html-to-document dependency set to: ${pkg.dependencies["html-to-document"]}`);