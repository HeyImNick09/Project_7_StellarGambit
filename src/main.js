// Main Application Entry Point
class ChessClashApp {
    constructor() {
        this.gameUI = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize the game UI
            this.gameUI = new GameUI();
            
            // Apply saved settings
            this.gameUI.applySettings();
            
            // Show welcome message
            this.showWelcomeMessage();
            
            this.isInitialized = true;
            console.log('🌌 Stellar Gambit initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize Stellar Gambit:', error);
            this.showErrorMessage('Failed to initialize the game. Please refresh the page.');
        }
    }

    showWelcomeMessage() {
        // Create a temporary welcome overlay
        const welcomeOverlay = document.createElement('div');
        welcomeOverlay.className = 'welcome-overlay';
        welcomeOverlay.innerHTML = `
            <div class="welcome-content">
                <h1>🌌 Welcome to Stellar Gambit!</h1>
                <p>🌌 Prepare for an epic space chess adventure</p>
                <div class="welcome-features">
                    <div class="feature">🤖 Challenge AI opponents</div>
                    <div class="feature">🎓 Learn with assisted mode</div>
                    <div class="feature">🎨 Enjoy retro space aesthetics</div>
                </div>
                <button id="startGameBtn" class="start-btn">🎮 Start Your Journey</button>
            </div>
        `;

        // Add styles for welcome overlay
        const style = document.createElement('style');
        style.textContent = `
            .welcome-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(26, 26, 46, 0.95));
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                backdrop-filter: blur(10px);
            }
            
            .welcome-content {
                text-align: center;
                max-width: 500px;
                padding: 2rem;
                background: rgba(26, 26, 46, 0.9);
                border-radius: 20px;
                border: 2px solid var(--accent-purple);
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            }
            
            .welcome-content h1 {
                font-size: 2.5rem;
                color: var(--accent-cyan);
                margin-bottom: 1rem;
                text-shadow: 0 0 20px rgba(0, 206, 201, 0.5);
            }
            
            .welcome-content p {
                font-size: 1.2rem;
                color: var(--text-secondary);
                margin-bottom: 2rem;
            }
            
            .welcome-features {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .feature {
                padding: 0.5rem;
                background: rgba(55, 65, 81, 0.3);
                border-radius: 8px;
                color: var(--text-primary);
            }
            
            .start-btn {
                background: linear-gradient(45deg, var(--accent-purple), var(--accent-cyan));
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 12px;
                font-family: var(--font-primary);
                font-weight: 700;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .start-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 30px rgba(108, 92, 231, 0.4);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(welcomeOverlay);

        // Handle start button click
        document.getElementById('startGameBtn').addEventListener('click', () => {
            welcomeOverlay.style.opacity = '0';
            welcomeOverlay.style.transform = 'scale(0.9)';
            welcomeOverlay.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                welcomeOverlay.remove();
                style.remove();
            }, 500);
        });
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>⚠️ Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()">🔄 Reload Game</button>
            </div>
        `;

        const errorStyle = document.createElement('style');
        errorStyle.textContent = `
            .error-message {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 3000;
                font-family: var(--font-primary);
            }
            
            .error-content {
                text-align: center;
                padding: 2rem;
                background: var(--danger-color);
                border-radius: 12px;
                color: white;
                max-width: 400px;
            }
            
            .error-content button {
                margin-top: 1rem;
                padding: 0.5rem 1rem;
                background: white;
                color: var(--danger-color);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            }
        `;

        document.head.appendChild(errorStyle);
        document.body.appendChild(errorDiv);
    }

    // Public API methods
    newGame() {
        if (this.gameUI) {
            this.gameUI.newGame();
        }
    }

    getGameState() {
        return this.gameUI ? this.gameUI.chessEngine.getGameState() : null;
    }

    setDifficulty(difficulty) {
        if (this.gameUI) {
            this.gameUI.aiPlayer.setDifficulty(difficulty);
        }
    }

    toggleGameMode(mode) {
        if (this.gameUI) {
            this.gameUI.gameMode = mode;
            const radio = document.querySelector(`input[value="${mode}"]`);
            if (radio) radio.checked = true;
        }
    }
}

// Global app instance
let chessClashApp;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    chessClashApp = new ChessClashApp();
    await chessClashApp.initialize();
});

// Global functions for console access and debugging
window.ChessClash = {
    newGame: () => chessClashApp?.newGame(),
    getState: () => chessClashApp?.getGameState(),
    setDifficulty: (difficulty) => chessClashApp?.setDifficulty(difficulty),
    setMode: (mode) => chessClashApp?.toggleGameMode(mode),
    
    // Debug functions
    debug: {
        getEngine: () => chessClashApp?.gameUI?.chessEngine,
        getAI: () => chessClashApp?.gameUI?.aiPlayer,
        getUI: () => chessClashApp?.gameUI,
        
        // Test functions
        testMove: (from, to) => {
            const engine = chessClashApp?.gameUI?.chessEngine;
            if (engine) {
                const [fromRow, fromCol] = engine.algebraicToPosition(from);
                const [toRow, toCol] = engine.algebraicToPosition(to);
                return engine.makeMove(fromRow, fromCol, toRow, toCol);
            }
            return false;
        },
        
        showValidMoves: (square) => {
            const engine = chessClashApp?.gameUI?.chessEngine;
            if (engine) {
                const [row, col] = engine.algebraicToPosition(square);
                const moves = engine.getValidMoves(row, col);
                return moves.map(move => engine.positionToAlgebraic(move.row, move.col));
            }
            return [];
        }
    }
};

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Performance monitoring
window.addEventListener('load', () => {
    if (window.performance && window.performance.timing) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`🌌 Stellar Gambit loaded in ${loadTime}ms`);
    }
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Stellar Gambit Error:', event.error);
    
    // Show user-friendly error message for critical errors
    if (event.error && event.error.message.includes('ChessEngine')) {
        chessClashApp?.showErrorMessage('Game engine error occurred. Please refresh the page.');
    }
});

// Unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (!chessClashApp?.gameUI) return;
    
    switch (event.key) {
        case 'n':
        case 'N':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                chessClashApp.newGame();
            }
            break;
            
        case 'u':
        case 'U':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                chessClashApp.gameUI.undoMove();
            }
            break;
            
        case 'h':
        case 'H':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                chessClashApp.gameUI.showHint();
            }
            break;
            
        case 'Escape':
            chessClashApp.gameUI.clearSelection();
            break;
    }
});

// Prevent context menu on game board for better mobile experience
document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.chess-board')) {
        event.preventDefault();
    }
});

// Handle visibility change (pause/resume game timer)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Game paused (tab hidden)');
    } else {
        console.log('Game resumed (tab visible)');
    }
});

console.log('🌌 Stellar Gambit - Cosmic Chess Odyssey');
console.log('🎮 Use ChessClash.debug for debugging functions');
console.log('⌨️  Keyboard shortcuts: Ctrl+N (new game), Ctrl+U (undo), Ctrl+H (hint), Esc (clear selection)');
