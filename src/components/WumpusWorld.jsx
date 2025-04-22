import { useState, useEffect } from 'react';

// Cell types
const EMPTY = 0;
const WUMPUS = 1;
const PIT = 2;
const GOLD = 3;
const BREEZE = 5;
const STENCH = 6;

// Game states
const PLAYING = 0;
const WON = 1;
const LOST = 2;

export default function WumpusWorld() {
    const [gridSize] = useState(4);
    const [world, setWorld] = useState([]);
    const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
    const [visited, setVisited] = useState({});
    const [gameState, setGameState] = useState(PLAYING);
    const [score, setScore] = useState(0);
    const [hasArrow, setHasArrow] = useState(true);
    const [message, setMessage] = useState("Welcome to Wumpus World!");
    const [aiActive, setAiActive] = useState(false);
    const [aiThinking, setAiThinking] = useState(false);

    // Initialize the world
    useEffect(() => {
        resetGame();
    }, [gridSize]);

    const resetGame = () => {
        // Create an empty world
        const newWorld = Array(gridSize).fill().map(() => Array(gridSize).fill(EMPTY));

        // Place Wumpus (not in the starting position)
        let wumpusX, wumpusY;
        do {
            wumpusX = Math.floor(Math.random() * gridSize);
            wumpusY = Math.floor(Math.random() * gridSize);
        } while (wumpusX === 0 && wumpusY === 0);

        newWorld[wumpusY][wumpusX] = WUMPUS;

        // Place Pits (not in the starting position)
        const numPits = Math.floor(gridSize * gridSize * 0.2); // 20% of cells are pits
        for (let i = 0; i < numPits; i++) {
            let pitX, pitY;
            do {
                pitX = Math.floor(Math.random() * gridSize);
                pitY = Math.floor(Math.random() * gridSize);
            } while ((pitX === 0 && pitY === 0) || newWorld[pitY][pitX] !== EMPTY);

            newWorld[pitY][pitX] = PIT;
        }

        // Place Gold (not in the starting position and not where there's a wumpus or pit)
        let goldX, goldY;
        do {
            goldX = Math.floor(Math.random() * gridSize);
            goldY = Math.floor(Math.random() * gridSize);
        } while ((goldX === 0 && goldY === 0) || newWorld[goldY][goldX] !== EMPTY);

        newWorld[goldY][goldX] = GOLD;

        // Place breezes and stenches
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (newWorld[y][x] === PIT) {
                    // Place breeze in adjacent cells
                    placeSensor(newWorld, x, y, BREEZE);
                } else if (newWorld[y][x] === WUMPUS) {
                    // Place stench in adjacent cells
                    placeSensor(newWorld, x, y, STENCH);
                }
            }
        }

        setWorld(newWorld);
        setPlayerPosition({ x: 0, y: 0 });
        setVisited({ "0,0": true });
        setGameState(PLAYING);
        setScore(0);
        setHasArrow(true);
        setMessage("Welcome to Wumpus World!");
        setAiActive(false);
        setAiThinking(false);
    };

    const placeSensor = (world, x, y, sensorType) => {
        // Helper to place sensors (breeze or stench) in adjacent cells
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
                if (world[newY][newX] === EMPTY) {
                    world[newY][newX] = sensorType;
                }
            }
        }
    };

    const movePlayer = (dx, dy) => {
        if (gameState !== PLAYING) return;

        const newX = playerPosition.x + dx;
        const newY = playerPosition.y + dy;

        // Check if the move is valid
        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
            const cellContent = world[newY][newX];

            // Update visited cells
            setVisited(prev => ({
                ...prev,
                [`${newX},${newY}`]: true
            }));

            // Update player position
            setPlayerPosition({ x: newX, y: newY });

            // Update score
            setScore(prev => prev - 1); // -1 point for each move

            // Check game conditions
            if (cellContent === WUMPUS) {
                setGameState(LOST);
                setMessage("You were eaten by the Wumpus! Game over.");
            } else if (cellContent === PIT) {
                setGameState(LOST);
                setMessage("You fell into a pit! Game over.");
            } else if (cellContent === GOLD) {
                setGameState(WON);
                setScore(prev => prev + 1000); // +1000 points for gold
                setMessage("You found the gold! You win!");
            } else if (cellContent === BREEZE) {
                setMessage("You feel a breeze. There must be a pit nearby.");
            } else if (cellContent === STENCH) {
                setMessage("You smell a stench. The Wumpus must be nearby.");
            } else {
                setMessage("All is quiet...");
            }
        }
    };

    const shootArrow = (dx, dy) => {
        if (!hasArrow || gameState !== PLAYING) return;

        setHasArrow(false);
        setScore(prev => prev - 10); // -10 points for shooting an arrow

        // Check if the arrow hits the Wumpus
        let arrowX = playerPosition.x;
        let arrowY = playerPosition.y;

        while (arrowX >= 0 && arrowX < gridSize && arrowY >= 0 && arrowY < gridSize) {
            arrowX += dx;
            arrowY += dy;

            if (arrowX < 0 || arrowX >= gridSize || arrowY < 0 || arrowY >= gridSize) {
                setMessage("Your arrow disappears into the darkness.");
                break;
            }

            if (world[arrowY][arrowX] === WUMPUS) {
                // Clone the world and remove the Wumpus
                const newWorld = world.map(row => [...row]);
                newWorld[arrowY][arrowX] = EMPTY;
                setWorld(newWorld);
                setMessage("You killed the Wumpus!");
                setScore(prev => prev + 500); // +500 points for killing the Wumpus
                break;
            }
        }
    };

    // AI algorithm to make the next best move
    const runAI = () => {
        if (gameState !== PLAYING || aiThinking) return;

        setAiThinking(true);

        // Simulate AI thinking time
        setTimeout(() => {
            // Very simple AI strategy:
            // 1. Prefer unvisited cells that don't have breezes or stenches around
            // 2. If no safe move, take a risk

            const directions = [
                { dx: 0, dy: -1, name: 'up' },
                { dx: 1, dy: 0, name: 'right' },
                { dx: 0, dy: 1, name: 'down' },
                { dx: -1, dy: 0, name: 'left' }
            ];

            // Filter valid moves
            const validMoves = directions.filter(({ dx, dy }) => {
                const newX = playerPosition.x + dx;
                const newY = playerPosition.y + dy;
                return newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize;
            });

            // Sort moves by priority
            const prioritizedMoves = validMoves.sort((a, b) => {
                const aX = playerPosition.x + a.dx;
                const aY = playerPosition.y + a.dy;
                const bX = playerPosition.x + b.dx;
                const bY = playerPosition.y + b.dy;

                const aVisited = visited[`${aX},${aY}`] || false;
                const bVisited = visited[`${bX},${bY}`] || false;

                const aContent = world[aY][aX];
                const bContent = world[bY][bX];

                // Prefer gold
                if (aContent === GOLD) return -1;
                if (bContent === GOLD) return 1;

                // Avoid danger
                if (aContent === WUMPUS || aContent === PIT) return 1;
                if (bContent === WUMPUS || bContent === PIT) return -1;

                // Prefer unvisited
                if (aVisited && !bVisited) return 1;
                if (!aVisited && bVisited) return -1;

                // Prefer non-warning tiles
                if ((aContent === BREEZE || aContent === STENCH) &&
                    (bContent !== BREEZE && bContent !== STENCH)) return 1;
                if ((bContent === BREEZE || bContent === STENCH) &&
                    (aContent !== BREEZE && aContent !== STENCH)) return -1;

                return 0;
            });

            // Execute best move if available
            if (prioritizedMoves.length > 0) {
                const bestMove = prioritizedMoves[0];
                setMessage(`AI chose to move ${bestMove.name}`);
                movePlayer(bestMove.dx, bestMove.dy);
            }

            setAiThinking(false);
        }, 1000);
    };

    // Effect to run AI if active
    useEffect(() => {
        if (aiActive && gameState === PLAYING && !aiThinking) {
            const timer = setTimeout(runAI, 1500);
            return () => clearTimeout(timer);
        }
    }, [aiActive, playerPosition, gameState, aiThinking]);

    // Render cell content
    const renderCell = (x, y) => {
        const isPlayer = playerPosition.x === x && playerPosition.y === y;
        const isVisited = visited[`${x},${y}`] || false;

        if (isPlayer) {
            return <div className="bg-blue-500 rounded-full w-6 h-6"></div>;
        }

        if (!isVisited) {
            return <div className="bg-gray-400 w-6 h-6"></div>;
        }

        const cellContent = world[y][x];

        switch (cellContent) {
            case EMPTY:
                return <div className="w-6 h-6"></div>;
            case WUMPUS:
                return <div className="bg-red-600 w-6 h-6 rounded"></div>;
            case PIT:
                return <div className="bg-black w-6 h-6 rounded"></div>;
            case GOLD:
                return <div className="bg-yellow-400 w-6 h-6 rounded"></div>;
            case BREEZE:
                return <div className="bg-blue-200 w-6 h-6"></div>;
            case STENCH:
                return <div className="bg-green-200 w-6 h-6"></div>;
            default:
                return <div className="w-6 h-6"></div>;
        }
    };

    return (
        <div className="flex flex-col items-center p-4 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Wumpus World</h1>

            <div className="mb-4 text-center">
                <p className="text-lg font-semibold">{message}</p>
                <p>Score: {score}</p>
                <p>Arrow: {hasArrow ? "Available" : "Used"}</p>
                <p>Game Status: {gameState === PLAYING ? "Playing" : gameState === WON ? "Won" : "Lost"}</p>
            </div>

            <div className="mb-6 bg-gray-100 p-4 rounded shadow">
                <div className="grid grid-cols-4 gap-1 mb-4">
                    {world.map((row, y) => (
                        row.map((_, x) => (
                            <div
                                key={`${x},${y}`}
                                className="w-10 h-10 bg-gray-200 flex items-center justify-center border border-gray-300"
                            >
                                {renderCell(x, y)}
                            </div>
                        ))
                    ))}
                </div>
            </div>

            <div className="flex flex-col items-center mb-4">
                <button
                    onClick={() => movePlayer(0, -1)}
                    className="bg-blue-500 text-white px-4 py-2 rounded mb-2 w-20"
                    disabled={gameState !== PLAYING}
                >
                    Up
                </button>
                <div className="flex justify-center">
                    <button
                        onClick={() => movePlayer(-1, 0)}
                        className="bg-blue-500 text-white px-4 py-2 rounded mr-2 w-20"
                        disabled={gameState !== PLAYING}
                    >
                        Left
                    </button>
                    <button
                        onClick={() => movePlayer(1, 0)}
                        className="bg-blue-500 text-white px-4 py-2 rounded ml-2 w-20"
                        disabled={gameState !== PLAYING}
                    >
                        Right
                    </button>
                </div>
                <button
                    onClick={() => movePlayer(0, 1)}
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2 w-20"
                    disabled={gameState !== PLAYING}
                >
                    Down
                </button>
            </div>

            <div className="flex mb-4">
                <button
                    onClick={() => shootArrow(0, -1)}
                    className="bg-red-500 text-white px-2 py-1 rounded mx-1"
                    disabled={!hasArrow || gameState !== PLAYING}
                >
                    Shoot Up
                </button>
                <button
                    onClick={() => shootArrow(1, 0)}
                    className="bg-red-500 text-white px-2 py-1 rounded mx-1"
                    disabled={!hasArrow || gameState !== PLAYING}
                >
                    Shoot Right
                </button>
                <button
                    onClick={() => shootArrow(0, 1)}
                    className="bg-red-500 text-white px-2 py-1 rounded mx-1"
                    disabled={!hasArrow || gameState !== PLAYING}
                >
                    Shoot Down
                </button>
                <button
                    onClick={() => shootArrow(-1, 0)}
                    className="bg-red-500 text-white px-2 py-1 rounded mx-1"
                    disabled={!hasArrow || gameState !== PLAYING}
                >
                    Shoot Left
                </button>
            </div>

            <div className="flex space-x-4 mb-4">
                <button
                    onClick={resetGame}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                >
                    Reset Game
                </button>
                <button
                    onClick={() => setAiActive(!aiActive)}
                    className={`${aiActive ? 'bg-yellow-500' : 'bg-purple-500'} text-white px-4 py-2 rounded`}
                    disabled={gameState !== PLAYING}
                >
                    {aiActive ? 'Stop AI' : 'Start AI'}
                </button>
            </div>

            <div className="mt-4 bg-gray-100 p-4 rounded w-full">
                <h2 className="text-lg font-semibold mb-2">Game Rules:</h2>
                <ul className="list-disc pl-5">
                    <li>Navigate the grid to find the gold and avoid dangers</li>
                    <li>The Wumpus (red) will eat you if you enter its cell</li>
                    <li>Pits (black) will make you fall to your death</li>
                    <li>Breezes (light blue) indicate a pit is nearby</li>
                    <li>Stenches (light green) indicate the Wumpus is nearby</li>
                    <li>You have one arrow to kill the Wumpus</li>
                    <li>Goal: Find the gold (yellow) with the highest score</li>
                </ul>
            </div>
        </div>
    );
}