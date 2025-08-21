// Chess Engine - Core Game Logic
class ChessEngine {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameState = 'playing'; // playing, check, checkmate, stalemate, draw
        this.moveCount = 0;
        this.fiftyMoveRule = 0;
        this.threefoldRepetition = new Map();
        
        // Castling rights
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // En passant target square
        this.enPassantTarget = null;
        
        // King positions for check detection
        this.kingPositions = { white: [7, 4], black: [0, 4] };
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place pieces in starting positions
        const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        // Black pieces (top)
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: pieceOrder[col], color: 'black' };
            board[1][col] = { type: 'pawn', color: 'black' };
        }
        
        // White pieces (bottom)
        for (let col = 0; col < 8; col++) {
            board[6][col] = { type: 'pawn', color: 'white' };
            board[7][col] = { type: pieceOrder[col], color: 'white' };
        }
        
        return board;
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    setPiece(row, col, piece) {
        if (row >= 0 && row <= 7 && col >= 0 && col <= 7) {
            this.board[row][col] = piece;
        }
    }

    isValidPosition(row, col) {
        return row >= 0 && row <= 7 && col >= 0 && col <= 7;
    }

    getValidMoves(fromRow, fromCol) {
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece || piece.color !== this.currentPlayer) return [];

        let moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(fromRow, fromCol);
                break;
            case 'rook':
                moves = this.getRookMoves(fromRow, fromCol);
                break;
            case 'knight':
                moves = this.getKnightMoves(fromRow, fromCol);
                break;
            case 'bishop':
                moves = this.getBishopMoves(fromRow, fromCol);
                break;
            case 'queen':
                moves = this.getQueenMoves(fromRow, fromCol);
                break;
            case 'king':
                moves = this.getKingMoves(fromRow, fromCol);
                break;
        }

        // Filter out moves that would put own king in check
        return moves.filter(move => !this.wouldBeInCheck(fromRow, fromCol, move.row, move.col));
    }

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.getPiece(row, col);
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Forward move
        if (this.isValidPosition(row + direction, col) && !this.getPiece(row + direction, col)) {
            moves.push({ row: row + direction, col, type: 'move' });
            
            // Double move from starting position
            if (row === startRow && !this.getPiece(row + 2 * direction, col)) {
                moves.push({ row: row + 2 * direction, col, type: 'move' });
            }
        }

        // Diagonal captures
        for (const deltaCol of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + deltaCol;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.getPiece(newRow, newCol);
                if (target && target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol, type: 'capture' });
                }
                
                // En passant
                if (this.enPassantTarget && 
                    this.enPassantTarget.row === newRow && 
                    this.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol, type: 'enpassant' });
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        for (const [deltaRow, deltaCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * deltaRow;
                const newCol = col + i * deltaCol;
                
                if (!this.isValidPosition(newRow, newCol)) break;
                
                const target = this.getPiece(newRow, newCol);
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else {
                    if (target.color !== this.getPiece(row, col).color) {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                    break;
                }
            }
        }
        
        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [deltaRow, deltaCol] of knightMoves) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.getPiece(newRow, newCol);
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else if (target.color !== this.getPiece(row, col).color) {
                    moves.push({ row: newRow, col: newCol, type: 'capture' });
                }
            }
        }
        
        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [deltaRow, deltaCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * deltaRow;
                const newCol = col + i * deltaCol;
                
                if (!this.isValidPosition(newRow, newCol)) break;
                
                const target = this.getPiece(newRow, newCol);
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else {
                    if (target.color !== this.getPiece(row, col).color) {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                    break;
                }
            }
        }
        
        return moves;
    }

    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }

    getKingMoves(row, col) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [deltaRow, deltaCol] of directions) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;
            
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.getPiece(newRow, newCol);
                if (!target) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else if (target.color !== this.getPiece(row, col).color) {
                    moves.push({ row: newRow, col: newCol, type: 'capture' });
                }
            }
        }
        
        // Castling
        const color = this.getPiece(row, col).color;
        if (!this.isInCheck(color)) {
            // Kingside castling
            if (this.castlingRights[color].kingside && 
                !this.getPiece(row, 5) && !this.getPiece(row, 6) &&
                !this.isSquareAttacked(row, 5, color) && !this.isSquareAttacked(row, 6, color)) {
                moves.push({ row, col: 6, type: 'castle-kingside' });
            }
            
            // Queenside castling
            if (this.castlingRights[color].queenside && 
                !this.getPiece(row, 1) && !this.getPiece(row, 2) && !this.getPiece(row, 3) &&
                !this.isSquareAttacked(row, 2, color) && !this.isSquareAttacked(row, 3, color)) {
                moves.push({ row, col: 2, type: 'castle-queenside' });
            }
        }
        
        return moves;
    }

    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = 'queen') {
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece || piece.color !== this.currentPlayer) return false;

        const validMoves = this.getValidMoves(fromRow, fromCol);
        const move = validMoves.find(m => m.row === toRow && m.col === toCol);
        
        if (!move) return false;

        // Store move for history
        const moveData = {
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: { ...piece },
            captured: this.getPiece(toRow, toCol),
            moveType: move.type,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget
        };

        // Execute the move
        this.executMove(fromRow, fromCol, toRow, toCol, move.type, promotionPiece);
        
        // Update game state
        this.gameHistory.push(moveData);
        this.moveCount++;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Update fifty-move rule
        if (piece.type === 'pawn' || moveData.captured) {
            this.fiftyMoveRule = 0;
        } else {
            this.fiftyMoveRule++;
        }
        
        // Check for game end conditions
        this.updateGameState();
        
        return true;
    }

    executMove(fromRow, fromCol, toRow, toCol, moveType, promotionPiece) {
        const piece = this.getPiece(fromRow, fromCol);
        const captured = this.getPiece(toRow, toCol);
        
        // Handle captures
        if (captured) {
            this.capturedPieces[captured.color].push(captured);
        }
        
        // Clear en passant target
        this.enPassantTarget = null;
        
        switch (moveType) {
            case 'move':
            case 'capture':
                this.setPiece(toRow, toCol, piece);
                this.setPiece(fromRow, fromCol, null);
                break;
                
            case 'enpassant':
                this.setPiece(toRow, toCol, piece);
                this.setPiece(fromRow, fromCol, null);
                // Remove the captured pawn
                const capturedPawnRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
                const capturedPawn = this.getPiece(capturedPawnRow, toCol);
                this.capturedPieces[capturedPawn.color].push(capturedPawn);
                this.setPiece(capturedPawnRow, toCol, null);
                break;
                
            case 'castle-kingside':
                this.setPiece(toRow, toCol, piece);
                this.setPiece(fromRow, fromCol, null);
                // Move rook
                const kingsideRook = this.getPiece(toRow, 7);
                this.setPiece(toRow, 5, kingsideRook);
                this.setPiece(toRow, 7, null);
                break;
                
            case 'castle-queenside':
                this.setPiece(toRow, toCol, piece);
                this.setPiece(fromRow, fromCol, null);
                // Move rook
                const queensideRook = this.getPiece(toRow, 0);
                this.setPiece(toRow, 3, queensideRook);
                this.setPiece(toRow, 0, null);
                break;
        }
        
        // Handle pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.setPiece(toRow, toCol, { type: promotionPiece, color: piece.color });
        }
        
        // Handle pawn double move (set en passant target)
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: fromRow + (toRow - fromRow) / 2,
                col: toCol
            };
        }
        
        // Update king position
        if (piece.type === 'king') {
            this.kingPositions[piece.color] = [toRow, toCol];
        }
        
        // Update castling rights
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        } else if (piece.type === 'rook') {
            if (fromCol === 0) {
                this.castlingRights[piece.color].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[piece.color].kingside = false;
            }
        }
    }

    isInCheck(color) {
        const [kingRow, kingCol] = this.kingPositions[color];
        return this.isSquareAttacked(kingRow, kingCol, color);
    }

    isSquareAttacked(row, col, defendingColor) {
        const attackingColor = defendingColor === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPiece(r, c);
                if (piece && piece.color === attackingColor) {
                    const moves = this.getPieceAttacks(r, c);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    getPieceAttacks(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece) return [];
        
        // Similar to getValidMoves but without check validation
        switch (piece.type) {
            case 'pawn':
                return this.getPawnAttacks(row, col);
            case 'rook':
                return this.getRookMoves(row, col);
            case 'knight':
                return this.getKnightMoves(row, col);
            case 'bishop':
                return this.getBishopMoves(row, col);
            case 'queen':
                return this.getQueenMoves(row, col);
            case 'king':
                return this.getKingAttacks(row, col);
            default:
                return [];
        }
    }

    getPawnAttacks(row, col) {
        const attacks = [];
        const piece = this.getPiece(row, col);
        const direction = piece.color === 'white' ? -1 : 1;
        
        for (const deltaCol of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + deltaCol;
            
            if (this.isValidPosition(newRow, newCol)) {
                attacks.push({ row: newRow, col: newCol, type: 'attack' });
            }
        }
        
        return attacks;
    }

    getKingAttacks(row, col) {
        const attacks = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [deltaRow, deltaCol] of directions) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;
            
            if (this.isValidPosition(newRow, newCol)) {
                attacks.push({ row: newRow, col: newCol, type: 'attack' });
            }
        }
        
        return attacks;
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Temporarily make the move
        const originalPiece = this.getPiece(toRow, toCol);
        const movingPiece = this.getPiece(fromRow, fromCol);
        
        this.setPiece(toRow, toCol, movingPiece);
        this.setPiece(fromRow, fromCol, null);
        
        // Update king position if moving king
        const originalKingPos = [...this.kingPositions[movingPiece.color]];
        if (movingPiece.type === 'king') {
            this.kingPositions[movingPiece.color] = [toRow, toCol];
        }
        
        const inCheck = this.isInCheck(movingPiece.color);
        
        // Restore the board
        this.setPiece(fromRow, fromCol, movingPiece);
        this.setPiece(toRow, toCol, originalPiece);
        this.kingPositions[movingPiece.color] = originalKingPos;
        
        return inCheck;
    }

    updateGameState() {
        const currentPlayerInCheck = this.isInCheck(this.currentPlayer);
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);
        
        if (currentPlayerInCheck) {
            if (!hasValidMoves) {
                this.gameState = 'checkmate';
            } else {
                this.gameState = 'check';
            }
        } else if (!hasValidMoves) {
            this.gameState = 'stalemate';
        } else if (this.fiftyMoveRule >= 50) {
            this.gameState = 'draw-fifty-move';
        } else if (this.isInsufficientMaterial()) {
            this.gameState = 'draw-insufficient-material';
        } else {
            this.gameState = 'playing';
        }
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    isInsufficientMaterial() {
        const pieces = { white: [], black: [] };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece) {
                    pieces[piece.color].push(piece.type);
                }
            }
        }
        
        // King vs King
        if (pieces.white.length === 1 && pieces.black.length === 1) return true;
        
        // King + Bishop vs King or King + Knight vs King
        for (const color of ['white', 'black']) {
            if (pieces[color].length === 2) {
                const otherColor = color === 'white' ? 'black' : 'white';
                if (pieces[otherColor].length === 1) {
                    const nonKingPiece = pieces[color].find(p => p !== 'king');
                    if (nonKingPiece === 'bishop' || nonKingPiece === 'knight') {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameState: this.gameState,
            capturedPieces: this.capturedPieces,
            moveCount: this.moveCount,
            isInCheck: this.isInCheck(this.currentPlayer)
        };
    }

    // Convert position to algebraic notation
    positionToAlgebraic(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }

    // Convert algebraic notation to position
    algebraicToPosition(notation) {
        const col = notation.charCodeAt(0) - 97;
        const row = 8 - parseInt(notation[1]);
        return [row, col];
    }
}
