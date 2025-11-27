# 5-Player Tournament Pairing Improvement

## Overview
This document describes the improvements made to the team selection algorithm for 5-player tournaments to avoid repeating the same team pairings consecutively.

## Problem Statement
In 5-player tournaments, the same team pairings were being repeated in consecutive matches, making tournaments repetitive and less interesting. For example:
- Match 1: Josh & Luke vs Cam & Deeps (Player 5 sitting out)
- Match 2: Josh & Luke vs Cam & Deeps (Player 5 sitting out) ← Same pairing!

## Solution

### Key Concepts

#### Team Pairing Combinations
With 4 players (A, B, C, D), there are exactly 3 possible team combinations:
1. **Pairing 0**: A+B vs C+D
2. **Pairing 1**: A+C vs B+D
3. **Pairing 2**: A+D vs B+C

### Implementation Details

#### 1. Pairing History Tracking
- A `Map` data structure tracks the last pairing used for each unique set of 4 players
- **Key**: Sorted player IDs (e.g., "id1,id2,id3,id4")
- **Value**: Pairing index (0, 1, or 2)

#### 2. Player Set Identification
```javascript
const getPlayerSetKey = (playerIds) => {
  return [...playerIds].sort().join(',');
};
```
This ensures that the same 4 players are always identified by the same key, regardless of order.

#### 3. Pairing Selection Algorithm
The `selectPairing` function follows this logic:

1. **Generate all possible pairings** for the 4 players
2. **Check pairing history**: If these 4 players have played together before, exclude the last pairing used
3. **Apply partnership heuristic**: Among available pairings, prefer those with fewer past partnerships
4. **Random selection**: Randomly select from the best available pairings
5. **Update history**: Store the selected pairing for future reference

#### 4. Integration with Tournament Flow
- **5-player tournaments** (4 active, 1 sitting): Use the improved pairing logic
- **Other player counts**: Continue using the original greedy pairing algorithm
- **New tournament**: Clear pairing history to start fresh

### Code Changes

#### File: `src/utils/americanoLogic.js`
**Added:**
- `pairingHistory` Map for tracking
- `getPlayerSetKey()` function
- `getAllPairings()` function
- `selectPairing()` function
- `clearPairingHistory()` export function

**Modified:**
- `generateRound()` now checks if there are exactly 4 active players and uses the new pairing logic

#### File: `src/App.jsx`
**Added:**
- Import `clearPairingHistory` from americanoLogic
- Call `clearPairingHistory()` in `startTournament()`
- Call `clearPairingHistory()` in `resetSession()`

## Benefits

### 1. Variety in Team Compositions
- The same 4 players will never have the same team pairing twice in a row
- Over a full tournament, all 3 pairings will be used evenly

### 2. Maintains Americano Format
- Round robin structure preserved
- Everyone still plays with and against everyone
- No valid combinations are eliminated permanently

### 3. Smart Pairing Selection
- Still considers partnership history to minimize repeated partnerships
- Balances variety with fairness

### 4. Persistence Throughout Tournament
- Tracks pairings across the entire tournament, not just consecutive matches
- Even if the same 4 players don't play immediately back-to-back, the algorithm remembers

## Example Scenario

### Before Improvement
```
Round 1: Josh & Luke vs Cam & Deeps (Devin sits)
Round 2: Josh & Luke vs Cam & Deeps (Luke sits)  ← Repetitive!
Round 3: Josh & Luke vs Cam & Deeps (Josh sits)  ← Repetitive!
```

### After Improvement
```
Round 1: Josh & Luke vs Cam & Deeps (Devin sits)
         → Pairing 0 stored for [Josh, Luke, Cam, Deeps]

Round 2: Josh & Cam vs Luke & Deeps (Luke sits)
         → Different 4 players, new pairing selected

Round 3: Josh & Deeps vs Luke & Cam (Josh sits)
         → Pairing 0 excluded, Pairing 1 or 2 selected
```

## Testing Recommendations

To verify the implementation:

1. **Start a 5-player tournament**
2. **Play multiple rounds** where the same 4 players compete
3. **Verify** that consecutive matches with the same 4 players have different team pairings
4. **Check** that all 3 pairings are eventually used for any given set of 4 players

## Technical Notes

### Memory Management
- The `pairingHistory` Map is cleared when:
  - A new tournament starts
  - The session is reset
- This prevents memory leaks and ensures each tournament is independent

### Compatibility
- The improvement is **specific to 5-player tournaments** (4 active, 1 sitting)
- Other player counts continue to use the original algorithm
- No breaking changes to existing functionality

## Future Enhancements

Potential improvements for consideration:
1. Extend pairing tracking to other player counts (e.g., 9 players = 2 courts)
2. Add UI indicator showing which pairing is being used
3. Provide tournament statistics on pairing distribution
4. Allow manual override of pairing selection if needed
