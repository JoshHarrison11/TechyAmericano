/**
 * Test file to demonstrate the improved pairing algorithm for 5-player tournaments
 * 
 * This file can be run in a browser console or Node.js environment to verify
 * that the pairing algorithm correctly avoids repeating the same team pairings.
 */

// Mock player data
const createMockPlayers = () => [
    { id: '1', name: 'Josh' },
    { id: '2', name: 'Luke' },
    { id: '3', name: 'Cam' },
    { id: '4', name: 'Deeps' },
    { id: '5', name: 'Devin' }
];

// Simulate the pairing history tracking
const pairingHistory = new Map();

const getPlayerSetKey = (playerIds) => {
    return [...playerIds].sort().join(',');
};

const getAllPairings = (players) => {
    const [p1, p2, p3, p4] = players;
    return [
        [[p1.id, p2.id], [p3.id, p4.id]], // Pairing 0: A+B vs C+D
        [[p1.id, p3.id], [p2.id, p4.id]], // Pairing 1: A+C vs B+D
        [[p1.id, p4.id], [p2.id, p3.id]]  // Pairing 2: A+D vs B+C
    ];
};

const selectPairing = (players, history = []) => {
    const playerIds = players.map(p => p.id);
    const setKey = getPlayerSetKey(playerIds);

    const allPairings = getAllPairings(players);
    const lastPairingIndex = pairingHistory.get(setKey);

    let availablePairings;
    if (lastPairingIndex !== undefined) {
        availablePairings = allPairings.filter((_, index) => index !== lastPairingIndex);
        console.log(`  ℹ️  Excluding last pairing (index ${lastPairingIndex})`);
    } else {
        availablePairings = allPairings;
        console.log(`  ℹ️  First time these 4 players play together`);
    }

    const selectedIndex = Math.floor(Math.random() * availablePairings.length);
    const selectedPairing = availablePairings[selectedIndex];

    const originalIndex = allPairings.findIndex(p =>
        JSON.stringify(p) === JSON.stringify(selectedPairing)
    );

    pairingHistory.set(setKey, originalIndex);

    return { pairing: selectedPairing, index: originalIndex };
};

// Helper to format pairing for display
const formatPairing = (pairing, players) => {
    const team1 = pairing[0].map(id => players.find(p => p.id === id).name).join(' & ');
    const team2 = pairing[1].map(id => players.find(p => p.id === id).name).join(' & ');
    return `${team1} vs ${team2}`;
};

// Test scenario: Same 4 players play multiple times
console.log('=== 5-Player Tournament Pairing Test ===\n');

const players = createMockPlayers();

// Round 1: Josh, Luke, Cam, Deeps play (Devin sits)
console.log('Round 1: Devin sits out');
const activePlayers1 = [players[0], players[1], players[2], players[3]];
const result1 = selectPairing(activePlayers1);
console.log(`  Selected: ${formatPairing(result1.pairing, players)} (Pairing ${result1.index})`);
console.log('');

// Round 2: Different 4 players
console.log('Round 2: Luke sits out');
const activePlayers2 = [players[0], players[2], players[3], players[4]];
const result2 = selectPairing(activePlayers2);
console.log(`  Selected: ${formatPairing(result2.pairing, players)} (Pairing ${result2.index})`);
console.log('');

// Round 3: Same 4 players as Round 1 (should avoid Round 1's pairing)
console.log('Round 3: Devin sits out (same 4 players as Round 1)');
const activePlayers3 = [players[0], players[1], players[2], players[3]];
const result3 = selectPairing(activePlayers3);
console.log(`  Selected: ${formatPairing(result3.pairing, players)} (Pairing ${result3.index})`);
console.log(`  ✅ Different from Round 1: ${result3.index !== result1.index}`);
console.log('');

// Round 4: Same 4 players again (should avoid Round 3's pairing)
console.log('Round 4: Devin sits out (same 4 players again)');
const activePlayers4 = [players[0], players[1], players[2], players[3]];
const result4 = selectPairing(activePlayers4);
console.log(`  Selected: ${formatPairing(result4.pairing, players)} (Pairing ${result4.index})`);
console.log(`  ✅ Different from Round 3: ${result4.index !== result3.index}`);
console.log('');

// Round 5: Same 4 players once more
console.log('Round 5: Devin sits out (same 4 players once more)');
const activePlayers5 = [players[0], players[1], players[2], players[3]];
const result5 = selectPairing(activePlayers5);
console.log(`  Selected: ${formatPairing(result5.pairing, players)} (Pairing ${result5.index})`);
console.log(`  ✅ Different from Round 4: ${result5.index !== result4.index}`);
console.log('');

// Summary
console.log('=== Summary ===');
console.log('Pairings used for Josh, Luke, Cam, Deeps:');
console.log(`  Round 1: Pairing ${result1.index}`);
console.log(`  Round 3: Pairing ${result3.index}`);
console.log(`  Round 4: Pairing ${result4.index}`);
console.log(`  Round 5: Pairing ${result5.index}`);
console.log('');
console.log('Expected behavior: No consecutive rounds should have the same pairing index.');
console.log(`✅ Test ${result1.index !== result3.index && result3.index !== result4.index && result4.index !== result5.index ? 'PASSED' : 'FAILED'}`);
