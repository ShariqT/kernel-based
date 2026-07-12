---
name: kernel-developer
description: Creates commands and interfaces for kernels. Use this when creating a kernel library, when creating new system commands, or when creating system interfaces for a kernel library.
---

## Available Scripts
- **`scripts/new.py`** — Scaffolds the folder/file structure for a Python kernel library. Run with `uv run scripts/new.py <kernel name>`.
- **`scripts/new.go`** — Scaffolds the equivalent structure for a Go kernel library (an idiomatic Go module with `kernel/`, `processes/`, and `implementations/` packages). Run with `go run scripts/new.go <kernel name>`.
- **`scripts/new.ts`** — Scaffolds the equivalent structure for a TypeScript kernel library (an idiomatic TypeScript package with `src/kernel.ts`, `src/processes.ts`, and `src/implementations.ts`). Run with `npx tsx scripts/new.ts <kernel name>` (or `node scripts/new.ts <kernel name>` on Node ≥ 23.6).


## Python Kernel library

A kernel library is a Python package that contains all of the business logic for an application. The folder structure is the following: 
```code
.
+-- src
|   +-- kerneltest
|   |   +-- implementations
|   |   |   +-- __init__.py
|   |   +-- processes
|   |   |   +-- __init__.py
|   |   +-- __init__.py
|   |   +-- kernel.py
+-- tests
|   +-- __init__.py
+-- specs
+-- pyproject.toml
+-- .gitignore
+-- .python-version
+-- README.md
```

### System Commands
System Commands are an enum that is located in `src/kerneltest/kernel.py`. System Commands are how code consuming the kernel interacts with it. A system command is mapped to a System Process in the `__command_process_map` dictionary in the `src/kerneltest/__init__.py`. 

### System Interfaces
System Interfaces are defined in `src/kerneltest/implementations/__init__.py`. System Interfaces are classes that implement the Facade design pattern. They are meant to be facades that represent systems external to the kernel library, like databases, file systems, cloud services, API endpoints, etc. They are mapped to aliases in the `__system_interfaces` dictionary in the `src/kerneltest/__init__.py`. 

### System Processes
System Processes are defined in `src/kerneltest/processes/__init__.py`. System Processes are functions that take two parameters -- a `data` dictionary that represents the keyword arguments that were passed to the `cmd` method of the `Kernel` class, and `__system_interfaces` dictionary. System Processes return an instance of `Kernel.Exit` with a `Kernel.ExitCode`. 


## Go kernel library

A Go kernel library is the same concept as the Python one, laid out as an idiomatic Go module (scaffolded by `scripts/new.go`). The folder structure is the following (for a library named `kerneltest`):
```code
.
+-- kerneltest
|   +-- kernel
|   |   +-- kernel.go
|   +-- processes
|   |   +-- processes.go
|   +-- implementations
|   |   +-- implementations.go
|   +-- kerneltest.go
|   +-- kernel_test.go
|   +-- specs
|   +-- go.mod
|   +-- .gitignore
|   +-- README.md
```
The module path in `go.mod` equals the library name, so internal imports resolve as `kerneltest/kernel`, `kerneltest/processes`, etc.

### System Commands (Go)
System Commands are the `SysCommand` typed-int enum in `kerneltest/kernel/kernel.go`. A system command is mapped to a System Process in the `commandProcessMap` map in the entrypoint file `kerneltest/kerneltest.go`.

### System Interfaces (Go)
System Interfaces are defined in `kerneltest/implementations/implementations.go`. They are structs/types that implement the Facade pattern over systems external to the kernel library (databases, file systems, cloud services, API endpoints, etc). They are mapped to aliases in the `systemInterfaces` map in `kerneltest/kerneltest.go`.

### System Processes (Go)
System Processes are defined in `kerneltest/processes/processes.go`. Each is a `kernel.Process` -- a function taking a `data map[string]any` (the arguments passed to `Kernel.Cmd`) and a `systems map[string]any` (the system interfaces), and returning a `kernel.Exit` carrying a `kernel.ExitCode`. Tests go in `*_test.go` files (e.g. `kernel_test.go`) rather than a separate `tests` folder.


## TypeScript kernel library

A TypeScript kernel library is the same concept as the Python one, laid out as an idiomatic TypeScript package (scaffolded by `scripts/new.ts`). The folder structure is the following (for a library named `kerneltest`):
```code
.
+-- kerneltest
|   +-- src
|   |   +-- kernel.ts
|   |   +-- processes.ts
|   |   +-- implementations.ts
|   |   +-- index.ts
|   +-- tests
|   |   +-- kernel.test.ts
|   +-- specs
|   +-- package.json
|   +-- tsconfig.json
|   +-- tsconfig.test.json
|   +-- .gitignore
|   +-- README.md
```
Source compiles from `src/` to `dist/`, so `package.json`'s `main` resolves to `dist/index.js`.

### System Commands (TS)
System Commands are the `SysCommand` enum in `kerneltest/src/kernel.ts`. A system command is mapped to a System Process in the `commandProcessMap` map in the entrypoint file `kerneltest/src/index.ts`.

### System Interfaces (TS)
System Interfaces are defined in `kerneltest/src/implementations.ts`. They are classes/objects that implement the Facade pattern over systems external to the kernel library (databases, file systems, cloud services, API endpoints, etc). They are mapped to aliases in the `systemInterfaces` map in `kerneltest/src/index.ts`.

### System Processes (TS)
System Processes are defined in `kerneltest/src/processes.ts`. Each is a `Process` -- a function taking a `data: Record<string, unknown>` (the arguments passed to `Kernel.cmd`) and a `systems: Record<string, unknown>` (the system interfaces), and returning an `Exit` carrying an `ExitCode`. Tests go in `tests/*.test.ts` files (e.g. `kernel.test.ts`).


## Workflow
If the root folder is empty, ask the user what they want to name the kernel library, and whether they want a Python, Go, or TypeScript library. Use this name when running the scaffolder: `uv run scripts/new.py <kernel name>` for Python, `go run scripts/new.go <kernel name>` for Go, or `npx tsx scripts/new.ts <kernel name>` for TypeScript. 

Before starting a kernel task, ask the user several questions:
- Will this task invole altering a System Command or creating a new one? If the task is altering a System Command, then ask the user which command
- Will this task involve creating a new System Process? If so, ask the user what is the purpose of this process
- Will this task invole creating a new System Interface? If so, what external system will this System Interface cover (a database, an REST API, a file directory, etc)


Create a workplan that adheres to the following guidelines:
- All processes are placed in the processes file for the library's language: `src/kerneltest/processes/__init__.py` (Python), `kerneltest/processes/processes.go` (Go), or `kerneltest/src/processes.ts` (TypeScript).
- All system interfaces are placed in the implementations file for the library's language: `src/kerneltest/implementations/__init__.py` (Python), `kerneltest/implementations/implementations.go` (Go), or `kerneltest/src/implementations.ts` (TypeScript).
- Create tests for any new system process and system command. For Python, place them in the `tests` folder; for Go, place them in `*_test.go` files (e.g. `kerneltest/kernel_test.go`); for TypeScript, place them in `tests/*.test.ts` files (e.g. `kerneltest/tests/kernel.test.ts`).
- All processes return an exit value that carries an exit code and an arbitrary number of keyword arguments/data: a `Kernel.Exit` with a `Kernel.ExitCode` in Python, a `kernel.Exit` with a `kernel.ExitCode` in Go, or an `Exit` with an `ExitCode` in TypeScript. The `msg` keyword/key is ALWAYS required.
- Save the workplan in a markdown file in the `specs` folder. The title of this file should be the date and the system command worked on.  