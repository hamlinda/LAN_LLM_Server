/**
 * Antigravity Ollama Local Client - app.js
 * Core application logic, API integrations, stream reader, and UI updates.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
  const appSidebar = document.getElementById('app-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  const serverUrlInput = document.getElementById('server-url-input');
  const statusBadge = document.getElementById('status-badge');
  const reloadModelsBtn = document.getElementById('reload-models-btn');
  const modelSelect = document.getElementById('model-select');
  
  const modeStream = document.getElementById('mode-stream');
  const systemPromptTextarea = document.getElementById('system-prompt-textarea');
  
  const temperatureSlider = document.getElementById('temperature-slider');
  const temperatureValue = document.getElementById('temperature-value');
  const topPSlider = document.getElementById('top-p-slider');
  const topPValue = document.getElementById('top-p-value');
  const topKSlider = document.getElementById('top-k-slider');
  const topKValue = document.getElementById('top-k-value');
  const maxTokensInput = document.getElementById('max-tokens-input');
  
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const historyListContainer = document.getElementById('history-list-container');
  const showCorsDialogBtn = document.getElementById('show-cors-dialog-btn');
  const connectionErrorTip = document.getElementById('connection-error-tip');
  const openCorsGuideLink = document.getElementById('open-cors-guide-link');
  
  const metricsTtft = document.getElementById('metrics-ttft');
  const metricsTps = document.getElementById('metrics-tps');
  const metricsDuration = document.getElementById('metrics-duration');
  const metricsTokens = document.getElementById('metrics-tokens');
  
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatEmptyState = document.getElementById('chat-empty-state');
  const promptTextarea = document.getElementById('prompt-textarea');
  const sendBtn = document.getElementById('send-btn');
  const stopBtn = document.getElementById('stop-btn');
  
  const corsDialog = document.getElementById('cors-dialog');
  const closeCorsDialogBtn = document.getElementById('close-cors-dialog-btn');
  const dialogGotItBtn = document.getElementById('dialog-got-it-btn');

  // --- App State Variables ---
  let abortController = null;
  let chatHistory = [];
  let isGenerating = false;
  let connectionTimeout = null;

  // --- Initialize App ---
  initHistory();
  bindEvents();
  debouncedServerCheck();

  // --- Events Binding ---
  function bindEvents() {
    // Mobile Sidebar Drawer
    mobileSidebarToggle.addEventListener('click', toggleMobileSidebar);
    sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Server URL & Model Reload
    serverUrlInput.addEventListener('input', () => {
      clearTimeout(connectionTimeout);
      connectionTimeout = setTimeout(debouncedServerCheck, 800);
    });
    reloadModelsBtn.addEventListener('click', checkServerConnection);

    // Param sliders visual values
    temperatureSlider.addEventListener('input', (e) => {
      temperatureValue.textContent = e.target.value;
    });
    topPSlider.addEventListener('input', (e) => {
      topPValue.textContent = e.target.value;
    });
    topKSlider.addEventListener('input', (e) => {
      topKValue.textContent = e.target.value;
    });

    // Send and abort controls
    sendBtn.addEventListener('click', handleSend);
    promptTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    promptTextarea.addEventListener('input', autoResizeTextarea);
    stopBtn.addEventListener('click', handleAbort);

    // History cleaning
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Dialog listeners
    showCorsDialogBtn.addEventListener('click', () => corsDialog.showModal());
    if (openCorsGuideLink) {
      openCorsGuideLink.addEventListener('click', (e) => {
        e.preventDefault();
        corsDialog.showModal();
      });
    }
    closeCorsDialogBtn.addEventListener('click', () => corsDialog.close());
    dialogGotItBtn.addEventListener('click', () => corsDialog.close());
    
    // Enable/disable send based on prompt input and model loaded
    promptTextarea.addEventListener('input', validateInputs);
    modelSelect.addEventListener('change', validateInputs);
  }

  // --- Textarea Autoresize ---
  function autoResizeTextarea() {
    promptTextarea.style.height = 'auto';
    promptTextarea.style.height = `${promptTextarea.scrollHeight}px`;
  }

  // --- Mobile Drawer Controls ---
  function toggleMobileSidebar() {
    appSidebar.classList.toggle('active');
  }

  function closeMobileSidebar() {
    appSidebar.classList.remove('active');
  }

  // --- Server Check & Models Loading ---
  function debouncedServerCheck() {
    checkServerConnection();
  }

  async function checkServerConnection() {
    let serverUrl = serverUrlInput.value.trim();
    
    // Set loading state
    statusBadge.replaceChildren();
    statusBadge.className = 'status-badge';
    const span = document.createElement('span');
    span.textContent = 'Checking...';
    statusBadge.appendChild(span);
    
    // Auto-detect relative proxy if running via HTTP and using default settings
    const isLocalDefault = !serverUrl || serverUrl.includes('127.0.0.1:11434') || serverUrl.includes('localhost:11434');
    if (isLocalDefault && window.location.protocol.startsWith('http')) {
      try {
        const relativeResponse = await fetch('/api/tags', { method: 'GET' });
        if (relativeResponse.ok) {
          const data = await relativeResponse.json();
          // Proxy succeeded!
          statusBadge.className = 'status-badge status-online';
          statusBadge.textContent = 'Online (Proxy)';
          serverUrlInput.value = window.location.origin;
          if (connectionErrorTip) {
            connectionErrorTip.classList.add('hidden');
          }
          populateModels(data.models || []);
          return;
        }
      } catch (e) {
        // Fall back to direct connection fetch
      }
    }
    
    // Standard direct connection probe
    let targetUrl = serverUrl || 'http://127.0.0.1:11434';
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'http://' + targetUrl;
    }
    
    try {
      const response = await fetch(`${targetUrl}/api/tags`, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      
      // Connection success
      statusBadge.className = 'status-badge status-online';
      statusBadge.textContent = 'Online';
      if (connectionErrorTip) {
        connectionErrorTip.classList.add('hidden');
      }
      
      populateModels(data.models || []);
    } catch (err) {
      // Connection fail
      statusBadge.className = 'status-badge status-offline';
      statusBadge.textContent = 'Offline';
      if (connectionErrorTip) {
        connectionErrorTip.classList.remove('hidden');
      }
      
      modelSelect.replaceChildren();
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'No models available';
      modelSelect.appendChild(defaultOpt);
      modelSelect.disabled = true;
      validateInputs();
    }
  }

  function populateModels(models) {
    modelSelect.replaceChildren();
    
    if (models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No models found';
      modelSelect.appendChild(option);
      modelSelect.disabled = true;
    } else {
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        // Format size: e.g. "llama3:latest (4.7 GB)"
        const sizeGB = model.size ? ` (${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB)` : '';
        option.textContent = `${model.name}${sizeGB}`;
        modelSelect.appendChild(option);
      });
      modelSelect.disabled = false;
    }
    
    validateInputs();
  }

  function validateInputs() {
    const hasPrompt = promptTextarea.value.trim().length > 0;
    const hasModel = modelSelect.value !== '';
    sendBtn.disabled = !hasPrompt || !hasModel || isGenerating;
  }

  // --- Safe Message Parser/Renderer (XSS Prevention) ---
  // Renders text content safely splitting it into standard paragraphs and code blocks
  function renderMessageContent(container, text) {
    container.replaceChildren();
    
    if (!text) return;
    
    // Split by triple backticks to identify code blocks
    const segments = text.split(/```/g);
    
    segments.forEach((segment, index) => {
      const isCodeBlock = index % 2 !== 0;
      
      if (isCodeBlock) {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Find if a language is specified
        const lines = segment.split('\n');
        let codeText = segment;
        
        if (lines.length > 0 && lines[0].trim().length < 15 && !lines[0].includes(' ') && lines[0].trim() !== '') {
          const lang = lines[0].trim();
          code.setAttribute('data-lang', lang);
          codeText = lines.slice(1).join('\n');
        }
        
        code.textContent = codeText;
        pre.appendChild(code);
        container.appendChild(pre);
      } else {
        // Standard markdown blocks - split by double newline for paragraphs
        const paragraphs = segment.split(/\n\n+/g);
        
        paragraphs.forEach(paraText => {
          const trimmedPara = paraText.trim();
          if (trimmedPara.length === 0) return;
          
          const p = document.createElement('p');
          
          // Check for inline code `code` within paragraph
          const inlineParts = trimmedPara.split(/`/g);
          if (inlineParts.length > 1) {
            inlineParts.forEach((part, partIndex) => {
              const isInlineCode = partIndex % 2 !== 0;
              if (isInlineCode) {
                const inlineCode = document.createElement('code');
                inlineCode.textContent = part;
                p.appendChild(inlineCode);
              } else {
                p.appendChild(document.createTextNode(part));
              }
            });
          } else {
            p.textContent = trimmedPara;
          }
          
          container.appendChild(p);
        });
      }
    });
  }

  // --- Send Query to Ollama ---
  async function handleSend() {
    if (isGenerating) return;
    
    let serverUrl = serverUrlInput.value.trim() || 'http://127.0.0.1:11434';
    if (!/^https?:\/\//i.test(serverUrl)) {
      serverUrl = 'http://' + serverUrl;
    }
    
    // Determine target API endpoint URL (relative if proxy is used)
    let requestUrl = `${serverUrl}/api/generate`;
    if (serverUrl === window.location.origin || serverUrl === window.location.host || serverUrl === '/' || serverUrl === '') {
      requestUrl = '/api/generate';
    }
    
    const model = modelSelect.value;
    const prompt = promptTextarea.value.trim();
    const isStream = modeStream.checked;
    
    if (!model || !prompt) return;

    // Set UI Generation State
    isGenerating = true;
    validateInputs();
    stopBtn.classList.remove('hidden');
    
    // Reset performance metrics
    metricsTtft.textContent = '0ms';
    metricsTps.textContent = '0.0 t/s';
    metricsDuration.textContent = '0.0s';
    metricsTokens.textContent = '0';
    
    // Hide empty state welcome screen
    if (chatEmptyState) {
      chatEmptyState.classList.add('hidden');
    }
    
    // Add user message bubble
    appendMessageBubble('user', prompt);
    
    // Clear prompt input & reset size
    promptTextarea.value = '';
    autoResizeTextarea();
    
    // Add assistant bubble with typing indicator
    const assistantBubble = appendMessageBubble('assistant', '');
    const typingIndicator = createTypingIndicator();
    assistantBubble.appendChild(typingIndicator);
    
    // Scroll chat viewport to bottom
    scrollToBottom();
    
    // Parameters extraction
    const systemPrompt = systemPromptTextarea.value.trim();
    const temperature = parseFloat(temperatureSlider.value);
    const topP = parseFloat(topPSlider.value);
    const topK = parseInt(topKSlider.value, 10);
    const maxTokens = parseInt(maxTokensInput.value, 10);
    
    const requestOptions = {
      temperature,
      top_p: topP,
      top_k: topK
    };
    if (!isNaN(maxTokens)) {
      requestOptions.num_predict = maxTokens;
    }

    const payload = {
      model: model,
      prompt: prompt,
      stream: isStream,
      options: requestOptions
    };
    
    if (systemPrompt) {
      payload.system = systemPrompt;
    }
    
    abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime = null;
    let accumulatedText = '';
    let tokenCount = 0;
    
    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`Ollama Server returned HTTP ${response.status}`);
      }
      
      // Remove typing indicator once content starts
      typingIndicator.remove();
      
      if (isStream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Split buffer by newlines to parse NDJSON lines
          const lines = buffer.split('\n');
          
          // Keep the last partial line in the buffer
          buffer = lines.pop();
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) continue;
            
            try {
              const parsed = JSON.parse(trimmedLine);
              
              if (!firstTokenTime) {
                firstTokenTime = performance.now();
                const ttftVal = Math.round(firstTokenTime - startTime);
                metricsTtft.textContent = `${ttftVal}ms`;
              }
              
              if (parsed.response) {
                accumulatedText += parsed.response;
                tokenCount++;
                
                // Live rendering of the growing text safely
                renderMessageContent(assistantBubble, accumulatedText);
                
                // Real-time speed metrics
                const now = performance.now();
                const totalSeconds = (now - startTime) / 1000;
                metricsDuration.textContent = `${totalSeconds.toFixed(1)}s`;
                metricsTokens.textContent = tokenCount;
                
                const genSeconds = (now - firstTokenTime) / 1000;
                if (genSeconds > 0) {
                  const tps = tokenCount / genSeconds;
                  metricsTps.textContent = `${tps.toFixed(1)} t/s`;
                }
              }
              
              // If stream is finished, parse final metrics
              if (parsed.done) {
                if (parsed.total_duration) {
                  metricsDuration.textContent = `${(parsed.total_duration / 1e9).toFixed(2)}s`;
                }
                if (parsed.eval_count) {
                  metricsTokens.textContent = parsed.eval_count;
                  if (parsed.eval_duration) {
                    const finalTps = parsed.eval_count / (parsed.eval_duration / 1e9);
                    metricsTps.textContent = `${finalTps.toFixed(1)} t/s`;
                  }
                }
              }
            } catch (jsonErr) {
              // Ignore single line parse failure
            }
          }
          scrollToBottom();
        }
      } else {
        // Non-streaming response mode
        const resultData = await response.json();
        
        const finishTime = performance.now();
        const ttftVal = Math.round(finishTime - startTime);
        metricsTtft.textContent = `${ttftVal}ms`;
        
        accumulatedText = resultData.response || '';
        renderMessageContent(assistantBubble, accumulatedText);
        
        // Populate final metrics
        if (resultData.total_duration) {
          metricsDuration.textContent = `${(resultData.total_duration / 1e9).toFixed(2)}s`;
        } else {
          metricsDuration.textContent = `${((finishTime - startTime) / 1000).toFixed(2)}s`;
        }
        
        if (resultData.eval_count) {
          metricsTokens.textContent = resultData.eval_count;
          if (resultData.eval_duration) {
            const finalTps = resultData.eval_count / (resultData.eval_duration / 1e9);
            metricsTps.textContent = `${finalTps.toFixed(1)} t/s`;
          }
        } else {
          metricsTokens.textContent = 'N/A';
          metricsTps.textContent = 'N/A';
        }
      }
      
      // Save item to history
      saveToHistory(model, prompt, accumulatedText);
      
    } catch (error) {
      if (typingIndicator) typingIndicator.remove();
      
      if (error.name === 'AbortError') {
        const italic = document.createElement('i');
        italic.textContent = ' (Generation stopped by user)';
        assistantBubble.appendChild(italic);
      } else {
        const errDiv = document.createElement('div');
        errDiv.className = 'status-badge status-offline';
        errDiv.style.marginTop = '10px';
        errDiv.textContent = `Error: ${error.message}`;
        assistantBubble.appendChild(errDiv);
      }
    } finally {
      isGenerating = false;
      abortController = null;
      stopBtn.classList.add('hidden');
      validateInputs();
      scrollToBottom();
    }
  }

  // --- Stop / Abort Request ---
  function handleAbort() {
    if (abortController) {
      abortController.abort();
    }
  }

  // --- DOM Helpers for Chat UI ---
  function appendMessageBubble(sender, text) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (text) {
      renderMessageContent(bubble, text);
    }
    
    row.appendChild(bubble);
    chatMessagesContainer.appendChild(row);
    return bubble;
  }

  function createTypingIndicator() {
    const container = document.createElement('div');
    container.className = 'typing-indicator';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      container.appendChild(dot);
    }
    return container;
  }

  function scrollToBottom() {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  // --- History Management ---
  function initHistory() {
    const stored = localStorage.getItem('ollama_chat_history');
    if (stored) {
      try {
        chatHistory = JSON.parse(stored);
      } catch (e) {
        chatHistory = [];
      }
    }
    renderHistoryList();
  }

  function saveToHistory(model, prompt, response) {
    const historyItem = {
      id: Date.now().toString(),
      model: model,
      prompt: prompt,
      response: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Add to beginning of history list
    chatHistory.unshift(historyItem);
    
    // Keep max 20 items to prevent storage bloating
    if (chatHistory.length > 20) {
      chatHistory.pop();
    }
    
    localStorage.setItem('ollama_chat_history', JSON.stringify(chatHistory));
    renderHistoryList();
  }

  function renderHistoryList() {
    historyListContainer.replaceChildren();
    
    if (chatHistory.length === 0) {
      const emptyText = document.createElement('p');
      emptyText.className = 'empty-history-text';
      emptyText.textContent = 'No saved conversations';
      historyListContainer.appendChild(emptyText);
      return;
    }
    
    chatHistory.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.setAttribute('data-id', item.id);
      
      const modelSpan = document.createElement('div');
      modelSpan.className = 'history-item-model';
      modelSpan.textContent = `${item.model} • ${item.timestamp}`;
      
      const promptSpan = document.createElement('div');
      promptSpan.className = 'history-item-prompt';
      promptSpan.textContent = item.prompt;
      
      div.appendChild(modelSpan);
      div.appendChild(promptSpan);
      
      div.addEventListener('click', () => loadHistoryItem(item));
      
      historyListContainer.appendChild(div);
    });
  }

  function loadHistoryItem(item) {
    // Hide welcome state
    if (chatEmptyState) {
      chatEmptyState.classList.add('hidden');
    }
    
    // Clear chat viewport and append the loaded message pair
    chatMessagesContainer.replaceChildren();
    appendMessageBubble('user', item.prompt);
    appendMessageBubble('assistant', item.response);
    
    // Set matching model if available
    for (let i = 0; i < modelSelect.options.length; i++) {
      if (modelSelect.options[i].value === item.model) {
        modelSelect.selectedIndex = i;
        break;
      }
    }
    
    scrollToBottom();
    closeMobileSidebar();
  }

  function clearHistory() {
    chatHistory = [];
    localStorage.removeItem('ollama_chat_history');
    renderHistoryList();
  }
});
