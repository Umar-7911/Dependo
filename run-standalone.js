// run-standalone.js
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Resolve target directory to analyze from command line arguments, default to current workspace directory
const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname);

console.log(`=========================================`);
console.log(`Starting Dependo Standalone Server`);
console.log(`Analyzing directory: ${targetDir}`);
console.log(`=========================================`);

function findFilesRecursive(dir, allFiles = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      try {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && !file.startsWith('.')) {
            findFilesRecursive(fullPath, allFiles);
          }
        } else {
          const ext = path.extname(file);
          if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            allFiles.push({ fsPath: fullPath });
          }
        }
      } catch (e) {
        // Skip inaccessible files/folders
      }
    }
  } catch (err) {
    // Skip inaccessible directories
  }
  return allFiles;
}

// Mock the 'vscode' module using Node's require cache interception
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'vscode') {
    return {
      workspace: {
        workspaceFolders: [
          {
            uri: {
              fsPath: targetDir,
            },
          },
        ],
        findFiles: async (include, exclude) => {
          console.log(`[mock-vscode] findFiles query received.`);
          return findFilesRecursive(targetDir);
        },
      },
      env: {
        openExternal: async (uri) => {
          console.log(`[mock-vscode] openExternal called with: ${uri}`);
          return true;
        },
      },
      Uri: {
        parse: (str) => ({
          toString: () => str,
          fsPath: str,
        }),
      },
      commands: {
        registerCommand: (command, callback) => {
          return { dispose: () => {} };
        },
      },
      window: {
        showInformationMessage: async (msg) => console.log(`[VS Code Info]: ${msg}`),
        showErrorMessage: async (msg) => console.error(`[VS Code Error]: ${msg}`),
        withProgress: async (options, task) => {
          const progress = {
            report: (value) => console.log(`[Progress]: ${value.message}`),
          };
          return task(progress);
        },
        ProgressLocation: {
          Notification: 15,
        },
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

// Require the compiled extension bundle.
// This will trigger require('./server') inside the bundle, launching the Express server on port 3001.
try {
  require('./dist/extension.js');
} catch (err) {
  console.error("Failed to load compiled extension:", err);
}
