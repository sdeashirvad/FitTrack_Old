const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch workspace packages but exclude other artifacts that Metro doesn't need
config.watchFolders = [workspaceRoot];

config.resolver.blockList = [
  // Exclude all other artifacts (mockup-sandbox, api-server, etc.)
  new RegExp(`${escape(path.join(workspaceRoot, "artifacts", "mockup-sandbox"))}.*`),
  new RegExp(`${escape(path.join(workspaceRoot, "artifacts", "api-server"))}.*`),
  new RegExp(`${escape(path.join(workspaceRoot, "scripts"))}.*`),
];

function escape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = config;
