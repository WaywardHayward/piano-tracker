# 🎹 Piano Tracker

A web app for tracking your piano practice sessions with MIDI input and audio detection.

## Architecture

- **Backend**: .NET 9 Web API
- **Frontend**: React 19 + TypeScript + Vite 7
- **Structure**: Monorepo with SPA served from .NET in production

```
piano-tracker/
├── src/
│   └── PianoTracker.Api/
│       ├── Controllers/         # API endpoints
│       ├── Models/              # Domain models
│       ├── ClientApp/           # React SPA
│       │   ├── src/             # React components
│       │   └── vite.config.ts   # Dev proxy → /api
│       ├── Program.cs
│       └── PianoTracker.Api.csproj
└── PianoTracker.sln
```

## Development

### Prerequisites
- .NET 9 SDK
- Node.js 20+

### Running locally

**Backend** (port 5000):
```bash
cd src/PianoTracker.Api
dotnet run
```

**Frontend** (port 5173, proxies /api to backend):
```bash
cd src/PianoTracker.Api/ClientApp
npm install
npm run dev
```

Then open http://localhost:5173

### API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |

## Features

- 🎹 MIDI device connection (USB & Bluetooth)
- 🎤 Audio input with pitch detection
- 📄 MIDI file loading
- 🎯 Note accuracy tracking

## Deployment

- **GitHub Pages**: Frontend-only demo (push to main)
- **Full stack**: Use the published artifact from CI

## License

MIT
