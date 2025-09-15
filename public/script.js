let isFirstMessage = true;
let isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// API Configuration - will work with both local development and deployed versions
const API_BASE_URL = isProduction 
    ? 'https://my-awesome-project-production-a651.up.railway.app'
    : 'http://localhost:8000';

// Connection status management
let connectionStatus = 'connecting';

function updateStatus(status, text) {
    connectionStatus = status;
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
}

// Check backend health on load
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (response.ok) {
            updateStatus('', 'Tilkoblet');
            return true;
        } else {
            throw new Error('Backend ikke tilgjengelig');
        }
    } catch (error) {
        console.warn('Backend health check failed:', error);
        updateStatus('error', 'Frakoblet');
        return false;
    }
}

// User actions
function openSettings() {
    alert('Innstillinger - kommer snart');
}

function logout() {
    if (confirm('Er du sikker på at du vil logge ut?')) {
        alert('Logger ut...');
        // Her kan du implementere logout-logikk
    }
}

// Chat functions
function selectAction(prompt) {
    document.getElementById('mainMessageInput').value = prompt;
    startChat(prompt);
}

function startChat(message = null) {
    const initialView = document.getElementById('initialView');
    const chatContainer = document.getElementById('chatContainer');
    
    initialView.classList.add('hidden');
    chatContainer.classList.add('active');
    
    if (message) {
        addMessage('user', message);
        processMessage(message);
    }
}

function attachFile() {
    alert('Filvedlegg - implementeres snart for dokumenter og tegninger');
}

function toggleVoice() {
    alert('Stemmeopptak - kommer i neste versjon');
}

function addMessage(type, content) {
    const messages = document.getElementById('messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // Skjul avatarer (moderne approach)
    const avatar = type === 'ai' ? '🤖' : '👤';
    const formattedContent = content.replace(/\n/g, '<br>');
    
    // Dynamisk styling basert på tekstlengde
    let dynamicClass = '';
    if (type === 'user') {
        if (content.length > 30 || content.includes('\n')) {
            dynamicClass = 'data-length="long"';
        }
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="display: none;">${avatar}</div>
        <div class="message-content" ${dynamicClass}>
            ${formattedContent}
        </div>
    `;
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Smooth scroll animation
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    
    requestAnimationFrame(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    });
}

function addTypingIndicator() {
    const messages = document.getElementById('messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing-message';
    typingDiv.innerHTML = `
        <div class="message-avatar" style="display: none;">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                Søker
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
    return typingDiv;
}

function removeTypingIndicator(typingDiv) {
    if (typingDiv && typingDiv.parentNode) {
        // Smooth fade out
        typingDiv.style.transition = 'opacity 0.2s ease';
        typingDiv.style.opacity = '0';
        setTimeout(() => {
            if (typingDiv.parentNode) {
                typingDiv.parentNode.removeChild(typingDiv);
            }
        }, 200);
    }
}

async function processMessage(question) {
    const typingIndicator = addTypingIndicator();
    updateStatus('connecting', 'Spør AI...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: question,
                context: "etcs"
            }),
            mode: 'cors'  // Important for cross-origin requests
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Ukjent feil' }));
            throw new Error(`API Error ${response.status}: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        
        removeTypingIndicator(typingIndicator);
        updateStatus('', 'Tilkoblet');
        
        // Use the full response data
        const aiResponse = data.response || 'Beklager, jeg kunne ikke generere et svar.';
        
        // Optionally show additional info from the API
        let fullMessage = aiResponse;
        if (data.sources > 0) {
            fullMessage += `\n\n📚 Basert på ${data.sources} dokument${data.sources !== 1 ? 'er' : ''} (${data.confidence} sikkerhet)`;
        }
        
        addMessage('ai', fullMessage);
        
    } catch (error) {
        console.error('API Error:', error);
        removeTypingIndicator(typingIndicator);
        updateStatus('error', 'Feil');
        
        // Better error handling for production
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            addMessage('ai', '❌ Kan ikke koble til RailAdvice AI backend. Sjekk internettforbindelsen.');
        } else if (error.message.includes('422')) {
            addMessage('ai', '❌ Ugyldig forespørsel. Prøv å omformulere spørsmålet ditt.');
        } else if (error.message.includes('500')) {
            addMessage('ai', '❌ Intern serverfeil. AI-systemet har problemer.');
        } else if (error.message.includes('cors')) {
            addMessage('ai', '❌ CORS-feil. Backend må konfigureres for å tillate forespørsler fra dette domenet.');
        } else {
            addMessage('ai', `❌ Feil: ${error.message}`);
        }
    }
}

function sendMessage() {
    const input = document.getElementById('chatMessageInput');
    
    if (!input.value.trim()) return;
    
    const question = input.value.trim();
    input.value = '';
    
    addMessage('user', question);
    processMessage(question);
    
    input.focus();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check backend health
    checkBackendHealth();
    
    // Log configuration for debugging
    console.log('Environment:', isProduction ? 'Production' : 'Development');
    console.log('API Base URL:', API_BASE_URL);

    // Handle Enter key in main input
    document.getElementById('mainMessageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const message = this.value.trim();
            if (message) {
                startChat(message);
            }
        }
    });

    // Handle Enter key in chat input
    document.getElementById('chatMessageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
});