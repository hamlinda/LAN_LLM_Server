# Antigravity Ollama Local Client

A modern, lightweight, and responsive web client for interacting with your local [Ollama](https://ollama.com/) server. This client provides a clean chat interface, live token streaming, adjustable inference settings, real-time performance metrics (TTFT, token speed), and chat history.

---

## 🏗️ Architecture Overview

The solution consists of three main components:

1. **Ollama Service (The LLM Engine)**:
   * Runs locally on your machine (typically listening on port `11434`).
   * Handles downloading, loading, and performing fast CPU/GPU inference on model files.
2. **Backend Proxy (`server.py`)**:
   * A built-in, lightweight Python 3 web server running on port `8080`.
   * Serves static assets (`index.html`, `style.css`, `app.js`) to your browser.
   * Resolves Cross-Origin Resource Sharing (CORS) security limitations by acting as a reverse proxy for `/api/*` requests directly to Ollama.
3. **Frontend Application (`index.html`, `style.css`, `app.js`)**:
   * A responsive user interface built using vanilla HTML/CSS and JavaScript.
   * Auto-detects the backend proxy connection to configure model fetching seamlessly.
   * Tracks local performance metrics during text generation and persists conversation history locally in your browser (`localStorage`).

---

## 🚀 Getting Started (How to Initiate Instance)

### 1. Ensure Ollama is Running
Before starting the web client, make sure Ollama is active on your host machine.
* Open your browser to [http://localhost:11434](http://localhost:11434). You should see the message: **"Ollama is running"**.
* If it is not running, start it using:
  ```bash
  ollama serve
  ```

### 2. Launch the Backend Server
Start the lightweight Python server to host the client files and initialize the API proxy.
Navigate to your project folder and run:
```bash
python3 server.py
```
*You should see output indicating that the server is listening at [http://127.0.0.1:8080/](http://127.0.0.1:8080/).*

### 3. Open the Client in Your Browser
Open your browser and navigate to:
👉 **[http://127.0.0.1:8080/](http://127.0.0.1:8080/)**

---

## 🎨 Key Features

* **Model Management**: Automatically fetches and lists all your locally downloaded Ollama models in a dropdown menu.
* **Stream & Full Modes**: Toggle between real-time token streaming and receiving the complete response at once.
* **Inference Settings**:
  * Customizable **System Prompt** to define LLM behavior/persona.
  * Adjust parameters such as **Temperature**, **Top P**, **Top K**, and **Max Tokens**.
* **Metrics Dashboard**: Monitors:
  * **TTFT** (Time to First Token)
  * **Speed** (tokens per second)
  * **Duration** (total response time)
  * **Tokens** (number of generated tokens)
* **Local Chat History**: Automatically saves your conversations to browser storage so you can retrieve or clear them later.
* **Responsive Layout**: Designed with a collapsible sidebar for optimized display on both mobile and desktop screens.
