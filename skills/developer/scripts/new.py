from pathlib import Path
import re
import argparse


kernel_code = """
from enum import Enum

class SysCommand(Enum):
    TEST = 1
    
    


class Kernel:
    __system_interfaces = {}
    __cmd_map = {}

    class ExitCode(Enum):
        GOOD = 0
        ERROR = 1
    
    class Exit:
        def __init__(self, code, **kwargs):
            self.code = code
            self.data = kwargs
        def __str__(self):
            return f"Exit Code is {self.code} and data is {self.data}"

    def __init__(self):
        self.__current_project = None

  
    @classmethod
    def bootstrap(cls, command_process_map, system_map):
        kernel = cls()
        kernel.__cmd_map = command_process_map
        kernel.__system_interfaces = system_map
        return kernel

    def cmd(self, cmd, **kwargs):
        fn = self.__cmd_map[cmd]
        return fn(kwargs, self.__system_interfaces)
"""

kernel_entrypoint_code = """
from {{library_name}}.kernel import Kernel, SysCommand
from {{library_name}} import processes
from {{library_name}} import implementations

# System Interface dictionary
__system_interfaces = {
}

# Command / Process dictionary
__command_process_map = {
  SysCommand.TEST: processes.test
}

def bootstrap():
  kernel = Kernel.bootstrap(__command_process_map, __system_interfaces)
  return kernel

"""

def render_template(library_name, tmpl):
    pattern = r"\{\{\s*library_name\s*\}\}"
    return re.sub(pattern, library_name, tmpl)




def check_first(imp_path, proc_path, tests_path, specs_path):
    result = {'imp_path': False, 'proc_path': False, 'tests_path': False, 'specs_path': False}
    if imp_path.exists() and imp_path.is_dir():
        result['imp_path'] = True

    if proc_path.exists() and proc_path.is_dir():
        result['proc_path'] = True

    if tests_path.exists() and tests_path.is_dir():
        result['tests_path'] = True

    if specs_path.exists() and specs_path.is_dir():
        result['specs_path'] = True

    return result


def make_folders(folder_dict, library_name, imp_path, proc_path, tests_path, specs_path):
    if folder_dict['imp_path'] is False:
        imp_path.mkdir(parents=True, exist_ok=True)
        imp_py = Path(f"src/{library_name}/implementations/__init__.py")
        imp_py.touch(exist_ok=True)

    if folder_dict['proc_path'] is False:
        proc_path.mkdir(parents=True, exist_ok=True)
        proc_py = Path(f"src/{library_name}/processes/__init__.py")
        proc_py.touch(exist_ok=True)

    if folder_dict['tests_path'] is False:
        tests_path.mkdir(parents=True, exist_ok=True)
        tests_py = Path(f"tests/__init__.py")
        tests_py.touch(exist_ok=True)

    if folder_dict['specs_path'] is False:
        specs_path.mkdir(parents=True, exist_ok=True)

def make_kernel_init_files(library_name):
    Path(f"src/{library_name}").mkdir(parents=True, exist_ok=True)

    fp = open(Path(f"src/{library_name}/kernel.py"), "w+")
    fp.write(kernel_code)
    fp.close()

    fp = open(Path(f"src/{library_name}/__init__.py"), "w+")
    fp.write(render_template(library_name, kernel_entrypoint_code))
    fp.close()


def run():
    parser = argparse.ArgumentParser(
        prog='Kernel Maker',
        description='Creates the file folder structure for a kernel library'
    )
    parser.add_argument("library_name", default="mykernel")
    args = vars(parser.parse_args())
    library_name = args['library_name']

    imp_path = Path(f"src/{library_name}/implementations")
    proc_path = Path(f"src/{library_name}/processes")
    tests_path = Path(f"tests")
    specs_path = Path(f"specs")

    existing = check_first(imp_path, proc_path, tests_path, specs_path)
    make_folders(existing, library_name, imp_path, proc_path, tests_path, specs_path)
    make_kernel_init_files(library_name)

if __name__ == "__main__":
    run()
    


