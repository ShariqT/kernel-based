# Kernel-Based

Kernel-based development is a software engineering practice that delivers focused AI output by adhering to the philosopy "convention over configuration". Kernels are highly-focused libraries that are meant to encapsulate the entirity of a product offering or business. This library can then be used by a number of different delivery platforms (mobile phone application, desktop application, AI agent, MCP server, etc). This skill creates a scaffold for a kernel in either Python, Golang, or Typescript. 

Kernels are composed of the following: 
- *System Commands* This an enum with a description of the command. An example in Python would be 
'''
class SysCommand(Enum):
    TEST = 1
'''

- *System Processes* This is function that is internally mapped to a System Command. This function returns an *Exit* class with an *ExitCode* that tells the consuming code if the System Command failed or succeeded. 

- *System Interfaces* This is a class that can be called by the System Processes to interact with the world outside of the kernel. This could be an external API service, a database, or a file system. 

## License
BSD-3-Clause

## Installation

### Claude Code

Claude Code only looks one level deep for `SKILL.md` files, so each skill folder must be directly under the skills directory. Clone the repo somewhere, then symlink the skills:

```bash
# Clone to a convenient location
git clone https://github.com/ShariqT/kernel-based ~/kernel-based

# Symlink individual skills (user-level)
mkdir -p ~/.claude/skills
ln -s ~/kernel-based/skills/developer ~/.claude/skills/kernel-developer

# Or project-level
mkdir -p .claude/skills
ln -s ~/kernel-based/skills/developer .claude/skills/kernel-developer
