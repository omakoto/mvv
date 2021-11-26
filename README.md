# MVV - MIDI Velocity Visualizer

## Synopsys

[MVV](https://omakoto.github.io/mvv/) is an online MIDI input visualizer, created for piano learners.

Source file is available [here](https://github.com/omakoto/mvv).

## Keys

- `F1` hide screen
- `R` Record start/stop
- `SPACE` Playback start / pause
  - `Left`/`Right` during playback -- Rewind/Fast-forward
- `Z` Stop playback
- `S` Save the last recording as a midi file
- `L` Load a `*.mid` file
- `F` Show FPS and playback timer resolution.

## Supported midi events

- Only note ons/offs and the pedal depth will be visualized.
- Other MIDI events are not visualized, but MVV will/should still record / play them; not tested though.

## Bugs/TODOs

- [ ] Add help
- [X] Support pausing
- [ ] Show confirmation dialog before over-recording
- [ ] Support non-zero channels
- [ ] Better playback (as a geneal MIDI player)
  - [ ] Fast-forward should send all skipped control changes
  - [ ] Rewind should replay all control changes
- [ ] Sync the renderer to vsync (?)
- [ ] Support SMPTE time format in *.mid files
- [X] Keep playing while in the BG too
- [X] Don't use `prompt()` (which stops playback)
- [X] Support loading a *.mid file
  - [X] Support self-created mid files
  - [X] Support other mid files
- [X] Constant scroll speed regardless of FPS
  - It should be mostly fixed with double-buffering now, as long as updating the hidden buffer finishes within 16 ms.
- [X] Show playback timestamp
