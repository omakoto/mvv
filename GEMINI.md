# Project: MVV, an online MIDI event visualizer written in typescript.

## Directory structure

- All source files, including the HTML and CSS, are stored under the src/ directory. The main html is src/index.html and the main logic is mvv.ts.

- To build the project, use scripts/build.sh.

- Files in the docs/ are what's consumed by the browser. Do not modify any files there. They're updated by scripts/build.sh.

- Every time src/mvv.css is updated, increment the "v=" number in src/index.html for mvv.css.
