# 🎮 Ging Playground

A fun, educational gaming platform for kids built with React and [Rextive](../rextive) - a signal-based reactive state management library.

![Home Screen](./screenshots/home.png)

## ✨ Features

### 🎯 Educational Games

Four engaging games designed to make learning fun:

| Game | Description | Skills |
|------|-------------|--------|
| **⌨️ Typing Adventure** | Type words as fast as you can! | Spelling, Typing Speed |
| **🧠 Memory Match** | Find matching pairs of cards | Memory, Concentration |
| **🏎️ Road Racer** | Dodge obstacles and collect coins | Reflexes, Focus |
| **🔢 Math Quest** | Solve math problems across 6 categories | Arithmetic, Logic |

![Games Dashboard](./screenshots/dashboard.png)

### 🔢 Math Quest Categories

Math Quest features multiple problem types:

- **Quiz** - Multiple choice math problems
- **Compare** - Compare expressions using `<`, `>`, `=`
- **Fill Blank** - Find the missing number in equations
- **Sort** - Arrange numbers in order
- **Chain** - Multi-step calculations
- **Mix** - Random combination of all types

![Math Quest](./screenshots/math-quest.png)

### 👶 Kid Profiles

- Multiple profiles for different children
- Custom avatars with fun animal characters
- Individual progress tracking per profile
- XP and leveling system

![Profile Selection](./screenshots/profiles.png)

### ⚡ Energy System

- Daily energy allocation (5 plays per day)
- Energy refills automatically each day
- Encourages balanced screen time

### 🏆 Progress & Achievements

- Track game stats and high scores
- Earn XP from playing games
- Unlock achievements for milestones
- Level up with accumulated XP

![Stats](./screenshots/stats.png)

### 👨‍👩‍👧‍👦 Parent Mode

Secure parent dashboard with password protection:

#### Kids Management
- View all kid profiles
- Refill energy manually
- Reset stats per kid or per game
- Control game visibility
- Set max XP levels

#### 📱 Device Sync (P2P)
- Transfer data between devices using WebRTC
- Simple 6-digit code pairing
- No server required - direct peer-to-peer
- Works on same network or across internet

![Sync Feature](./screenshots/sync.png)

#### 💾 Backup & Restore
- Export all data as JSON
- Import from backup file
- Full data reset option

![Parent Dashboard](./screenshots/parent.png)

### 🎵 Sound & Music

- Background music for each game
- Sound effects for actions (correct/wrong answers, clicks, etc.)
- Satisfying feedback sounds

### 📱 Mobile-First Design

- Responsive UI that works on phones, tablets, and desktops
- Touch-friendly controls
- Safe area support for notched devices
- Optimized for landscape and portrait modes

## 🛠️ Tech Stack

- **React 19** - UI framework
- **Rextive** - Signal-based state management
- **TanStack Router** - File-based routing with view transitions
- **Tailwind CSS** - Styling
- **Dexie (IndexedDB)** - Local data persistence
- **PeerJS** - WebRTC peer-to-peer connections
- **Vite** - Build tool

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/rxblox.git
cd rxblox

# Install dependencies
pnpm install

# Start the playground
pnpm dev:game
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

### Running on Different Port

```bash
cd packages/rextive-playground
pnpm dev --port 5175
```

## 📁 Project Structure

```
src/
├── components/        # Shared UI components
├── domain/           # Domain types, scoring rules
├── features/         # Feature modules (typing-adventure, sync)
├── hooks/            # Custom hooks (useSound)
├── infrastructure/   # Database, repositories
├── logic/            # Rextive logic modules
├── routes/           # TanStack Router file-based routes
│   ├── dashboard/    # Player dashboard
│   ├── games/        # Game routes
│   └── mode/         # Parent mode
└── utils/            # Utility functions
```

## 🎮 Game Development

Each game follows a consistent pattern:

```tsx
// Game logic using Rextive signals
function myGameLogic() {
  const gameState = signal<GameState>("menu");
  const score = signal(0);
  
  // Use gameTickLogic for auto-managed timers
  gameTickLogic(gameState, () => {
    // Tick logic - runs every second when playing
  });
  
  return { gameState, score, /* ... */ };
}

// Component with useScope for auto-cleanup
function MyGame() {
  const $game = useScope(myGameLogic);
  
  return rx(() => {
    // Reactive rendering
  });
}
```

## 📱 Screenshots

### Home Screen
![Home](./screenshots/home.png)

### Game Dashboard
![Dashboard](./screenshots/dashboard.png)

### Typing Adventure
![Typing](./screenshots/typing.png)

### Memory Match
![Memory](./screenshots/memory.png)

### Road Racer
![Racing](./screenshots/racing.png)

### Math Quest
![Math](./screenshots/math.png)

### Parent Dashboard
![Parent](./screenshots/parent.png)

### Device Sync
![Sync](./screenshots/sync.png)

## 📄 License

MIT

---

Built with ❤️ using [Rextive](../rextive)

