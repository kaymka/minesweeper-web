document.addEventListener('DOMContentLoaded', function () {
    let db;

    // Открытие базы данных
    function openDatabase() {
        const request = indexedDB.open('minegameDB', 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('games')) {
                const objectStore = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            console.log('Database successfully opened.');
            loadSavedGames(); // Загрузка игр при запуске
        };

        request.onerror = function (event) {
            console.error('Error opening IndexedDB:', event.target.error);
        };
    }

    openDatabase();

    let boardWidth, boardHeight, mineCount, boardGrid, cells, gameStatus, gameOver = false, userName;
    let gameSaved = false;

    // Привязка кнопки старта игры
    const startGameBtn = document.getElementById('startGameBtn');
    startGameBtn.addEventListener('click', startNewGame);

    // Привязка кнопки просмотра сохраненных игр
    const viewGamesBtn = document.getElementById('viewGamesBtn');
    viewGamesBtn.addEventListener('click', loadSavedGames);

    function startNewGame() {
        userName = document.getElementById('userName').value.trim();
        if (!userName) {
            alert('Please enter your name before starting the game.');
            return;
        }

        boardWidth = parseInt(document.getElementById('boardWidth').value);
        boardHeight = parseInt(document.getElementById('boardHeight').value);
        mineCount = parseInt(document.getElementById('mineCount').value);

        boardGrid = document.getElementById('game-board');
        gameStatus = document.getElementById('game-status');
        gameOver = false;
        gameSaved = false;

        boardGrid.innerHTML = '';
        gameStatus.textContent = '';

        cells = [];
        const totalCells = boardWidth * boardHeight;
        const minePositions = generateMines(totalCells, mineCount);

        // Создание игрового поля
        for (let i = 0; i < boardHeight; i++) {
            for (let j = 0; j < boardWidth; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.index = i * boardWidth + j;
                boardGrid.appendChild(cell);
                cells.push(cell);

                cell.addEventListener('click', () => {
                    if (gameOver) return;
                    handleCellClick(cell, minePositions);
                });
            }
        }

        boardGrid.style.gridTemplateColumns = `repeat(${boardWidth}, 30px)`;
        boardGrid.style.gridTemplateRows = `repeat(${boardHeight}, 30px)`;

        document.getElementById('game-container').style.display = 'block';
    }

    function generateMines(totalCells, mineCount) {
        const minePositions = new Set();
        while (minePositions.size < mineCount) {
            minePositions.add(Math.floor(Math.random() * totalCells));
        }
        return minePositions;
    }

    function handleCellClick(cell, minePositions) {
        const index = parseInt(cell.dataset.index);

        if (minePositions.has(index)) {
            cell.classList.add('revealed', 'mine');
            gameOver = true;
            gameStatus.textContent = 'Game Over!';
            if (!gameSaved) {
                saveGame(false);
                gameSaved = true;
            }
            return;
        }

        revealCell(cell, minePositions);
    }

    function revealCell(cell, minePositions) {
        const index = parseInt(cell.dataset.index);
        if (cell.classList.contains('revealed')) return;

        cell.classList.add('revealed');
        const adjacentMines = countAdjacentMines(index, minePositions);

        if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
        } else {
            revealAdjacentCells(index, minePositions);
        }

        // Проверка на победу
        if (checkForWin(minePositions) && !gameSaved) {
            gameStatus.textContent = 'You Win!';
            gameOver = true;
            saveGame(true);
            gameSaved = true;
        }
    }

    function revealAdjacentCells(index, minePositions) {
        const neighbors = [
            -1, 1, -boardWidth, boardWidth,
            -boardWidth - 1, -boardWidth + 1, boardWidth - 1, boardWidth + 1
        ];

        neighbors.forEach(offset => {
            const neighborIndex = index + offset;
            if (neighborIndex < 0 || neighborIndex >= boardWidth * boardHeight) return;

            const neighborCell = cells[neighborIndex];
            if (!neighborCell.classList.contains('revealed') && !minePositions.has(neighborIndex)) {
                revealCell(neighborCell, minePositions);
            }
        });
    }

    function countAdjacentMines(index, minePositions) {
        const neighbors = [
            -1, 1, -boardWidth, boardWidth,
            -boardWidth - 1, -boardWidth + 1, boardWidth - 1, boardWidth + 1
        ];
        let mineCount = 0;

        neighbors.forEach(offset => {
            const neighborIndex = index + offset;
            if (minePositions.has(neighborIndex)) mineCount++;
        });

        return mineCount;
    }

    function checkForWin(minePositions) {
        return cells.every(cell => {
            const index = parseInt(cell.dataset.index);
            return minePositions.has(index) || cell.classList.contains('revealed');
        });
    }

    // Сохранение игры
    function saveGame(winStatus) {
        const gameData = {
            userName: userName,
            size: `${boardWidth}x${boardHeight}`,
            mineCount: mineCount,
            winStatus: winStatus ? 'Win' : 'Loss',
            timestamp: new Date().toISOString(),
        };

        const transaction = db.transaction(['games'], 'readwrite');
        const objectStore = transaction.objectStore('games');
        const request = objectStore.add(gameData);

        request.onsuccess = function (event) {
            console.log('Game saved with ID:', event.target.result);
        };

        request.onerror = function (event) {
            console.error('Error saving game:', event.target.error);
        };
    }

    // Загрузка сохраненных игр
    function loadSavedGames() {
        const savedGamesContainer = document.getElementById('saved-games');
        savedGamesContainer.innerHTML = '';

        const transaction = db.transaction(['games'], 'readonly');
        const objectStore = transaction.objectStore('games');
        const request = objectStore.getAll();

        request.onsuccess = function (event) {
            const games = event.target.result;

            if (games.length === 0) {
                savedGamesContainer.textContent = 'No saved games found.';
                return;
            }

            games.forEach(game => {
                const gameElement = document.createElement('div');
                gameElement.classList.add('saved-game');
                gameElement.textContent = `Player: ${game.userName}, Size: ${game.size}, Mines: ${game.mineCount}, Result: ${game.winStatus}, Date: ${new Date(game.timestamp).toLocaleString()}`;
                savedGamesContainer.appendChild(gameElement);
            });
        };

        request.onerror = function (event) {
            console.error('Error loading saved games:', event.target.error);
        };
    }
});
