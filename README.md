# MVV - MIDI Velocity Visualizer

## Synopsys

[MVV](https://omakoto.github.io/mvv/) is an online MIDI input visualizer, recorder and player, created for piano learners.

It visualizes:
- Note events (which keys are pressed), with intencity (aka velocity)
- Pedal depth (sosutenuto pedelanot supported yet)

<a href="https://omakoto.github.io/mvv/">
  <img src="mvv-screenshot.png" alt="MVV screenshot" style="width: 80%">
</a>

(Click image to open MVV)

## Keys

Press '?' for help

## Supported midi events

- Only note ons/offs and the pedal depth will be visualized.
- Other MIDI events are not visualized, but MVV will/should still record / play them; not well tested though.

## Bugs/TODOs

- [ ] P4: Re-architect the entire thing
- [ ] P1: Always recording mode
  - [ ] Estimate RAM consumption
  - [ ] Throttle control changes if needed.
  - [ ] Auto-detect between pieces
- [X] P3: Better playback (as a geneal MIDI player)
  - [X] Fast-forward should send all skipped control changes
  - [X] Rewind should replay all control changes
- [X] P4: Actually sync the renderer to vsync
- [ ] P4: Support SMPTE time format in *.mid files
- [X] P4: Add help (not important now that we have buttons)
- [X] P3: Visualize sosutenuto pedal depth
- [X] P1: On-screen playback/recording controls
  - [X] Play/Record/Stop/Pause/RewindToTop
  - [ ] ~~FF/Rewind -> not needed, now that we have the position bar~~
  - [X] Video mute
  - [X] Pane freeze
  - [X] Current position
- [X] Show confirmation dialog before over-recording or loading
- [X] Prevent text selection
- [X] Support pausing
- [X] Keep playing while in the BG too
- [X] Don't use `prompt()` (which stops playback)
- [X] Support loading a *.mid file
  - [X] Support self-created mid files
  - [X] Support other mid files
- [X] Constant scroll speed regardless of FPS
  - It should be mostly fixed with double-buffering now, as long as updating the hidden buffer finishes within 16 ms.
- [X] Show playback timestamp
