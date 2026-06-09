# StreamNet TV App Packaging

This repository now includes setup for:

- Android APK via Capacitor
- Desktop app (Windows/macOS/Linux) via Tauri v2

Both app wrappers load your StreamNet instance from a URL (default: <http://127.0.0.1:3000>).

## 1) Configure app URL

Update both files to your real StreamNet server URL:

- capacitor.config.json -> server.url
- src-tauri/tauri.conf.json -> build.devUrl and app.windows[0].url

Examples:

- Local desktop server: <http://127.0.0.1:3000>
- LAN server for phone/TV: <http://192.168.1.50:3000>
- Public HTTPS server: <https://tv.example.com>

For Android/Android TV devices, do not use 127.0.0.1 unless the server runs on the same device.

## 2) Android APK (Capacitor)

Run:

```bash
npm install
npm run mobile:sync
npm run mobile:open:android
```

Then in Android Studio:

1. Wait for Gradle sync
2. Build -> Build Bundle(s) / APK(s) -> Build APK(s)
3. Install generated APK on Android/Android TV

Useful commands:

```bash
npm run mobile:add:android
npm run mobile:sync
```

## 3) Desktop App (Tauri)

Requirements:

- Rust toolchain
- Platform build tools (for example on Windows: Visual Studio C++ Build Tools)

Run dev app:

```bash
npm run desktop:dev
```

Build installer/binaries:

```bash
npm run desktop:build
```

## Notes

- This setup is wrapper-based and reuses your existing web frontend/backend.
- Keep your StreamNet backend reachable from the target device.
- If you want fully offline native execution later, that requires a dedicated native app architecture.
