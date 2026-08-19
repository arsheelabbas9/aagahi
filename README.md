# 🛡️ Aagahi — Spatial Intelligence & Hazard Orchestration Platform

Welcome to **Aagahi**, a full-stack, hardware-accelerated spatial routing and community safety platform. Operating as a "Central Nervous System" for urban environments, Aagahi integrates real-time anomaly reporting, complex OSRM pathfinding algorithms, and deep AI Vision scanning to proactively safeguard communities.

---

## 🏗️ System Architecture

Aagahi is built on a high-performance, decoupled architecture:

- **Backend:** Python, FastAPI, Uvicorn, PostgreSQL (PostGIS) via Supabase Cloud
- **Frontend:** React Native, Expo, TypeScript, React Native Maps
- **AI Engine:** Groq Cloud (Qwen 3.6 27B Vision) for real-time room safety telemetry
- **Routing Engine:** Open Source Routing Machine (OSRM) with custom hazard-evasion logic

---

## ✨ The 5 Core Pillars

1. **Titanium Identity Gatekeeper** — Multi-role authentication (Citizen, Warden, Shopkeeper) with strict row-level security and Supabase integration.
2. **Community Spatial Dashboard** — A 60FPS native map engine that calculates safe navigational routes by mathematically evading dynamic hazard epicenters in real-time.
3. **AI Optical Scanner** — A dual-scanner system featuring a multi-angle AI Vision wizard. It captures physical infrastructure, processes it through Groq's ViT encoders, and generates localized safety telemetry.
4. **Community Fund & Chat** — Real-time neighborhood communication and integrated public crowdfunding campaigns for infrastructure repair.
5. **User Telemetry Hub** — A composite data aggregator capturing human-intelligence surveys, dynamic compliance scoring, and unified activity timelines.

---

## 🚀 Evaluator Setup & Execution Guide

Follow these precise steps to run the application on your local machine and a physical mobile device in under 5 minutes.

### Phase 1: System Prerequisites

Ensure your computer has the following installed before beginning:

- **Node.js** (v18+)
- **Python** (v3.9+)
- **Expo Go App** — download the free **Expo Go** app from the Apple App Store (iOS) or Google Play Store (Android) on your physical smartphone

> **⚠️ CRITICAL REQUIREMENT:** Your computer and your mobile phone **must** be connected to the exact same Wi-Fi network for the application to communicate locally.

---

### Phase 2: Clone & Configure AI Keys

**1. Download the code:**

```bash
git clone https://github.com/arsheelabbas9/aagahi.git Aagahi_Project
cd Aagahi_Project
```

**2. Create the AI configuration file:**

Because security keys are strictly hidden from GitHub repositories, you must create a local configuration file for the AI Optical Scanner to function.

- Inside the `Aagahi_Project` root folder, create a new text file named exactly `.env` (don't forget the leading period).
- Open the `.env` file and paste the following line into it, replacing the placeholder with your actual Groq key:

```
GROQ_API_KEY=gsk_your_actual_api_key_goes_here
```

- Save and close the `.env` file.

---

### Phase 3: Boot the Backend (Central Nervous System)

The Python backend handles the database, spatial routing, and AI processing.

**1. Install Python requirements:**

```bash
pip install fastapi uvicorn supabase pydantic pillow groq
```

**2. Start the server:**

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

You should see a message saying `Application startup complete`. Leave this terminal open and running in the background.

---

### Phase 4: Link the Mobile App to Your Computer

The mobile application needs to know your computer's local IP address to talk to the backend.

**1. Find your computer's IP address:**

- **Windows:** open a new Command Prompt and run `ipconfig`. Look for the IPv4 Address (e.g. `192.168.1.15`).
- **Mac:** open a new Terminal and run `ifconfig | grep inet`. Look for the address starting with `192.168.x.x` or `10.x.x.x`.

**2. Update the app configuration:**

- Open the `Aagahi_Project` folder in your code editor.
- Navigate to `aagahi-app/src/config/api.ts`.
- Update the `API_BASE_URL` line to match your computer's IP address:

```typescript
// Replace 192.168.1.15 with YOUR actual local IP address
export const API_BASE_URL = 'http://192.168.1.15:8000';
```

- Save the file.

---

### Phase 5: Boot the Mobile Frontend

**1. Install app dependencies:**

```bash
cd aagahi-app
npm install
```

**2. Start the mobile server:**

```bash
npx expo start -c
```

**3. Open on your phone:**

A QR code will appear in your terminal.

- **iPhone:** open the default Camera app and scan the QR code, then tap the yellow "Open in Expo Go" popup at the top of the screen.
- **Android:** open the Expo Go app and tap "Scan QR Code" from the main menu.

The app will download the JavaScript bundle to your phone, load past the boot screen, and connect to your local backend automatically.

---

## 🧪 Evaluation Testing Pathway

Once the Aagahi app boots on your phone, test the following core flows:

1. **Identity Gatekeeper** — Register a new user profile natively as a Citizen, Warden, or Shopkeeper.
2. **Spatial Dashboard** — View active hazards on the interactive, hardware-accelerated map.
3. **Safe Routing** — Tap "Navigate" on the map to generate paths that dynamically evade known hazard epicenters using the custom routing algorithm.
4. **AI Optical Scanner** — From the home dashboard, tap "Optical Scanner" and point your camera at a physical room to test the Groq Qwen 3.6 AI Vision pipeline in real time.

---

*Built by the Aagahi Spatial Division.*