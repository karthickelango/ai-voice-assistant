# Karthick AI / Thruv - Voice Assistant

A voice-first AI assistant powered by Google Gemini 2.5 Flash, featuring hands-free wake word activation ("Hey Thruv"), real-time weather forecasting via Open-Meteo, YouTube music playback with voice controls, and natural female voice synthesis.

---

## 📋 Prerequisites

Before running the application locally, ensure you have:

1. **Node.js**: v18.0.0 or higher (v20+ or v22+ LTS recommended). Check with:
   ```bash
   node -v
   npm -v
   ```
2. **Google Chrome / Chromium Browser**: Required for full **Web Speech API** support (`SpeechRecognition` / `webkitSpeechRecognition` and `SpeechSynthesis`).
3. **Google Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/apikey).
4. **Working Microphone**: Required for wake word and voice commands.

---

## 🚀 Quick Start (Local Setup)

### 1. Extract or Clone the Project
Open your terminal in the project directory:
```bash
cd /path/to/karthick-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to a new `.env` file:
```bash
cp .env.example .env
```

Open `.env` in your code editor and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```
*(Note: Weather uses Open-Meteo and music uses YouTube streaming without requiring extra API keys).*

### 4. Start the Development Server
```bash
npm run dev
```

The server will start up on `http://localhost:3000`.

### 5. Open in Google Chrome & Log In
Navigate to:
```
http://localhost:3000
```

1. **Log in** with the secure credentials:
   - **User Name**: `Assistant_AI`
   - **Password**: `Thruv@2023`
   *(Or click the one-touch auto-fill button on the login screen).*
2. **Grant Browser Permissions**:
   Upon logging in, the browser will automatically prompt you for:
   - **Microphone Access**: Click **"Allow"** to enable speech recognition and the *"Hey Thruv"* wake word.
   - **Location Access**: Click **"Allow"** to enable real-time local weather forecasts and regional queries.
3. Say **"Hey Thruv"** to trigger voice listening.
4. Speak your request:
   - *"Play Believer"*
   - *"Play some Ilaiyaraaja"*
   - *"What's the weather in Coimbatore?"*
   - *"Pause the music"* / *"Resume"* / *"Stop the music"*

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express + Vite server in development mode (`http://localhost:3000`) |
| `npm run build` | Compiles the React frontend to `dist/` and bundles the backend server into `dist/server.cjs` |
| `npm start` | Runs the compiled production server (`dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |

---

## 💡 Troubleshooting & Tips

- **Microphone Not Detected**: Ensure your browser has granted microphone access to `http://localhost:3000` (check the lock/tune icon in the address bar).
- **Voice Recognition (STT)**: Use Google Chrome, Edge, or Brave. Firefox and Safari have limited support for the continuous Web Speech Recognition API.
- **Audio Output**: Browsers block audio autoplay until the user performs an initial interaction on the page. Click once on the screen to initialize the audio context.
