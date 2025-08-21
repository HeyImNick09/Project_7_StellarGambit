// Game UI - User Interface Management
class GameUI {
    constructor() {
        this.chessEngine = new ChessEngine();
        this.aiPlayer = new AIPlayer('intermediate');
        this.selectedSquare = null;
        this.validMoves = [];
        this.gameMode = 'standard';
        this.isPlayerTurn = true;
        this.settings = this.loadSettings();
        
        this.initializeBoard();
        this.bindEvents();
        this.updateDisplay();
    }

    initializeBoard() {
        const board = document.getElementById('chessBoard');
        board.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `board-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                square.addEventListener('click', (e) => this.handleSquareClick(e));
                square.addEventListener('dragover', (e) => this.handleDragOver(e));
                square.addEventListener('drop', (e) => this.handleDrop(e));
                
                board.appendChild(square);
            }
        }

        this.renderPieces();
    }

    renderPieces() {
        const squares = document.querySelectorAll('.board-square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.chessEngine.getPiece(row, col);
            
            square.innerHTML = '';
            
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = `chess-piece piece-${piece.type} piece-${piece.color}`;
                pieceElement.draggable = piece.color === this.chessEngine.currentPlayer && this.isPlayerTurn;
                
                pieceElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
                pieceElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
                
                square.appendChild(pieceElement);
            }
        });
    }

    handleSquareClick(event) {
        if (!this.isPlayerTurn) return;
        
        const square = event.currentTarget;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.chessEngine.getPiece(row, col);

        if (this.selectedSquare) {
            // Try to make a move
            if (this.isValidMove(row, col)) {
                this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
            } else if (piece && piece.color === this.chessEngine.currentPlayer) {
                // Select different piece
                this.selectSquare(row, col);
            } else {
                // Deselect
                this.clearSelection();
            }
        } else if (piece && piece.color === this.chessEngine.currentPlayer) {
            // Select piece
            this.selectSquare(row, col);
        }
    }

    selectSquare(row, col) {
        this.clearSelection();
        
        this.selectedSquare = { row, col };
        this.validMoves = this.chessEngine.getValidMoves(row, col);
        
        // Highlight selected square
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');
        
        // Highlight valid moves
        this.validMoves.forEach(move => {
            const moveSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            const targetPiece = this.chessEngine.getPiece(move.row, move.col);
            
            if (targetPiece) {
                moveSquare.classList.add('capture-move');
            } else {
                moveSquare.classList.add('valid-move');
            }
        });

        // Show hints in assisted mode
        if (this.gameMode === 'assisted') {
            this.showMoveHints();
        }
    }

    clearSelection() {
        // Remove all highlights
        document.querySelectorAll('.board-square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'capture-move', 'last-move');
        });
        
        this.selectedSquare = null;
        this.validMoves = [];
        this.clearHints();
    }

    isValidMove(row, col) {
        return this.validMoves.some(move => move.row === row && move.col === col);
    }

    async makeMove(fromRow, fromCol, toRow, toCol) {
        // Check for pawn promotion
        const piece = this.chessEngine.getPiece(fromRow, fromCol);
        let promotionPiece = 'queen';
        
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            promotionPiece = await this.showPromotionDialog();
        }

        const success = this.chessEngine.makeMove(fromRow, fromCol, toRow, toCol, promotionPiece);
        
        if (success) {
            this.playMoveSound();
            this.clearSelection();
            this.renderPieces();
            this.updateDisplay();
            this.addMoveToHistory(fromRow, fromCol, toRow, toCol);
            
            // Highlight last move
            document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`).classList.add('last-move');
            document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`).classList.add('last-move');
            
            // Check game state
            if (this.chessEngine.gameState !== 'playing') {
                this.handleGameEnd();
            } else if (this.chessEngine.currentPlayer === 'black') {
                // AI's turn
                this.isPlayerTurn = false;
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    }

    async makeAIMove() {
        try {
            const aiMove = await this.aiPlayer.getBestMove(this.chessEngine);
            
            if (aiMove) {
                const success = this.chessEngine.makeMove(
                    aiMove.from[0], aiMove.from[1], 
                    aiMove.to[0], aiMove.to[1]
                );
                
                if (success) {
                    this.playMoveSound();
                    this.renderPieces();
                    this.updateDisplay();
                    this.addMoveToHistory(aiMove.from[0], aiMove.from[1], aiMove.to[0], aiMove.to[1]);
                    
                    // Highlight AI's move
                    document.querySelector(`[data-row="${aiMove.from[0]}"][data-col="${aiMove.from[1]}"]`).classList.add('last-move');
                    document.querySelector(`[data-row="${aiMove.to[0]}"][data-col="${aiMove.to[1]}"]`).classList.add('last-move');
                    
                    if (this.chessEngine.gameState !== 'playing') {
                        this.handleGameEnd();
                    } else {
                        this.isPlayerTurn = true;
                    }
                }
            }
        } catch (error) {
            console.error('AI move error:', error);
            this.isPlayerTurn = true;
        }
    }

    updateDisplay() {
        // Update turn indicator
        const turnElement = document.getElementById('currentTurn');
        const playerName = this.chessEngine.currentPlayer === 'white' ? 'Human Player' : 'AI Commander';
        turnElement.textContent = `${playerName} to Move`;
        
        // Update game state
        if (this.chessEngine.gameState === 'check') {
            turnElement.textContent += ' (Check!)';
            turnElement.classList.add('text-warning');
        } else {
            turnElement.classList.remove('text-warning');
        }
        
        // Update captured pieces
        this.updateCapturedPieces();
        
        // Update move count
        document.getElementById('gameTime').textContent = this.formatGameTime();
    }

    updateCapturedPieces() {
        const aiCaptured = document.getElementById('aiCaptured');
        const playerCaptured = document.getElementById('playerCaptured');
        
        aiCaptured.innerHTML = this.renderCapturedPieces('white');
        playerCaptured.innerHTML = this.renderCapturedPieces('black');
    }

    renderCapturedPieces(color) {
        const pieces = this.chessEngine.capturedPieces[color];
        return pieces.map(piece => {
            return `<span class="captured-piece piece-${piece.type} piece-${color}"></span>`;
        }).join('');
    }

    addMoveToHistory(fromRow, fromCol, toRow, toCol) {
        const moveList = document.getElementById('moveList');
        const piece = this.chessEngine.getPiece(toRow, toCol);
        const moveNumber = Math.ceil(this.chessEngine.moveCount / 2);
        
        const from = this.chessEngine.positionToAlgebraic(fromRow, fromCol);
        const to = this.chessEngine.positionToAlgebraic(toRow, toCol);
        
        let moveNotation = `${piece.type !== 'pawn' ? piece.type.charAt(0).toUpperCase() : ''}${to}`;
        
        if (this.chessEngine.gameState === 'check') {
            moveNotation += '+';
        } else if (this.chessEngine.gameState === 'checkmate') {
            moveNotation += '#';
        }
        
        const moveElement = document.createElement('div');
        moveElement.className = 'move-entry';
        moveElement.textContent = `${moveNumber}. ${moveNotation}`;
        
        moveList.appendChild(moveElement);
        moveList.scrollTop = moveList.scrollHeight;
    }

    showMoveHints() {
        if (this.gameMode !== 'assisted' || !this.selectedSquare) return;
        
        // Simple hint system - highlight best moves
        const bestMoves = this.validMoves.slice(0, 3); // Show top 3 moves
        
        bestMoves.forEach((move, index) => {
            const square = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            square.setAttribute('title', `Suggested move ${index + 1}`);
        });
    }

    clearHints() {
        document.querySelectorAll('.board-square').forEach(square => {
            square.removeAttribute('title');
        });
    }

    async showPromotionDialog() {
        return new Promise((resolve) => {
            const modal = document.getElementById('gameModal');
            const title = document.getElementById('modalTitle');
            const message = document.getElementById('modalMessage');
            const modalActions = document.querySelector('.modal-actions');
            
            title.textContent = 'Pawn Promotion';
            message.textContent = 'Choose a piece to promote your pawn:';
            
            modalActions.innerHTML = `
                <button class="promotion-piece" data-piece="queen">♕</button>
                <button class="promotion-piece" data-piece="rook">♖</button>
                <button class="promotion-piece" data-piece="bishop">♗</button>
                <button class="promotion-piece" data-piece="knight">♘</button>
            `;
            
            modal.classList.remove('hidden');
            
            modalActions.addEventListener('click', (e) => {
                if (e.target.classList.contains('promotion-piece')) {
                    const piece = e.target.dataset.piece;
                    modal.classList.add('hidden');
                    resolve(piece);
                }
            });
        });
    }

    handleGameEnd() {
        const modal = document.getElementById('gameModal');
        const title = document.getElementById('modalTitle');
        const message = document.getElementById('modalMessage');
        
        let titleText = '';
        let messageText = '';
        
        switch (this.chessEngine.gameState) {
            case 'checkmate':
                titleText = 'Game Over - Checkmate!';
                messageText = this.chessEngine.currentPlayer === 'black' ? 
                    '🎉 Congratulations! You won!' : 
                    '🤖 AI Commander wins!';
                break;
            case 'stalemate':
                titleText = 'Game Over - Stalemate';
                messageText = '🤝 The game is a draw!';
                break;
            case 'draw-fifty-move':
                titleText = 'Game Over - Draw';
                messageText = '🤝 Draw by fifty-move rule!';
                break;
            case 'draw-insufficient-material':
                titleText = 'Game Over - Draw';
                messageText = '🤝 Draw by insufficient material!';
                break;
        }
        
        title.textContent = titleText;
        message.textContent = messageText;
        
        // Reset modal actions
        document.querySelector('.modal-actions').innerHTML = `
            <button id="playAgainBtn" class="modal-btn primary">🎮 Play Again</button>
            <button id="analyzeBtn" class="modal-btn">📊 Analyze</button>
        `;
        
        modal.classList.remove('hidden');
    }

    // Drag and Drop handlers
    handleDragStart(event) {
        if (!this.isPlayerTurn) {
            event.preventDefault();
            return;
        }
        
        const square = event.target.parentElement;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        this.selectSquare(row, col);
        event.target.classList.add('piece-dragging');
    }

    handleDragEnd(event) {
        event.target.classList.remove('piece-dragging');
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        event.preventDefault();
        
        if (!this.selectedSquare) return;
        
        const square = event.currentTarget;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        if (this.isValidMove(row, col)) {
            this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
        } else {
            this.clearSelection();
        }
    }

    // Event binding
    bindEvents() {
        // Game controls
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('redoBtn').addEventListener('click', () => this.redoMove());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('resignBtn').addEventListener('click', () => this.resign());
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // Piece Guide
        document.getElementById('pieceGuideBtn').addEventListener('click', () => this.togglePieceGuide());
        document.getElementById('closePieceGuide').addEventListener('click', () => this.closePieceGuide());
        
        // Chess History
        document.getElementById('chessHistoryBtn').addEventListener('click', () => this.toggleChessHistory());
        document.getElementById('closeChessHistory').addEventListener('click', () => this.closeChessHistory());
        
        // Game mode
        document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
                this.clearSelection();
            });
        });
        
        // AI difficulty
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.aiPlayer.setDifficulty(e.target.value);
            document.getElementById('aiLevel').textContent = e.target.options[e.target.selectedIndex].text.split(' ')[1];
        });
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('gameModal').classList.add('hidden');
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.getElementById('gameModal').classList.add('hidden');
            this.newGame();
        });
    }

    newGame() {
        this.chessEngine = new ChessEngine();
        this.selectedSquare = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        
        this.clearSelection();
        this.renderPieces();
        this.updateDisplay();
        
        // Clear move history
        document.getElementById('moveList').innerHTML = '';
        
        // Reset buttons
        document.getElementById('undoBtn').disabled = true;
        document.getElementById('redoBtn').disabled = true;
    }

    undoMove() {
        // Implementation for undo functionality
        console.log('Undo move - to be implemented');
    }

    redoMove() {
        // Implementation for redo functionality
        console.log('Redo move - to be implemented');
    }

    showHint() {
        if (this.gameMode === 'assisted' && this.isPlayerTurn) {
            // Get AI suggestion for current position
            this.aiPlayer.getBestMove(this.chessEngine).then(move => {
                if (move) {
                    const fromSquare = document.querySelector(`[data-row="${move.from[0]}"][data-col="${move.from[1]}"]`);
                    const toSquare = document.querySelector(`[data-row="${move.to[0]}"][data-col="${move.to[1]}"]`);
                    
                    fromSquare.style.boxShadow = '0 0 20px #10b981';
                    toSquare.style.boxShadow = '0 0 20px #10b981';
                    
                    setTimeout(() => {
                        fromSquare.style.boxShadow = '';
                        toSquare.style.boxShadow = '';
                    }, 2000);
                }
            });
        }
    }

    resign() {
        if (confirm('Are you sure you want to resign?')) {
            this.chessEngine.gameState = 'checkmate';
            this.handleGameEnd();
        }
    }

    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('hidden');
    }

    togglePieceGuide() {
        const panel = document.getElementById('pieceGuidePanel');
        panel.classList.toggle('hidden');
    }

    closePieceGuide() {
        const panel = document.getElementById('pieceGuidePanel');
        panel.classList.add('hidden');
    }

    toggleChessHistory() {
        const panel = document.getElementById('chessHistoryPanel');
        panel.classList.toggle('hidden');
    }

    closeChessHistory() {
        const panel = document.getElementById('chessHistoryPanel');
        panel.classList.add('hidden');
    }

    loadSettings() {
        const defaultSettings = {
            soundEnabled: true,
            theme: 'space',
            timeControl: 'unlimited'
        };
        
        const saved = localStorage.getItem('chessClashSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        this.settings = {
            soundEnabled: document.getElementById('soundToggle').checked,
            theme: document.getElementById('themeSelect').value,
            timeControl: document.getElementById('timeControl').value
        };
        
        localStorage.setItem('chessClashSettings', JSON.stringify(this.settings));
        this.applySettings();
        
        document.getElementById('settingsPanel').classList.add('hidden');
    }

    applySettings() {
        // Apply theme
        document.body.className = `theme-${this.settings.theme}`;
        
        // Apply other settings as needed
    }

    playMoveSound() {
        if (this.settings.soundEnabled) {
            // Create a simple beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        }
    }

    formatGameTime() {
        const minutes = Math.floor(this.chessEngine.moveCount / 2);
        const seconds = (this.chessEngine.moveCount % 2) * 30;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}
