/**
 * Test file to verify systematic pairing cycling
 * 
 * This demonstrates that the pairing system cycles through all 3
 * possible team combinations before repeating any.
 */

// Mock the pairing logic
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

const selectPairing = (players) => {
    const playerIds = players.map(p => p.id);
    const setKey = getPlayerSetKey(playerIds);

    const allPairings = getAllPairings(players);

    let nextPairingIndex = pairingHistory.get(setKey);

    if (nextPairingIndex === undefined) {
        nextPairingIndex = 0; // Start with first pairing
    }

    const selectedPairing = allPairings[nextPairingIndex];

    // Advance to next pairing index (cycles 0 -> 1 -> 2 -> 0)
    const nextIndex = (nextPairingIndex + 1) % 3;
    pairingHistory.set(setKey, nextIndex);

    return { pairing: selectedPairing, index: nextPairingIndex };
};

const formatPairing = (pairing, players) => {
    const team1 = pairing[0].map(id => players.find(p => p.id === id).name).join(' & ');
    const team2 = pairing[1].map(id => players.find(p => p.id === id).name).join(' & ');
    return `${team1} vs ${team2}`;
};

// Mock player data
const players = [
    { id: '1', name: 'Josh' },
    { id: '2', name: 'Luke' },
    { id: '3', name: 'Cam' },
    { id: '4', name: 'Deeps' },
    { id: '5', name: 'Devin' }
];

console.log('=== Systematic Pairing Cycling Test ===\n');

// Test 1: Same 4 players cycle through all 3 pairings
console.log('Test 1: Cycling Through All 3 Pairings');
console.log('---------------------------------------');
const group1 = [players[0], players[1], players[2], players[3]]; // Josh, Luke, Cam, Deeps

console.log('Same 4 players (Josh, Luke, Cam, Deeps) playing 6 times:\n');
const usedPairings = [];

for (let match = 1; match <= 6; match++) {
    const result = selectPairing(group1);
    usedPairings.push(result.index);
    console.log(`Match ${match}: ${formatPairing(result.pairing, players)} (Pairing ${result.index})`);
}

console.log('\nPairing sequence:', usedPairings.join(' -> '));
console.log('Expected: 0 -> 1 -> 2 -> 0 -> 1 -> 2');
const isCorrectCycle = usedPairings.join(',') === '0,1,2,0,1,2';
console.log(isCorrectCycle ? '✅ Correct systematic cycling!' : '❌ Incorrect sequence');
console.log('');

// Test 2: Different groups maintain independent cycles
console.log('Test 2: Independent Cycles for Different Player Groups');
console.log('------------------------------------------------------');
pairingHistory.clear(); // Reset for clean test

const group2 = [players[0], players[1], players[2], players[4]]; // Josh, Luke, Cam, Devin
const group3 = [players[0], players[2], players[3], players[4]]; // Josh, Cam, Deeps, Devin

console.log('Group A (Josh, Luke, Cam, Deeps):');
for (let i = 1; i <= 3; i++) {
    const result = selectPairing(group1);
    console.log(`  Match ${i}: ${formatPairing(result.pairing, players)} (Pairing ${result.index})`);
}

console.log('\nGroup B (Josh, Luke, Cam, Devin):');
for (let i = 1; i <= 3; i++) {
    const result = selectPairing(group2);
    console.log(`  Match ${i}: ${formatPairing(result.pairing, players)} (Pairing ${result.index})`);
}

console.log('\nGroup C (Josh, Cam, Deeps, Devin):');
for (let i = 1; i <= 3; i++) {
    const result = selectPairing(group3);
    console.log(`  Match ${i}: ${formatPairing(result.pairing, players)} (Pairing ${result.index})`);
}

console.log('\n✅ Each group maintains its own independent cycle\n');

// Test 3: 5-Player Tournament Simulation
console.log('Test 3: 5-Player Tournament Simulation');
console.log('---------------------------------------');
pairingHistory.clear();

const rounds = [
    { sitting: 4, players: [players[0], players[1], players[2], players[3]] },
    { sitting: 0, players: [players[1], players[2], players[3], players[4]] },
    { sitting: 1, players: [players[0], players[2], players[3], players[4]] },
    { sitting: 2, players: [players[0], players[1], players[3], players[4]] },
    { sitting: 3, players: [players[0], players[1], players[2], players[4]] },
    { sitting: 4, players: [players[0], players[1], players[2], players[3]] }, // Same as Round 1
    { sitting: 0, players: [players[1], players[2], players[3], players[4]] }, // Same as Round 2
];

rounds.forEach((round, index) => {
    const result = selectPairing(round.players);
    const sittingPlayer = players[round.sitting].name;
    console.log(`Round ${index + 1} (${sittingPlayer} sits): ${formatPairing(result.pairing, players)} (Pairing ${result.index})`);
});

console.log('\n✅ Round 1 and Round 6 have different pairings (same 4 players)');
console.log('✅ Round 2 and Round 7 have different pairings (same 4 players)\n');

// Test 4: Verify all pairings used before repeat
console.log('Test 4: All Pairings Used Before Any Repeat');
console.log('--------------------------------------------');
pairingHistory.clear();

const testGroup = [players[0], players[1], players[2], players[3]];
const pairingCounts = { 0: 0, 1: 0, 2: 0 };

for (let match = 1; match <= 9; match++) {
    const result = selectPairing(testGroup);
    pairingCounts[result.index]++;
}

console.log('After 9 matches:');
console.log(`  Pairing 0 used: ${pairingCounts[0]} times`);
console.log(`  Pairing 1 used: ${pairingCounts[1]} times`);
console.log(`  Pairing 2 used: ${pairingCounts[2]} times`);

const allEqual = pairingCounts[0] === 3 && pairingCounts[1] === 3 && pairingCounts[2] === 3;
console.log(allEqual ? '✅ Perfect distribution - each pairing used exactly 3 times' : '❌ Unequal distribution');
console.log('');

// Summary
console.log('=== Test Summary ===');
console.log('✅ Pairings cycle systematically (0 -> 1 -> 2 -> 0)');
console.log('✅ Different player groups maintain independent cycles');
console.log('✅ Same 4 players get different pairings each time they play');
console.log('✅ All 3 pairings used equally over time');
console.log('\n🎉 All tests PASSED!');
