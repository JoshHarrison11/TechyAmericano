import React from 'react';

const Leaderboard = ({ players, history, onPlayerClick, allPlayers }) => {
  // Calculate stats
  const stats = players.map(player => {
    const playerMatches = history.filter(m => m.completed && m.players.includes(player.id));
    const matchesPlayed = playerMatches.length;

    let gamesWon = 0;
    let gamesLost = 0;
    let matchesWon = 0;
    let matchesLost = 0;

    // Calculate win streak (consecutive wins)
    let currentStreak = 0;
    let maxStreak = 0;

    // Sort matches by ID (chronological order since IDs are timestamps)
    const sortedMatches = [...playerMatches].sort((a, b) => a.id - b.id);

    sortedMatches.forEach(m => {
      const teamIndex = m.teams[0].includes(player.id) ? 0 : 1;
      const myScore = m.score[teamIndex];
      const opponentScore = m.score[1 - teamIndex];

      gamesWon += myScore;
      gamesLost += opponentScore;

      if (myScore > opponentScore) {
        matchesWon++;
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (myScore < opponentScore) {
        matchesLost++;
        currentStreak = 0;
      }
    });

    // Calculate ELO change
    let eloChange = 0;
    if (player.startingElo) {
      if (player.finalElo) {
        // Tournament ended
        eloChange = Math.round(player.finalElo - player.startingElo);
      } else if (allPlayers) {
        // Tournament active
        const currentPlayer = allPlayers.find(p => p.id === player.id);
        const currentElo = currentPlayer?.elo?.current || 1500;
        eloChange = Math.round(currentElo - player.startingElo);
      }
    }

    return {
      ...player,
      matchesPlayed,
      matchesWon,
      matchesLost,
      gamesWon,
      gamesLost,
      gameDiff: gamesWon - gamesLost,
      currentStreak,
      maxStreak,
      eloChange
    };
  });

  // Sort by Matches Won (primary), then Games Won (secondary)
  stats.sort((a, b) => {
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    return b.gameDiff - a.gameDiff;
  });

  return (
    <div className="card leaderboard">
      <h2>Standings</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Matches</th>
            <th>W-L</th>
            <th className="col-games">Games</th>
            <th>+/-</th>
            <th>ELO Δ</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((player, index) => (
            <tr key={player.id}>
              <td className="rank-cell">{index + 1}</td>
              <td className="player-name">
                <span
                  onClick={() => onPlayerClick && onPlayerClick(player.id)}
                  style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                >
                  {player.name}
                </span>
                {index === 0 && <span className="crown-badge"> 👑</span>}
                {player.currentStreak >= 3 && (
                  <span className="streak-badge">
                    🔥 {player.currentStreak}
                  </span>
                )}
              </td>
              <td>{player.matchesPlayed}</td>
              <td className="win-loss">{player.matchesWon}-{player.matchesLost}</td>
              <td className="col-games">{player.gamesWon}</td>
              <td className={player.gameDiff >= 0 ? 'positive' : 'negative'}>
                {player.gameDiff >= 0 ? '+' : ''}{player.gameDiff}
              </td>
              <td className={`elo-change-cell ${player.eloChange > 0 ? 'positive' : player.eloChange < 0 ? 'negative' : 'neutral'}`}>
                {player.eloChange > 0 ? '+' : ''}{player.eloChange}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
