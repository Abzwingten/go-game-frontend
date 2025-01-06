// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    let user = null;
    let gameID = null;
    let playerID = null;
    let boardSize = 19;
    let boardState = []; // 2D array representing the board
    let turn = null;     // Current player's turn
    let canvas = document.getElementById('go-board');
    let ctx = canvas.getContext('2d');
    let cellSize = canvas.width / (boardSize + 1);

    // Initialize the app
    init();
    setInterval(fetchGameState, 5000); // Fetch game state every 5 seconds

    function fetchGameState() {
        if (!gameID) return;

        fetch('/game-state?' + new URLSearchParams({ 'gameID': gameID.toString() }))
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error fetching game state:', data.error);
            } else {
                boardState = data.board;
                turn = data.turn;
                drawBoard();
                updateGameInfo();
            }
        })
        .catch(error => {
            console.error('Error fetching game state:', error);
        });
    }

    function init() {
        // Authenticate the user
        authenticateUser();

        // Prepare board state
        initBoardState();

        // Draw the board
        drawBoard();

        // Set up event listeners
        canvas.addEventListener('click', handleBoardClick);
        document.getElementById('start-game-button').addEventListener('click', startNewGame);
        document.getElementById('pass-button').addEventListener('click', passTurn);
        document.getElementById('score-button').addEventListener('click', countScore);
        document.getElementById('export-sgf-button').addEventListener('click', exportSGF);
    }

    function authenticateUser() {
        const initData = window.Telegram.WebApp.initData;
        // Send initData to the backend for validation
        fetch('/auth', {
            method: 'POST',
            body: new URLSearchParams({ 'initData': initData }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // User is authenticated
                user = data.user;
                playerID = user.id;
                document.getElementById('player-name').textContent = user.first_name;
            } else {
                alert('Authentication failed.');
            }
        })
        .catch(error => {
            console.error('Error during authentication:', error);
            alert('Failed to authenticate.');
        });
    }






    function initBoardState() {
        boardState = [];
        for (let y = 0; y < boardSize; y++) {
            let row = [];
            for (let x = 0; x < boardSize; x++) {
                row.push(0); // 0: empty, 1: black, 2: white
            }
            boardState.push(row);
        }
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = 'var(--line-color)';
        for (let i = 1; i <= boardSize; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(cellSize * i, cellSize);
            ctx.lineTo(cellSize * i, cellSize * boardSize);
            ctx.stroke();

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(cellSize, cellSize * i);
            ctx.lineTo(cellSize * boardSize, cellSize * i);
            ctx.stroke();
        }

        // Draw star points for standard board sizes
        if (boardSize === 19) {
            drawStarPoints([4, 10, 16]);
        } else if (boardSize === 13) {
            drawStarPoints([4, 7, 10]);
        } else if (boardSize === 9) {
            drawStarPoints([3, 5, 7]);
        }

        // Draw existing stones
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (boardState[y][x] !== 0) {
                    drawStone(x, y, boardState[y][x]);
                }
            }
        }
    }

    function drawStarPoints(points) {
        ctx.fillStyle = 'var(--star-point-color)';
        points.forEach(i => {
            points.forEach(j => {
                ctx.beginPath();
                ctx.arc(cellSize * i, cellSize * j, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
    }

    function drawStone(x, y, player) {
        ctx.beginPath();
        let stoneX = cellSize * (x + 1);
        let stoneY = cellSize * (y + 1);
        let radius = cellSize / 2 - 2;

        ctx.arc(stoneX, stoneY, radius, 0, 2 * Math.PI);
        if (player === 1) {
            ctx.fillStyle = 'var(--black-stone-color)';
            ctx.fill();
        } else if (player === 2) {
            ctx.fillStyle = 'var(--white-stone-color)';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function handleBoardClick(event) {
        let rect = canvas.getBoundingClientRect();
        let xClick = event.clientX - rect.left;
        let yClick = event.clientY - rect.top;

        let x = Math.round((xClick / cellSize) - 1);
        let y = Math.round((yClick / cellSize) - 1);

        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
            // Make a move
            makeMove(x, y);
        }
    }

    function startNewGame() {
        // Send a request to the backend to start a new game
        fetch('/start-game', {
            method: 'POST',
            body: new URLSearchParams({
                'blackPlayerID': playerID.toString(),
                'whitePlayerID': '2', // Replace with actual opponent's ID
                'boardSize': boardSize.toString()
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error starting game: ' + data.error);
                return;
            }
            gameID = data.gameID;
            turn = data.turn;
            boardSize = data.boardSize;
            initBoardState();
            drawBoard();
            updateGameInfo();
        })
        .catch(error => {
            console.error('Error starting game:', error);
            alert('Failed to start game.');
        });
    }

    function makeMove(x, y) {
        if (!gameID) {
            alert('Game not started.');
            return;
        }
        // Check if it's the player's turn
        if (turn !== getPlayerColor(playerID)) {
            alert('Not your turn.');
            return;
        }
        // Send move to backend
        fetch('/make-move', {
            method: 'POST',
            body: new URLSearchParams({
                'gameID': gameID.toString(),
                'playerID': playerID.toString(),
                'x': x.toString(),
                'y': y.toString()
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Invalid move: ' + data.error);
            } else {
                // Update the board state
                boardState = data.board;
                turn = data.turn;
                drawBoard();
                updateGameInfo();
            }
        })
        .catch(error => {
            console.error('Error making move:', error);
            alert('Failed to make move.');
        });
    }

    function passTurn() {
        if (!gameID) {
            alert('Game not started.');
            return;
        }
        // Send pass action to backend
        fetch('/make-move', {
            method: 'POST',
            body: new URLSearchParams({
                'gameID': gameID.toString(),
                'playerID': playerID.toString(),
                'x': '-1', // Indicate a pass with (-1, -1)
                'y': '-1'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Cannot pass: ' + data.error);
            } else {
                turn = data.turn;
                updateGameInfo();
            }
        })
        .catch(error => {
            console.error('Error passing turn:', error);
            alert('Failed to pass turn.');
        });
    }

    function countScore() {
        if (!gameID) {
            alert('Game not started.');
            return;
        }
        let ruleSet = document.getElementById('scoring-rule').value;
        // Send request to backend to count score
        fetch('/count-score', {
            method: 'POST',
            body: new URLSearchParams({
                'gameID': gameID.toString(),
                'ruleSet': ruleSet
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error counting score: ' + data.error);
            } else {
                alert(`Game Over!\nBlack Score: ${data.blackScore}\nWhite Score: ${data.whiteScore}\nWinner: ${data.winner}`);
            }
        })
        .catch(error => {
            console.error('Error counting score:', error);
            alert('Failed to count score.');
        });
    }

    function exportSGF() {
        if (!gameID) {
            alert('Game not started.');
            return;
        }
        // Request SGF data from backend
        fetch('/game-history?' + new URLSearchParams({ 'gameID': gameID.toString() }))
        .then(response => response.text())
        .then(sgfData => {
            // Trigger download of SGF file
            let blob = new Blob([sgfData], { type: 'application/x-go-sgf' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = `game_${gameID}.sgf`;
            document.body.appendChild(a); // Append to body
            a.click();
            document.body.removeChild(a); // Remove from body
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error exporting SGF:', error);
            alert('Failed to export SGF.');
        });
    }

    function getPlayerColor(playerID) {
        // Replace with actual logic to determine player's color
        if (playerID === playerID) { // Assuming playerID matches Black player
            return 1; // Black
        } else {
            return 2; // White
        }
    }

    function updateGameInfo() {
        let turnPlayerName = (turn === getPlayerColor(playerID)) ? 'You' : 'Opponent';
        document.getElementById('turn-player').textContent = turnPlayerName;
    }
});

