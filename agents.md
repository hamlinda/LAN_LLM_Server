# Ollama Local Server - Architecture & UI Elements Catalog

This document details the system architecture, solution view, and a complete catalog of User Interface (UI) elements for the Antigravity Ollama Local Client.

---

## 🏗️ Architecture & Solution View

The solution follows a standard client-proxy-target architecture, specifically designed to bypass browser CORS (Cross-Origin Resource Sharing) restrictions while maintaining a lightweight, zero-dependency local footprint.

### 1. Target Service (Ollama Local Engine)
*   **Role:** The core Large Language Model (LLM) execution environment.
*   **Location:** Runs locally on the host machine (typically `http://127.0.0.1:11434`).
*   **Function:** Handles model management, loading models into memory (CPU/GPU), and performing inference based on incoming `/api/generate` requests.

### 2. Backend Proxy Server (`server.py`)
*   **Role:** Static file server and API reverse proxy.
*   **Implementation:** Pure Python 3 using `http.server` and `urllib` (no external dependencies like Flask or FastAPI required).
*   **Port:** Listens on port `8080` (configurable).
*   **Functions:**
    *   **Static Assets:** Serves the frontend client (`index.html`, `app.js`, `style.css`) to the browser.
    *   **Proxy Routing:** Intercepts requests starting with `/api/` (except logging) and proxies them directly to the Target Service (Ollama).
    *   **CORS Management:** Automatically injects `Access-Control-Allow-Origin: *` headers into proxy responses to allow the browser frontend to read the data without CORS errors.
    *   **Logging (`/api/log`):** Provides a dedicated endpoint to receive performance and usage metrics from the frontend, appending them to a CSV log file at `logs/inference.log`.

### 3. Frontend Application (`index.html`, `style.css`, `app.js`)
*   **Role:** The user-facing client interface.
*   **Implementation:** Vanilla HTML5, CSS3, and JavaScript (ES6+). No build tools, React, or heavy frameworks used.
*   **Functions:**
    *   **State Management:** Manages UI states, user inputs, and local chat history using the browser's `localStorage`.
    *   **Streaming Inference:** Uses the native `Fetch API` and `ReadableStream` to parse chunked NDJSON responses from the proxy, providing a real-time typewriter effect.
    *   **Metrics Calculation:** Dynamically computes Time-to-First-Token (TTFT), Tokens Per Second (TPS), and total generation duration.

---

## 🎨 UI Elements Catalog

The interface is divided into functional regions to provide a clean workspace. Below is a comprehensive identification of all interactive and display elements.

### 1. Sidebar Panel (`#app-sidebar`)
The sidebar controls server connections, model selection, and generation parameters.

*   **Server Connection (`.config-card`)**
    *   `#server-url-input`: Text input for the Ollama/Proxy server address (default: `http://127.0.0.1:11434`).
    *   `#status-badge`: Visual indicator showing connection status (`Online`, `Online (Proxy)`, or `Offline`).
    *   `#reload-models-btn`: Icon button to manually trigger a connection check and model refresh.
    *   `#connection-error-tip`: Hidden by default. Displays when connection fails.
    *   `#open-cors-guide-link`: Link within the error tip to open the CORS guide.

*   **Model Selection (`.config-card`)**
    *   `#model-select`: Dropdown `<select>` listing all available installed models. Disabled if the server is unreachable.

*   **Execution Mode (`.config-card`)**
    *   `#mode-stream`: Radio button to enable real-time streaming output (default).
    *   `#mode-full`: Radio button to wait for the complete response before rendering.

*   **Inference Settings (`.accordion-details`)**
    *   `#system-prompt-textarea`: Textarea for defining the system persona or instructions.
    *   `#temperature-slider` & `#temperature-value`: Range slider (0.0 to 2.0) to control output randomness.
    *   `#top-p-slider` & `#top-p-value`: Range slider (0.0 to 1.0) for nucleus sampling.
    *   `#top-k-slider` & `#top-k-value`: Range slider (1 to 100) to limit candidate token selection.
    *   `#max-tokens-input`: Number input for `num_predict` to restrict output length.

*   **Chat History (`.history-card`)**
    *   `#clear-history-btn`: Button to permanently delete all saved history from `localStorage`.
    *   `#history-list-container`: Container populated dynamically with past conversation items (divs).

*   **Sidebar Footer**
    *   `#show-cors-dialog-btn`: Button linking to the troubleshooting dialog.

### 2. Main Workspace (`.chat-container`)
The central area dedicated to chat interaction and metric monitoring.

*   **Metrics Dashboard (`.metrics-bar`)**
    *   `#clear-chat-btn`: Button to clear the current chat viewport and reset metrics.
    *   `#metrics-ttft`: Display span for Time-to-First-Token in milliseconds.
    *   `#metrics-tps`: Display span for generation speed in Tokens Per Second.
    *   `#metrics-duration`: Display span for total response time in seconds.
    *   `#metrics-tokens`: Display span for total tokens generated.

*   **Chat Viewport (`#chat-messages-container`)**
    *   `#chat-empty-state`: The initial welcome screen showing instructions. Hidden once a chat starts.
    *   **Message Bubbles (`.message-row`)**: Dynamically generated containers for User and Assistant messages. Contains Markdown-rendered text and save buttons.
    *   **Typing Indicator (`.typing-indicator`)**: Animated dots shown while waiting for the first token.

*   **Input Bar (`.chat-input-wrapper`)**
    *   `#prompt-textarea`: Auto-resizing textarea for user input. Submits on `Enter`, new line on `Shift+Enter`.
    *   `#send-btn`: Primary action button to dispatch the prompt to the model. Disabled when input is empty, no model is selected, or generation is active.
    *   `#stop-btn`: Action button to abort the current generation stream. Visible only during active generation.

### 3. Mobile Navigation & Overlays
Elements specific to smaller viewport sizes and overlay dialogs.

*   `#mobile-sidebar-toggle`: Hamburger menu button visible only on mobile to open the sidebar.
*   `#sidebar-overlay`: Darkened backdrop behind the sidebar on mobile. Clicking it closes the sidebar.
*   `#mobile-connection-banner`: Red banner appearing at the top of the chat view on mobile if the connection fails.
*   `#mobile-server-url-input`: Mobile-specific input field mirrored with the sidebar server URL input.
*   `#mobile-reload-btn`: Mobile-specific retry connection button.

### 4. Dialogs / Modals
*   **CORS Connection Guide (`#cors-dialog`)**
    *   Native `<dialog>` element providing instructions for resolving network and CORS errors.
    *   `#close-cors-dialog-btn`: The 'X' icon button to close the modal.
    *   `#dialog-got-it-btn`: Primary action button to close the modal.
