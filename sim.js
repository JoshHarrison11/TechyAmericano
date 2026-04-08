const generateRound = (players, rotationIndex, lastSitOutIds, sitOutPairHistory, playerSitOutCounts) => {
    const sitOutCount = 2;
    const sitOuts = [];
    const lastSitOutSet = new Set(lastSitOutIds);

    const getCombinations = (arr, k) => {
      if (k === 0) return [[]];
      if (arr.length === 0) return [];
      const [first, ...rest] = arr;
      const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
      const withoutFirst = getCombinations(rest, k);
      return [...withFirst, ...withoutFirst];
    };

    const allCombinations = getCombinations(players, sitOutCount);

    const scoreCombination = (combo) => {
      let score = 0;

      for (const p of combo) {
        if (lastSitOutSet.has(p.id)) score += 100000;
        
        const totalSitOutsForPlayer = playerSitOutCounts[p.id] || 0;
        score += totalSitOutsForPlayer * 1000;

        const idx = players.indexOf(p);
        const rotationScore = ((idx - rotationIndex) % players.length + players.length) % players.length;
        score += rotationScore;
      }

      for (let i = 0; i < combo.length; i++) {
        for (let j = i + 1; j < combo.length; j++) {
          const pairKey = [combo[i].id, combo[j].id].sort().join(',');
          const pairCount = sitOutPairHistory[pairKey] || 0;
          score += pairCount * 100;
        }
      }

      return score;
    };

    let bestCombo = null;
    let bestScore = Infinity;

    for (const combo of allCombinations) {
      const score = scoreCombination(combo);
      if (score < bestScore) {
        bestScore = score;
        bestCombo = combo;
      }
    }
    
    sitOuts.push(...bestCombo);
    return sitOuts;
};

const runSim = () => {
    const players = [
        {id: 'p1', name: 'A'}, {id: 'p2', name: 'B'}, {id: 'p3', name: 'C'},
        {id: 'p4', name: 'D'}, {id: 'p5', name: 'E'}, {id: 'p6', name: 'F'}
    ];
    let rotationIndex = 0;
    let lastSitOutIds = [];
    let sitOutPairHistory = {};
    let playerSitOutCounts = {};

    for(let r=1; r<=9; r++) {
        const sitting = generateRound(players, rotationIndex, lastSitOutIds, sitOutPairHistory, playerSitOutCounts);
        const sittingIds = sitting.map(p => p.id);
        
        console.log(`Round ${r}: Sitting out ${sitting.map(p => p.name).join(', ')}`);
        
        lastSitOutIds = sittingIds;
        for (let i = 0; i < sittingIds.length; i++) {
          for (let j = i + 1; j < sittingIds.length; j++) {
            const pairKey = [sittingIds[i], sittingIds[j]].sort().join(',');
            sitOutPairHistory[pairKey] = (sitOutPairHistory[pairKey] || 0) + 1;
          }
        }
        for (const id of sittingIds) {
          playerSitOutCounts[id] = (playerSitOutCounts[id] || 0) + 1;
        }
        rotationIndex = (rotationIndex + 2) % players.length;
    }
};

runSim();
