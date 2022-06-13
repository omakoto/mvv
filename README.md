# MVV - MIDI Velocity Visualizer

## Synopsys

[MVV](https://omakoto.github.io/mvv/) is an online MIDI input visualizer, created for piano learners.

![MVV Screenshot](mvv-screenshot.png "Screenshot")

## Keys

- `1` or `F1`: Hide screen
- `2` or `F2`: Freeze roll pane
- `3` or double tap anywhere : Toggle full-screen
- `R`: Record start/stop
- `SPACE`: Playback start / pause
  - `Left`/`Right`: during playback -- Rewind/Fast-forward
- `Z`: Stop playback
- `S`: Save the last recording as a midi file
- `L`: Load a `*.mid` file
- `F`: Show FPS and playback timer resolution.

## Supported midi events

- Only note ons/offs and the pedal depth will be visualized.
- Other MIDI events are not visualized, but MVV will/should still record / play them; not tested though.

## Bugs/TODOs

- [ ] P1: On-screen playback/recording controls
- [ ] P1: Always recording
  - [ ] Estimate RAM consumption
  - [ ] Throttle control (at least the pedal) changes if needed.
  - [ ] Auto-detect between pieces
- [ ] Show confirmation dialog before over-recording or loading
- [ ] Add help
- [ ] P3: Support reading from non-zero channels
- [ ] P3: Better playback (as a geneal MIDI player)
  - [ ] Fast-forward should send all skipped control changes
  - [ ] Rewind should replay all control changes
- [X] Support pausing
- [ ] P4: Actually sync the renderer to vsync (how?)
- [ ] P4: Support SMPTE time format in *.mid files
- [X] Keep playing while in the BG too
- [X] Don't use `prompt()` (which stops playback)
- [X] Support loading a *.mid file
  - [X] Support self-created mid files
  - [X] Support other mid files
- [X] Constant scroll speed regardless of FPS
  - It should be mostly fixed with double-buffering now, as long as updating the hidden buffer finishes within 16 ms.
- [X] Show playback timestamp
