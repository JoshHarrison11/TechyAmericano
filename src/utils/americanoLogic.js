/**
 * Americano Tournament Logic
 * 
 * Goal: Rotate players so everyone plays with everyone else.
 * If player count is not divisible by 4, manage sit-outs fairly.
 * 
 * For tournaments: Track team pairings to cycle through all 3 possible
 * combinations systematically for each set of 4 players.
 */

// Store pairing history: Map of player set key -> next pairing index to use
// Key format: "id1,id2,id3,id4" (sorted)
// Value: next pairing index (0, 1, or 2) - cycles through all 3
const pairingHistory = new Map();

/**
 * Generate a unique key for a set of 4 players (sorted by ID)
 */
const getPlayerSetKey = (playerIds) => {
  return [...playerIds].sort().join(',');
};

/**
 * Get all possible team pairings for 4 players
 * Returns array of 3 possible pairings, each as [[team1], [team2]]
 */
const getAllPairings = (players) => {
  const [p1, p2, p3, p4] = players;
  return [
    [[p1.id, p2.id], [p3.id, p4.id]], // Pairing 0: A+B vs C+D
    [[p1.id, p3.id], [p2.id, p4.id]], // Pairing 1: A+C vs B+D
    [[p1.id, p4.id], [p2.id, p3.id]]  // Pairing 2: A+D vs B+C
  ];
};

/**
 * Select a pairing for 4 players, cycling through all 3 combinations
 */
const selectPairing = (players, history) => {
  const playerIds = players.map(p => p.id);
  const setKey = getPlayerSetKey(playerIds);

  // Get all possible pairings
  const allPairings = getAllPairings(players);

  // Get the next pairing index for this group of players
  let nextPairingIndex = pairingHistory.get(setKey);

  if (nextPairingIndex === undefined) {
    // First time these 4 players play together
    // Use partnership history to determine best starting pairing
    if (history && history.length > 0) {
      const countPartnerships = (p1Id, p2Id) => {
        return history.filter(m => {
          const teamA = m.teams[0];
          const teamB = m.teams[1];
          return (teamA.includes(p1Id) && teamA.includes(p2Id)) ||
            (teamB.includes(p1Id) && teamB.includes(p2Id));
        }).length;
      };

      // Score each pairing by total partnerships
      const pairingScores = allPairings.map(pairing => {
        const team1Partnerships = countPartnerships(pairing[0][0], pairing[0][1]);
        const team2Partnerships = countPartnerships(pairing[1][0], pairing[1][1]);
        return team1Partnerships + team2Partnerships;
      });

      // Find minimum score (fewest partnerships)
      const minScore = Math.min(...pairingScores);

      // Get indices of pairings with minimum score
      const bestIndices = pairingScores
        .map((score, index) => ({ score, index }))
        .filter(item => item.score === minScore)
        .map(item => item.index);

      // Randomly select from best options for initial pairing
      nextPairingIndex = bestIndices[Math.floor(Math.random() * bestIndices.length)];
    } else {
      // No history, start with pairing 0
      nextPairingIndex = 0;
    }
  }

  // Select the pairing at the current index
  const selectedPairing = allPairings[nextPairingIndex];

  // Advance to next pairing index (cycles 0 -> 1 -> 2 -> 0)
  const nextIndex = (nextPairingIndex + 1) % 3;
  pairingHistory.set(setKey, nextIndex);

  return selectedPairing;
};


export const generateRound = (players, history, numberOfCourts, rotationIndex = 0) => {
  // 1. Determine sitting players using rotation index
  const playersNeeded = numberOfCourts * 4;
  const sitOutCount = players.length - playersNeeded;

  const sitOuts = [];
  for (let i = 0; i < sitOutCount; i++) {
    const sitOutIndex = (rotationIndex + i) % players.length;
    sitOuts.push(players[sitOutIndex]);
  }

  // 2. Select active players (those not sitting out)
  const sitOutIds = new Set(sitOuts.map(p => p.id));
  const activePlayers = players.filter(p => !sitOutIds.has(p.id));

  // 2. Generate matches for active players
  const matches = [];

  // For 5-player tournaments (4 active, 1 sitting), use the improved pairing logic
  if (activePlayers.length === 4) {
    const pairing = selectPairing(activePlayers, history);

    matches.push({
      id: Date.now(),
      teams: pairing,
      players: activePlayers.map(p => p.id),
      score: [0, 0],
      completed: false
    });
  } else {
    // For other player counts, use the original greedy pairing algorithm
    const pairings = [];
    const used = new Set();

    // Helper to count times two players have been PARTNERS
    const countPartnerships = (p1Id, p2Id) => {
      return history.filter(m => {
        const teamA = m.teams[0];
        const teamB = m.teams[1];
        return (teamA.includes(p1Id) && teamA.includes(p2Id)) ||
          (teamB.includes(p1Id) && teamB.includes(p2Id));
      }).length;
    };

    // Simple greedy pairing
    for (let i = 0; i < activePlayers.length; i++) {
      const p1 = activePlayers[i];
      if (used.has(p1.id)) continue;

      let bestPartner = null;
      let minPartnerships = Infinity;

      for (let j = i + 1; j < activePlayers.length; j++) {
        const p2 = activePlayers[j];
        if (used.has(p2.id)) continue;

        const partnerships = countPartnerships(p1.id, p2.id);
        if (partnerships < minPartnerships) {
          minPartnerships = partnerships;
          bestPartner = p2;
        }
      }

      if (bestPartner) {
        pairings.push([p1, bestPartner]);
        used.add(p1.id);
        used.add(bestPartner.id);
      }
    }

    // Match pairs against each other
    const shuffledPairs = pairings.sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffledPairs.length; i += 2) {
      if (i + 1 < shuffledPairs.length) {
        matches.push({
          id: Date.now() + i,
          teams: [
            [shuffledPairs[i][0].id, shuffledPairs[i][1].id],
            [shuffledPairs[i + 1][0].id, shuffledPairs[i + 1][1].id]
          ],
          players: [
            shuffledPairs[i][0].id, shuffledPairs[i][1].id,
            shuffledPairs[i + 1][0].id, shuffledPairs[i + 1][1].id
          ],
          score: [0, 0],
          completed: false
        });
      }
    }
  }

  return { matches, sitOuts };
};

/**
 * Clear pairing history (useful when starting a new tournament)
 */
export const clearPairingHistory = () => {
  pairingHistory.clear();
};
