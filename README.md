# Actions-Tracker (Life OS PWA)

Actions-Tracker is a structurally serious, local-first Personal Operating System built as a Progressive Web App (PWA) and wrapped for Android via Capacitor. It serves as an offline, private, single-device truth layer for your life data.

## Architecture & Model
The system uses an RPG-like axis model to track progression:
- **Body / Strength**: Physical health, fitness, and nutrition.
- **Knowledge**: Reading, learning, and skill acquisition.
- **Strategy**: Planning, finances, and long-term positioning.
- **Creativity / Art**: Making things, writing, and creative output.
- **Social**: Relationships, community, and outreach.
- **Discipline**: Habit consistency, routine, and self-control.

## Core Features
- **Local-First & Offline**: All data is stored in IndexedDB on the device. There is no cloud backend, no account to create, and no central server that can be breached. Data is fully yours.
- **Jarvis Engine**: A local AI connector that provides pattern detection, daily feedback, and anomaly detection based on your raw daily telemetry.
- **Daily Check-Ins**: Fast, frictionless entry for daily non-negotiable habits.
- **RPG Progression**: Activities log points ("Evidence") against your stats, automatically leveling up your stats and providing a gamified loop.
- **Automatic Backup**: Backups are periodically exported as a JSON file to the device's file system for safekeeping against data corruption or app uninstalls.

## Technical Stack
- **Frontend**: React (Vite)
- **Database**: IndexedDB (Native Browser / WebView)
- **Container**: Capacitor for native Android features (File System, Notifications, Status Bar)

## Setup and Build
```bash
# Install dependencies
npm install

# Run web version locally
npm run dev

# Build the web bundle
npm run build

# Sync with Capacitor for Android
npm run cap:sync

# Open in Android Studio
npm run cap:android
```

## Data Safety
Since Actions-Tracker stores all your data on your phone, you are responsible for it. 
The app runs a background task to safely back up your IndexedDB data to a JSON file in your local Documents folder on Android. You can import this JSON file back into the app if you ever need to restore it.
