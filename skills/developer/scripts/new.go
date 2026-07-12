// Command new scaffolds the folder/file structure for a Go kernel library.
//
// It is the Go counterpart of scripts/new.py, which scaffolds a Python kernel
// library. Instead of a Python package, this produces an idiomatic Go module:
//
//	<lib>/
//	  go.mod
//	  kernel/kernel.go                     # SysCommand, ExitCode, Exit, Process, Kernel
//	  processes/processes.go               # System Processes
//	  implementations/implementations.go   # System Interfaces (facades)
//	  <lib>.go                             # entrypoint: wires maps + Bootstrap()
//	  kernel_test.go
//	  specs/
//	  README.md
//	  .gitignore
//
// Usage:
//
//	go run scripts/new.go <library_name>
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

// kernelCode is the kernel package: the Go translation of files/kernel.py.
const kernelCode = `package kernel

import "fmt"

// SysCommand is how code consuming the kernel interacts with it. Each command
// is mapped to a Process in the entrypoint's command/process map.
type SysCommand int

const (
	TEST SysCommand = iota + 1
)

// ExitCode is the status a Process reports back through its Exit.
type ExitCode int

const (
	GOOD  ExitCode = 0
	ERROR ExitCode = 1
)

// Exit is the value every Process returns. Data carries arbitrary keyword-style
// results; the "msg" key is always expected to be present.
type Exit struct {
	Code ExitCode
	Data map[string]any
}

func (e Exit) String() string {
	return fmt.Sprintf("Exit Code is %d and data is %v", e.Code, e.Data)
}

// Process mirrors the Python process signature: it receives the keyword
// arguments passed to Kernel.Cmd plus the system interfaces, and returns an Exit.
type Process func(data map[string]any, systems map[string]any) Exit

// Kernel dispatches System Commands to their System Processes.
type Kernel struct {
	systemInterfaces map[string]any
	cmdMap           map[SysCommand]Process
}

// Bootstrap builds a Kernel from a command/process map and a system-interface map.
func Bootstrap(cmdMap map[SysCommand]Process, systemMap map[string]any) *Kernel {
	return &Kernel{cmdMap: cmdMap, systemInterfaces: systemMap}
}

// Cmd looks up the Process for cmd and invokes it with data and the system interfaces.
func (k *Kernel) Cmd(cmd SysCommand, data map[string]any) Exit {
	return k.cmdMap[cmd](data, k.systemInterfaces)
}
`

// processesCode is the processes package: where System Processes live.
const processesCode = `package processes

import "{{library_name}}/kernel"

// Test is a placeholder System Process. Processes return a kernel.Exit; the
// "msg" key in Data is always required.
func Test(data map[string]any, systems map[string]any) kernel.Exit {
	return kernel.Exit{Code: kernel.GOOD, Data: map[string]any{"msg": "test process ran"}}
}
`

// implementationsCode is the implementations package: where System Interfaces live.
const implementationsCode = `package implementations

// System Interfaces implement the Facade pattern over systems external to the
// kernel library (databases, file systems, cloud services, API endpoints, ...).
// Define them here and wire them into the entrypoint's systemInterfaces map.
`

// entrypointCode is the library entrypoint: the Go analog of the Python __init__.py.
const entrypointCode = `package {{library_name}}

import (
	"{{library_name}}/kernel"
	"{{library_name}}/processes"
)

// systemInterfaces maps aliases to System Interface implementations.
var systemInterfaces = map[string]any{}

// commandProcessMap maps each System Command to the System Process that handles it.
var commandProcessMap = map[kernel.SysCommand]kernel.Process{
	kernel.TEST: processes.Test,
}

// Bootstrap wires the maps and returns a ready-to-use Kernel.
func Bootstrap() *kernel.Kernel {
	return kernel.Bootstrap(commandProcessMap, systemInterfaces)
}
`

// testCode is a smoke test for the generated library.
const testCode = `package {{library_name}}

import (
	"testing"

	"{{library_name}}/kernel"
)

func TestBootstrapCmd(t *testing.T) {
	k := Bootstrap()
	exit := k.Cmd(kernel.TEST, map[string]any{})
	if exit.Code != kernel.GOOD {
		t.Fatalf("expected GOOD, got %v", exit.Code)
	}
	if _, ok := exit.Data["msg"]; !ok {
		t.Fatal("expected a msg in exit data")
	}
}
`

// goModCode declares the module. The module path equals the library name, so
// internal imports resolve as "<lib>/kernel", "<lib>/processes".
const goModCode = `module {{library_name}}

go 1.22
`

const readmeCode = `# {{library_name}}

A Go kernel library scaffolded by scripts/new.go.

- System Commands live in kernel/kernel.go (the SysCommand enum).
- System Processes live in processes/processes.go.
- System Interfaces live in implementations/implementations.go.
- The entrypoint {{library_name}}.go wires them together via Bootstrap().
`

const gitignoreCode = `/bin/
*.exe
*.test
*.out
`

// renderTemplate substitutes every {{ library_name }} placeholder with libraryName.
// Mirrors render_template in new.py.
func renderTemplate(libraryName, tmpl string) string {
	pattern := regexp.MustCompile(`\{\{\s*library_name\s*\}\}`)
	return pattern.ReplaceAllString(tmpl, libraryName)
}

// isDir reports whether path exists and is a directory.
func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// checkFirst records which of the library's subfolders already exist, so we can
// skip re-creating them. Mirrors check_first in new.py.
func checkFirst(impPath, procPath, specsPath string) map[string]bool {
	return map[string]bool{
		"imp_path":   isDir(impPath),
		"proc_path":  isDir(procPath),
		"specs_path": isDir(specsPath),
	}
}

// writeFile creates parent dirs as needed and writes content, but never clobbers
// an existing file.
func writeFile(path, content string) error {
	if _, err := os.Stat(path); err == nil {
		return nil // already exists; leave it untouched
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

// makeFolders creates the processes, implementations and specs folders, writing
// each package's source file when the folder was absent. Mirrors make_folders in new.py.
func makeFolders(existing map[string]bool, libraryName, impPath, procPath, specsPath string) error {
	if !existing["imp_path"] {
		if err := os.MkdirAll(impPath, 0o755); err != nil {
			return err
		}
		if err := writeFile(filepath.Join(impPath, "implementations.go"), implementationsCode); err != nil {
			return err
		}
	}

	if !existing["proc_path"] {
		if err := os.MkdirAll(procPath, 0o755); err != nil {
			return err
		}
		if err := writeFile(filepath.Join(procPath, "processes.go"), renderTemplate(libraryName, processesCode)); err != nil {
			return err
		}
	}

	if !existing["specs_path"] {
		if err := os.MkdirAll(specsPath, 0o755); err != nil {
			return err
		}
	}

	return nil
}

// makeKernelInitFiles writes the module-level files: the kernel package, the
// entrypoint, the test, go.mod, README and .gitignore. Mirrors
// make_kernel_init_files in new.py.
func makeKernelInitFiles(libraryName string) error {
	files := map[string]string{
		filepath.Join(libraryName, "kernel", "kernel.go"): kernelCode,
		filepath.Join(libraryName, libraryName+".go"):     renderTemplate(libraryName, entrypointCode),
		filepath.Join(libraryName, "kernel_test.go"):      renderTemplate(libraryName, testCode),
		filepath.Join(libraryName, "go.mod"):              renderTemplate(libraryName, goModCode),
		filepath.Join(libraryName, "README.md"):           renderTemplate(libraryName, readmeCode),
		filepath.Join(libraryName, ".gitignore"):          gitignoreCode,
	}
	for path, content := range files {
		if err := writeFile(path, content); err != nil {
			return err
		}
	}
	return nil
}

// run parses the library name from the command line and scaffolds the library.
// Mirrors run in new.py.
func run() error {
	libraryName := "mykernel"
	if len(os.Args) > 1 && os.Args[1] != "" {
		libraryName = os.Args[1]
	}

	impPath := filepath.Join(libraryName, "implementations")
	procPath := filepath.Join(libraryName, "processes")
	specsPath := filepath.Join(libraryName, "specs")

	existing := checkFirst(impPath, procPath, specsPath)
	if err := makeFolders(existing, libraryName, impPath, procPath, specsPath); err != nil {
		return err
	}
	if err := makeKernelInitFiles(libraryName); err != nil {
		return err
	}

	fmt.Printf("Scaffolded kernel library %q\n", libraryName)
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
