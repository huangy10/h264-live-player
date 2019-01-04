import re
from fabric.api import run, env
from fabric.contrib.project import rsync_project

__author__ = "Woody Huang"
__version__ = "1.0"

env.hosts = [
    "pi@192.168.199.50"
]

def install():
    with open("./.gitignore") as f:
        excludes = re.sub('\n+', "\n", f.read()).split("\n")
    excludes.append(".git")
    rsync_project("/home/pi/player/", "./", exclude=excludes)
