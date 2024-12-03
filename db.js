import { openDB } from './libs/idb.js';

// Открытие базы данных
export async function openDatabase() {
    return await openDB('minesweeper', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('games')) {
                const store = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        }
    });
}

// Сохранение игры
export async function saveGame(gameData) {
    const db = await openDatabase();
    return await db.add('games', gameData);
}

// Получение всех сохранённых игр
export async function getAllGames() {
    const db = await openDatabase();
    return await db.getAll('games');
}

// Возвращает игру по идентификатору
export async function getGameById(id) {
    const db = await openDB('minesweeper', 1);
    return await db.get('games', id);
}


// Очистка базы данных
export async function clearDatabase() {
    const db = await openDatabase();
    await db.clear('games');
}
