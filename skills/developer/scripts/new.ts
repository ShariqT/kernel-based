#!/usr/bin/env -S npx tsx
/**
 * Scaffolds the folder/file structure for a TypeScript kernel library.
 *
 * Counterpart to scripts/new.py (Python) and scripts/new.go (Go). Instead of a
 * Python package or a Go module, this produces an idiomatic TypeScript package:
 *
 *   <lib>/
 *     package.json
 *     tsconfig.json
 *     src/
 *       kernel.ts          # SysCommand, ExitCode, Exit, Process, Kernel
 *       processes.ts       # System Processes
 *       implementations.ts # System Interfaces (facades)
 *       index.ts           # entrypoint: wires maps + bootstrap()
 *     tests/
 *       kernel.test.ts
 *     specs/
 *     README.md
 *     .gitignore
 *
 * Usage:
 *
 *   npx tsx scripts/new.ts <library_name>
 *   # or, on Node >= 23.6 which runs TypeScript natively:
 *   node scripts/new.ts <library_name>
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// kernelCode is the kernel module: the TypeScript translation of files/kernel.py.
const kernelCode = `export enum SysCommand {
  TEST = 1,
}

export enum ExitCode {
  GOOD = 0,
  ERROR = 1,
}

// Exit is the value every Process returns. data carries arbitrary keyword-style
// results; the "msg" key is always expected to be present.
export class Exit {
  code: ExitCode;
  data: Record<string, unknown>;

  constructor(code: ExitCode, data: Record<string, unknown> = {}) {
    this.code = code;
    this.data = data;
  }

  toString(): string {
    return "Exit Code is " + this.code + " and data is " + JSON.stringify(this.data);
  }
}

// Process mirrors the Python process signature: it receives the arguments passed
// to Kernel.cmd plus the system interfaces, and returns an Exit.
export type Process = (
  data: Record<string, unknown>,
  systems: Record<string, unknown>,
) => Exit;

// Kernel dispatches System Commands to their System Processes.
export class Kernel {
  private systemInterfaces: Record<string, unknown>;
  private cmdMap: Map<SysCommand, Process>;

  private constructor(
    cmdMap: Map<SysCommand, Process>,
    systemMap: Record<string, unknown>,
  ) {
    this.cmdMap = cmdMap;
    this.systemInterfaces = systemMap;
  }

  // bootstrap builds a Kernel from a command/process map and a system map.
  static bootstrap(
    cmdMap: Map<SysCommand, Process>,
    systemMap: Record<string, unknown>,
  ): Kernel {
    return new Kernel(cmdMap, systemMap);
  }

  // cmd looks up the Process for cmd and invokes it with data and the interfaces.
  cmd(cmd: SysCommand, data: Record<string, unknown> = {}): Exit {
    const fn = this.cmdMap.get(cmd);
    if (fn === undefined) {
      throw new Error("No process registered for command " + SysCommand[cmd]);
    }
    return fn(data, this.systemInterfaces);
  }
}
`;

// processesCode is the processes module: where System Processes live.
const processesCode = `import { Exit, ExitCode } from "./kernel";

// test is a placeholder System Process. Processes return an Exit; the "msg" key
// in the data is always required.
export function test(
  data: Record<string, unknown>,
  systems: Record<string, unknown>,
): Exit {
  return new Exit(ExitCode.GOOD, { msg: "test process ran" });
}
`;

// implementationsCode is the implementations module: where System Interfaces live.
const implementationsCode = `// System Interfaces implement the Facade pattern over systems external to the
// kernel library (databases, file systems, cloud services, API endpoints, ...).
// Define and export them here, then wire them into index.ts's systemInterfaces map.
export {};
`;

// indexCode is the library entrypoint: the TypeScript analog of the Python __init__.py.
const indexCode = `import { Kernel, Process, SysCommand } from "./kernel";
import { test } from "./processes";

export * from "./kernel";

// systemInterfaces maps aliases to System Interface implementations.
const systemInterfaces: Record<string, unknown> = {};

// commandProcessMap maps each System Command to the System Process that handles it.
const commandProcessMap: Map<SysCommand, Process> = new Map([
  [SysCommand.TEST, test],
]);

// bootstrap wires the maps and returns a ready-to-use Kernel.
export function bootstrap(): Kernel {
  return Kernel.bootstrap(commandProcessMap, systemInterfaces);
}
`;

// testCode is a smoke test for the generated library.
const testCode = `import { test as nodeTest } from "node:test";
import assert from "node:assert/strict";

import { bootstrap } from "../src/index";
import { ExitCode, SysCommand } from "../src/kernel";

nodeTest("bootstrap runs the TEST command", () => {
  const kernel = bootstrap();
  const exit = kernel.cmd(SysCommand.TEST, {});
  assert.equal(exit.code, ExitCode.GOOD);
  assert.ok("msg" in exit.data);
});
`;

const packageJsonCode = `{
  "name": "{{library_name}}",
  "version": "0.1.0",
  "description": "A TypeScript kernel library.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.test.json",
    "test": "node --import tsx --test tests/**/*.test.ts"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
`;

// tsconfigCode is the build config: emits only src/ to dist/ so that the
// package.json "main" (dist/index.js) resolves correctly.
const tsconfigCode = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
`;

// tsconfigTestCode type-checks src/ and tests/ together without emitting.
const tsconfigTestCode = `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
`;

const readmeCode = `# {{library_name}}

A TypeScript kernel library scaffolded by scripts/new.ts.

- System Commands live in src/kernel.ts (the SysCommand enum).
- System Processes live in src/processes.ts.
- System Interfaces live in src/implementations.ts.
- The entrypoint src/index.ts wires them together via bootstrap().

## Usage

    npm install
    npm run typecheck
    npm test
`;

const gitignoreCode = `node_modules/
dist/
*.tsbuildinfo
`;

// renderTemplate substitutes every {{ library_name }} placeholder with libraryName.
// Mirrors render_template in new.py.
function renderTemplate(libraryName: string, tmpl: string): string {
  return tmpl.replace(/\{\{\s*library_name\s*\}\}/g, libraryName);
}

// isDir reports whether path exists and is a directory.
function isDir(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

// checkFirst records which of the library's subfolders already exist, so we can
// skip re-creating them. Mirrors check_first in new.py.
function checkFirst(
  srcPath: string,
  testsPath: string,
  specsPath: string,
): Record<string, boolean> {
  return {
    src_path: isDir(srcPath),
    tests_path: isDir(testsPath),
    specs_path: isDir(specsPath),
  };
}

// writeFile creates parent dirs as needed and writes content, but never clobbers
// an existing file.
function writeFile(path: string, content: string): void {
  if (existsSync(path)) {
    return; // already exists; leave it untouched
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// makeFolders creates the src, tests and specs folders, writing the process,
// implementation and test files when their folder was absent. Mirrors
// make_folders in new.py.
function makeFolders(
  existing: Record<string, boolean>,
  libraryName: string,
  srcPath: string,
  testsPath: string,
  specsPath: string,
): void {
  if (!existing.src_path) {
    mkdirSync(srcPath, { recursive: true });
    writeFile(join(srcPath, "processes.ts"), processesCode);
    writeFile(join(srcPath, "implementations.ts"), implementationsCode);
  }

  if (!existing.tests_path) {
    mkdirSync(testsPath, { recursive: true });
    writeFile(join(testsPath, "kernel.test.ts"), testCode);
  }

  if (!existing.specs_path) {
    mkdirSync(specsPath, { recursive: true });
  }
}

// makeKernelInitFiles writes the package-level files: the kernel module, the
// entrypoint, package.json, tsconfig, README and .gitignore. Mirrors
// make_kernel_init_files in new.py.
function makeKernelInitFiles(libraryName: string, srcPath: string): void {
  const files: Record<string, string> = {
    [join(srcPath, "kernel.ts")]: kernelCode,
    [join(srcPath, "index.ts")]: indexCode,
    [join(libraryName, "package.json")]: renderTemplate(libraryName, packageJsonCode),
    [join(libraryName, "tsconfig.json")]: tsconfigCode,
    [join(libraryName, "tsconfig.test.json")]: tsconfigTestCode,
    [join(libraryName, "README.md")]: renderTemplate(libraryName, readmeCode),
    [join(libraryName, ".gitignore")]: gitignoreCode,
  };
  for (const [path, content] of Object.entries(files)) {
    writeFile(path, content);
  }
}

// run reads the library name from the command line and scaffolds the library.
// Mirrors run in new.py.
function run(): void {
  const libraryName = process.argv[2] && process.argv[2] !== "" ? process.argv[2] : "mykernel";

  const srcPath = join(libraryName, "src");
  const testsPath = join(libraryName, "tests");
  const specsPath = join(libraryName, "specs");

  const existing = checkFirst(srcPath, testsPath, specsPath);
  makeFolders(existing, libraryName, srcPath, testsPath, specsPath);
  makeKernelInitFiles(libraryName, srcPath);

  console.log(`Scaffolded kernel library "${libraryName}"`);
}

run();
