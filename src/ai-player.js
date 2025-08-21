// AI Player - Chess AI with Multiple Difficulty Levels
class AIPlayer {
    constructor(difficulty = 'intermediate') {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        this.evaluationWeights = this.getEvaluationWeights(difficulty);
        this.openingBook = this.initializeOpeningBook();
        this.endgameTablebase = this.initializeEndgameKnowledge();
    }

    getMaxDepth(difficulty) {
        const depths = {
            'novice': 2,
            'intermediate': 4,
            'advanced': 6,
            'master': 8
        };
        return depths[difficulty] || 4;
    }

    getEvaluationWeights(difficulty) {
        const baseWeights = {
            material: 1.0,
            position: 0.3,
            mobility: 0.2,
            safety: 0.4,
            development: 0.1
        };

        // Adjust weights based on difficulty
        switch (difficulty) {
            case 'novice':
                return {
                    ...baseWeights,
                    material: 1.2,
                    position: 0.1,
                    mobility: 0.1,
                    safety: 0.2,
                    development: 0.05
                };
            case 'intermediate':
                return baseWeights;
            case 'advanced':
                return {
                    ...baseWeights,
                    material: 0.9,
                    position: 0.4,
                    mobility: 0.3,
                    safety: 0.5,
                    development: 0.2
                };
            case 'master':
                return {
                    ...baseWeights,
                    material: 0.8,
                    position: 0.5,
                    mobility: 0.4,
                    safety: 0.6,
                    development: 0.3
                };
            default:
                return baseWeights;
        }
    }

    async getBestMove(chessEngine) {
        // Check opening book first
        const openingMove = this.getOpeningMove(chessEngine);
        if (openingMove) {
            return openingMove;
        }

        // Use minimax with alpha-beta pruning
        const result = this.minimax(chessEngine, this.maxDepth, -Infinity, Infinity, true);
        
        // Add some randomness for lower difficulties
        if (this.difficulty === 'novice' && Math.random() < 0.3) {
            return this.getRandomMove(chessEngine);
        }

        return result.move;
    }

    minimax(chessEngine, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || chessEngine.gameState !== 'playing') {
            return {
                score: this.evaluatePosition(chessEngine),
                move: null
            };
        }

        const moves = this.getAllValidMoves(chessEngine);
        if (moves.length === 0) {
            return {
                score: isMaximizing ? -Infinity : Infinity,
                move: null
            };
        }

        // Order moves for better pruning
        moves.sort((a, b) => this.scoreMoveOrdering(chessEngine, b) - this.scoreMoveOrdering(chessEngine, a));

        let bestMove = null;
        let bestScore = isMaximizing ? -Infinity : Infinity;

        for (const move of moves) {
            // Make the move
            const originalState = this.saveGameState(chessEngine);
            chessEngine.makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);

            // Recursive call
            const result = this.minimax(chessEngine, depth - 1, alpha, beta, !isMaximizing);

            // Restore the game state
            this.restoreGameState(chessEngine, originalState);

            if (isMaximizing) {
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, result.score);
            } else {
                if (result.score < bestScore) {
                    bestScore = result.score;
                    bestMove = move;
                }
                beta = Math.min(beta, result.score);
            }

            // Alpha-beta pruning
            if (beta <= alpha) {
                break;
            }
        }

        return { score: bestScore, move: bestMove };
    }

    evaluatePosition(chessEngine) {
        let score = 0;
        const weights = this.evaluationWeights;

        // Material evaluation
        score += this.evaluateMaterial(chessEngine) * weights.material;

        // Positional evaluation
        score += this.evaluatePosition(chessEngine) * weights.position;

        // Mobility evaluation
        score += this.evaluateMobility(chessEngine) * weights.mobility;

        // King safety evaluation
        score += this.evaluateKingSafety(chessEngine) * weights.safety;

        // Development evaluation
        score += this.evaluateDevelopment(chessEngine) * weights.development;

        return score;
    }

    evaluateMaterial(chessEngine) {
        const pieceValues = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 0
        };

        let whiteScore = 0;
        let blackScore = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chessEngine.getPiece(row, col);
                if (piece) {
                    const value = pieceValues[piece.type];
                    if (piece.color === 'white') {
                        whiteScore += value;
                    } else {
                        blackScore += value;
                    }
                }
            }
        }

        return chessEngine.currentPlayer === 'black' ? blackScore - whiteScore : whiteScore - blackScore;
    }

    evaluatePositionalValue(chessEngine) {
        const pieceSquareTables = this.getPieceSquareTables();
        let whiteScore = 0;
        let blackScore = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chessEngine.getPiece(row, col);
                if (piece) {
                    const table = pieceSquareTables[piece.type];
                    const squareValue = piece.color === 'white' ? 
                        table[row][col] : table[7 - row][col];
                    
                    if (piece.color === 'white') {
                        whiteScore += squareValue;
                    } else {
                        blackScore += squareValue;
                    }
                }
            }
        }

        return chessEngine.currentPlayer === 'black' ? blackScore - whiteScore : whiteScore - blackScore;
    }

    evaluateMobility(chessEngine) {
        let whiteMobility = 0;
        let blackMobility = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chessEngine.getPiece(row, col);
                if (piece) {
                    const moves = chessEngine.getValidMoves(row, col);
                    if (piece.color === 'white') {
                        whiteMobility += moves.length;
                    } else {
                        blackMobility += moves.length;
                    }
                }
            }
        }

        return chessEngine.currentPlayer === 'black' ? blackMobility - whiteMobility : whiteMobility - blackMobility;
    }

    evaluateKingSafety(chessEngine) {
        let whiteKingSafety = this.getKingSafety(chessEngine, 'white');
        let blackKingSafety = this.getKingSafety(chessEngine, 'black');

        return chessEngine.currentPlayer === 'black' ? blackKingSafety - whiteKingSafety : whiteKingSafety - blackKingSafety;
    }

    getKingSafety(chessEngine, color) {
        const [kingRow, kingCol] = chessEngine.kingPositions[color];
        let safety = 0;

        // Penalty for being in check
        if (chessEngine.isInCheck(color)) {
            safety -= 50;
        }

        // Bonus for castling
        if (!chessEngine.castlingRights[color].kingside && !chessEngine.castlingRights[color].queenside) {
            // King has moved or castling rights lost
            if (kingCol > 5 || kingCol < 3) {
                safety += 20; // Bonus for castled position
            } else {
                safety -= 30; // Penalty for exposed king
            }
        }

        // Evaluate pawn shield
        const direction = color === 'white' ? -1 : 1;
        for (let col = Math.max(0, kingCol - 1); col <= Math.min(7, kingCol + 1); col++) {
            const pawnRow = kingRow + direction;
            if (chessEngine.isValidPosition(pawnRow, col)) {
                const piece = chessEngine.getPiece(pawnRow, col);
                if (piece && piece.type === 'pawn' && piece.color === color) {
                    safety += 10;
                }
            }
        }

        return safety;
    }

    evaluateDevelopment(chessEngine) {
        let whiteDevelopment = 0;
        let blackDevelopment = 0;

        // Check if pieces are developed from starting squares
        const startingSquares = {
            white: {
                knights: [[7, 1], [7, 6]],
                bishops: [[7, 2], [7, 5]]
            },
            black: {
                knights: [[0, 1], [0, 6]],
                bishops: [[0, 2], [0, 5]]
            }
        };

        for (const color of ['white', 'black']) {
            let development = 0;
            
            // Check knight development
            for (const [row, col] of startingSquares[color].knights) {
                const piece = chessEngine.getPiece(row, col);
                if (!piece || piece.type !== 'knight' || piece.color !== color) {
                    development += 10; // Bonus for developed knight
                }
            }

            // Check bishop development
            for (const [row, col] of startingSquares[color].bishops) {
                const piece = chessEngine.getPiece(row, col);
                if (!piece || piece.type !== 'bishop' || piece.color !== color) {
                    development += 10; // Bonus for developed bishop
                }
            }

            if (color === 'white') {
                whiteDevelopment = development;
            } else {
                blackDevelopment = development;
            }
        }

        return chessEngine.currentPlayer === 'black' ? blackDevelopment - whiteDevelopment : whiteDevelopment - blackDevelopment;
    }

    getAllValidMoves(chessEngine) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = chessEngine.getPiece(row, col);
                if (piece && piece.color === chessEngine.currentPlayer) {
                    const validMoves = chessEngine.getValidMoves(row, col);
                    for (const move of validMoves) {
                        moves.push({
                            from: [row, col],
                            to: [move.row, move.col],
                            piece: piece,
                            moveType: move.type
                        });
                    }
                }
            }
        }
        
        return moves;
    }

    scoreMoveOrdering(chessEngine, move) {
        let score = 0;
        
        // Prioritize captures
        const targetPiece = chessEngine.getPiece(move.to[0], move.to[1]);
        if (targetPiece) {
            const pieceValues = { 'pawn': 1, 'knight': 3, 'bishop': 3, 'rook': 5, 'queen': 9, 'king': 100 };
            score += pieceValues[targetPiece.type] * 10;
            score -= pieceValues[move.piece.type]; // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
        }

        // Prioritize checks
        const originalState = this.saveGameState(chessEngine);
        chessEngine.makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);
        const opponentColor = chessEngine.currentPlayer;
        if (chessEngine.isInCheck(opponentColor)) {
            score += 50;
        }
        this.restoreGameState(chessEngine, originalState);

        // Prioritize center control
        const centerSquares = [[3, 3], [3, 4], [4, 3], [4, 4]];
        if (centerSquares.some(([r, c]) => r === move.to[0] && c === move.to[1])) {
            score += 20;
        }

        return score;
    }

    getRandomMove(chessEngine) {
        const moves = this.getAllValidMoves(chessEngine);
        if (moves.length === 0) return null;
        
        return moves[Math.floor(Math.random() * moves.length)];
    }

    getOpeningMove(chessEngine) {
        // Simple opening book - just a few basic openings
        if (chessEngine.moveCount < 6) {
            const openingMoves = this.openingBook[chessEngine.moveCount] || [];
            const validOpeningMoves = openingMoves.filter(move => {
                const moves = chessEngine.getValidMoves(move.from[0], move.from[1]);
                return moves.some(m => m.row === move.to[0] && m.col === move.to[1]);
            });
            
            if (validOpeningMoves.length > 0) {
                return validOpeningMoves[Math.floor(Math.random() * validOpeningMoves.length)];
            }
        }
        
        return null;
    }

    initializeOpeningBook() {
        return {
            0: [ // First move for black
                { from: [1, 4], to: [3, 4] }, // e5
                { from: [1, 2], to: [2, 2] }, // c6
                { from: [1, 3], to: [2, 3] }  // d6
            ],
            1: [ // Second move for black
                { from: [0, 1], to: [2, 2] }, // Nc6
                { from: [0, 6], to: [2, 5] }  // Nf6
            ],
            2: [ // Third move for black
                { from: [0, 5], to: [1, 4] }, // Be7
                { from: [0, 2], to: [1, 3] }  // Bd7
            ]
        };
    }

    initializeEndgameKnowledge() {
        // Basic endgame principles
        return {
            kingAndPawnVsKing: (chessEngine) => {
                // Implementation for K+P vs K endgame
                return 0;
            },
            queenVsRook: (chessEngine) => {
                // Implementation for Q vs R endgame
                return 0;
            }
        };
    }

    getPieceSquareTables() {
        return {
            pawn: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5,  5, 10, 25, 25, 10,  5,  5],
                [0,  0,  0, 20, 20,  0,  0,  0],
                [5, -5,-10,  0,  0,-10, -5,  5],
                [5, 10, 10,-20,-20, 10, 10,  5],
                [0,  0,  0,  0,  0,  0,  0,  0]
            ],
            knight: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            bishop: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            rook: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [0,  0,  0,  5,  5,  0,  0,  0]
            ],
            queen: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [-5,  0,  5,  5,  5,  5,  0, -5],
                [0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            king: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20,  0,  0,  0,  0, 20, 20],
                [20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };
    }

    saveGameState(chessEngine) {
        return {
            board: chessEngine.board.map(row => [...row]),
            currentPlayer: chessEngine.currentPlayer,
            castlingRights: JSON.parse(JSON.stringify(chessEngine.castlingRights)),
            enPassantTarget: chessEngine.enPassantTarget,
            kingPositions: JSON.parse(JSON.stringify(chessEngine.kingPositions)),
            gameState: chessEngine.gameState,
            moveCount: chessEngine.moveCount,
            fiftyMoveRule: chessEngine.fiftyMoveRule
        };
    }

    restoreGameState(chessEngine, state) {
        chessEngine.board = state.board;
        chessEngine.currentPlayer = state.currentPlayer;
        chessEngine.castlingRights = state.castlingRights;
        chessEngine.enPassantTarget = state.enPassantTarget;
        chessEngine.kingPositions = state.kingPositions;
        chessEngine.gameState = state.gameState;
        chessEngine.moveCount = state.moveCount;
        chessEngine.fiftyMoveRule = state.fiftyMoveRule;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        this.evaluationWeights = this.getEvaluationWeights(difficulty);
    }
}
