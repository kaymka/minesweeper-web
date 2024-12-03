import { saveGame, getAllGames, clearDatabase, getGameById } from './db.js';

document.addEventListener('DOMContentLoaded', function () {
    let width, height, mines, gameBoard, cells, gameStatus, gameOver = false, playerName;
    let gameSaved = false;
    let moves = []; // Хранение шагов игрока

    const startBtn = document.getElementById('startBtn');
    const viewPastGamesBtn = document.getElementById('view-past-games');
    const clearDbBtn = document.getElementById('clear-db');
    const helpBtn = document.getElementById('help');
    const closeHelpBtn = document.getElementById('close-help');
    const replayContainer = document.getElementById('replay-container');
    const closeReplayBtn = document.getElementById('close-replay');

    startBtn.addEventListener('click', startNewGame);
    viewPastGamesBtn.addEventListener('click', displayPastGames);
    clearDbBtn.addEventListener('click', async () => {
        await clearDatabase();
        alert('Database cleared!');
        displayPastGames();
    });
    helpBtn.addEventListener('click', () => {
        document.getElementById('help-container').style.display = 'block';
    });
    closeHelpBtn.addEventListener('click', () => {
        document.getElementById('help-container').style.display = 'none';
    });
    closeReplayBtn.addEventListener('click', () => {
        replayContainer.style.display = 'none';
    });

    async function startNewGame() {
        playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            alert('Please enter your name before starting the game.');
            return;
        }

        width = parseInt(document.getElementById('width').value);
        height = parseInt(document.getElementById('height').value);
        mines = parseInt(document.getElementById('mines').value);

        gameBoard = document.getElementById('game-board');
        gameStatus = document.getElementById('game-status');
        gameOver = false;
        gameSaved = false;
        moves = []; // Сброс шагов при новой игре

        gameBoard.innerHTML = '';
        gameStatus.textContent = '';
        cells = [];
        const minePositions = generateMines(width * height, mines);

        createBoard(width, height, minePositions);
        document.querySelector('.game-container').style.display = 'block';
    }

    async function saveGameResult(winStatus) {
        if (!gameSaved) {
            const gameData = {
                playerName,
                size: `${width}x${height}`,
                mines,
                winStatus: winStatus ? 'Won' : 'Lost',
                timestamp: new Date().toISOString(),
                moves // Сохранение шагов
            };
            await saveGame(gameData);
            gameSaved = true;
        }
    }

    async function displayPastGames() {
        const games = await getAllGames();
        const gameList = document.getElementById('game-list');
        gameList.innerHTML = '';
        games.forEach(game => {
            const listItem = document.createElement('li');
            const timestamp = new Date(game.timestamp).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
            listItem.textContent = `Player: ${game.playerName} - Game on ${timestamp} - Size: ${game.size} - Mines: ${game.mines} - Result: ${game.winStatus} - Сlick to view steps`;
            listItem.addEventListener('click', () => replayGame(game.id));
            gameList.appendChild(listItem);
        });
    }

    async function replayGame(id) {
        const gameData = await getGameById(id);
        if (!gameData) {
            alert('Game not found!');
            return;
        }

        replayContainer.style.display = 'block';
        const replayList = document.getElementById('replay-list');
        replayList.innerHTML = `<strong>Game Replay:</strong> Player: ${gameData.playerName} | Size: ${gameData.size} | Mines: ${gameData.mines} | Result: ${gameData.winStatus}`;

        if (gameData.moves && gameData.moves.length > 0) {
            const movesList = document.createElement('ul');
            gameData.moves.forEach((move, index) => {
                const moveItem = document.createElement('li');
                moveItem.textContent = `Move ${index + 1}: ${move.row}x${move.col} - ${move.result}`;
                movesList.appendChild(moveItem);
            });
            replayList.appendChild(movesList);
        } else {
            const noMoves = document.createElement('p');
            noMoves.textContent = 'No moves recorded for this game.';
            replayList.appendChild(noMoves);
        }
    }

    function createBoard(width, height, minePositions) {
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.index = i * width + j;
                gameBoard.appendChild(cell);
                cells.push(cell);

                cell.addEventListener('click', () => {
                    if (gameOver) return;
                    handleCellClick(cell, minePositions);
                });
            }
        }
        gameBoard.style.gridTemplateColumns = `repeat(${width}, 40px)`;
        gameBoard.style.gridTemplateRows = `repeat(${height}, 40px)`;
    }

    function generateMines(totalCells, mineCount) {
        const minePositions = new Set();
        while (minePositions.size < mineCount) {
            minePositions.add(Math.floor(Math.random() * totalCells));
        }
        return minePositions;
    }

    async function handleCellClick(cell, minePositions) {
    if (gameOver || gameSaved) return; // Игра завершена или уже сохранена, пропускаем обработку

    const index = parseInt(cell.dataset.index);
    const row = Math.floor(index / width);
    const col = index % width;

    if (minePositions.has(index)) {
        cell.classList.add('revealed', 'mine');
        moves.push({ row, col, result: 'Mine' }); // Запись шага
        gameOver = true;
        gameStatus.textContent = 'Game Over!';
        await saveGameResult(false); // Сохраняем игру при поражении
        return;
    }

    moves.push({ row, col, result: 'Safe' }); // Запись шага
    revealCell(cell, minePositions);

    if (checkForWin(minePositions)) {
        gameStatus.textContent = 'You Win!';
        gameOver = true;
        await saveGameResult(true); // Сохраняем игру при победе
    }
}


    function revealCell(cell, minePositions) {
        if (cell.classList.contains('revealed')) return;
        cell.classList.add('revealed');
        const adjacentMines = countAdjacentMines(parseInt(cell.dataset.index), minePositions);

        if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
        } else {
            revealAdjacentCells(parseInt(cell.dataset.index), minePositions);
        }


    }

    function countAdjacentMines(index, minePositions) {
        const neighbors = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];
        return neighbors.reduce((count, offset) => count + (minePositions.has(index + offset) ? 1 : 0), 0);
    }

    function revealAdjacentCells(index, minePositions) {
        const neighbors = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];
        neighbors.forEach(offset => {
            const neighborIndex = index + offset;
            const neighborCell = cells[neighborIndex];
            if (neighborCell && !neighborCell.classList.contains('revealed') && !minePositions.has(neighborIndex)) {
                revealCell(neighborCell, minePositions);
            }
        });
    }

    function checkForWin(minePositions) {
        return cells.every(cell => {
            const index = parseInt(cell.dataset.index);
            return minePositions.has(index) || cell.classList.contains('revealed');
        });
    }
});
