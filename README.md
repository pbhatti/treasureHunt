# AR Treasure Hunt 🎮

An exciting outdoor AR treasure hunt game where players search for hidden QR codes to unlock magical treasures and collect coins!

## Features

- Real-world QR code scanning
- AR treasure chests that appear when QR codes are scanned
- Interactive 3D treasures with opening animations
- Floating coins to collect
- Progress tracking
- Win condition when all coins are collected

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A mobile device with AR capabilities
- 8th Wall API key (for QR code scanning)

## Setup

1. Clone this repository:
```bash
git clone <repository-url>
cd ar-treasure-hunt
```

2. Install dependencies:
```bash
npm install
```

3. Configure your environment:
   - Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_KEY` in `js/game.js` with your actual Supabase credentials
   - Add your 8th Wall API key to the project

4. Start the development server:
```bash
npm start
```

5. Access the game:
   - Open your mobile browser and navigate to `http://localhost:8080`
   - Allow camera access when prompted

## Game Instructions

1. Scan the Game Start QR Code to begin
2. Look for 3 hidden QR codes in your environment
3. Scan each QR code to reveal a magical treasure
4. Tap the treasure to open it
5. Collect the floating coin
6. Find all 3 coins to win!

## Technical Stack

- A-Frame (WebXR framework)
- Three.js (3D rendering)
- 8th Wall (AR & QR code scanning)
- Supabase (Backend & data storage)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 