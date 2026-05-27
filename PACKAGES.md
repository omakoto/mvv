# Package Management

## Installing Dependencies

To install all dependencies locally for development, simply run:
```bash
npm install
```

## Troubleshooting & Package Notes

### Web MIDI Type Definitions (`@types/webmidi`)
- **Important**: `@types/webmidi` is pinned to `^2.1.0`.
- **Reason**: Version 3.x of `@types/webmidi` is a deprecated stub that redirects to the `webmidi` npm wrapper library (WEBMIDI.js), which ships its own type definitions. However, this project uses the native browser Web MIDI API (`navigator.requestMIDIAccess()`) and expects the global `WebMidi` namespace type definitions from `@types/webmidi` v2. Upgrading to v3 will break the TypeScript build by removing the global `WebMidi` namespace.

---

## Updating Node.js (Ubuntu/Debian)

If you need to update Node.js on your system, you can use the NodeSource binary distributions:

```bash
# Set setup script for desired version (e.g., LTS version 22.x or 20.x)
curl -sL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node -v
```
