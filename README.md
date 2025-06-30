
# Pictionary Game

A real-time multiplayer Pictionary game built with React and TypeScript. Players can join from both mobile devices and web browsers to draw and guess together in real-time.

## Features

- 🎨 **Real-time Drawing Canvas** - Smooth drawing experience on both mobile and desktop
- 📱 **Cross-Platform** - Works seamlessly on mobile devices and web browsers
- 👥 **Multiplayer Rooms** - Join existing rooms or create new ones
- 🎯 **Turn-based Gameplay** - Take turns drawing and guessing
- 💬 **Live Chat & Guesses** - Real-time communication and guess submission
- 🏆 **Scoring System** - Track player scores and rankings
- 🎨 **Drawing Tools** - Multiple colors, brush sizes, and eraser tool

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pictionary-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:8080`
   - The game will be running locally

### Mobile Testing

To test the mobile experience:

1. **Find your local IP address**
   ```bash
   # On Windows ipconfig
   
   # On Mac/Linux
   ifconfig
   ```

2. **Access from mobile device**
   - Connect your mobile device to the same WiFi network
   - Open browser and navigate to `http://YOUR_IP_ADDRESS:8080`

## How to Play

1. **Join a Game**
   - Enter your name
   - Enter a room code to join an existing room or create a new one

2. **Draw Your Turn**
   - When it's your turn, you'll see a word to draw
   - Use the drawing tools (colors, brush sizes, eraser)
   - Draw the word while others guess

3. **Guess Others' Drawings**
   - When others are drawing, type your guesses
   - Correct guesses earn you points
   - Watch the timer and make your guesses count!

## Game Architecture

### Frontend Components

- **GameLobby** - Main lobby for joining/creating rooms
- **GameRoom** - Active game interface with drawing canvas
- **DrawingCanvas** - Real-time drawing component with touch support
- **PlayerList** - Shows current players and scores
- **ChatBox** - Displays guesses and messages

### Key Features

- **Responsive Design** - Optimized for both mobile and desktop
- **Touch Support** - Full touch drawing capabilities for mobile devices
- **Real-time Updates** - Instant synchronization between players
- **Room Management** - Easy room creation and joining

## For Real-time Multiplayer

**Important Note**: This current version includes the UI and game logic, but for full real-time multiplayer functionality, you'll need to connect to a backend service.

### Recommended: Supabase Integration

For real-time features like:
- Live drawing synchronization
- Real-time chat and guesses
- Room management
- Player state sync

I recommend connecting this project to Supabase for the backend functionality:

1. Click the green "Supabase" button in the Lovable interface
2. Connect to your Supabase project
3. This will enable real-time database features for multiplayer sync

### Environment Setup

Create a `.env` file in the root directory (when using Supabase):

```env
# Supabase Configuration (obtained from Supabase dashboard)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Notes

- **Mobile-First Design** - Optimized for touch interactions
- **Cross-Browser Compatible** - Works on modern mobile browsers
- **Responsive Layout** - Adapts to different screen sizes
- **Performance Optimized** - Smooth drawing and real-time updates

## Technologies Used

- **React 18** - Frontend framework
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI components
- **Lucide React** - Beautiful icons
- **Vite** - Fast development build tool

## Deployment

The game can be deployed to any static hosting service:

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your preferred hosting service:
   - Vercel
   - Netlify
   - GitHub Pages
   - Any static hosting provider

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both mobile and desktop
5. Submit a pull request

## License

This project is open source and available under the MIT License.
