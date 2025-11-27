import React from 'react';

const TournamentHistory = ({ tournaments, onLoadTournament, onDeleteTournament, onClearAll, onClose }) => {
    // Calculate Most In-Form Player based on recent tournaments (last 5)
    const calculateInFormPlayer = () => {
        if (tournaments.length === 0) return null;

        const recentTournaments = tournaments.slice(0, 5);
        const playerStats = {};

        recentTournaments.forEach(tournament => {
            tournament.players.forEach(player => {
                // Use name as key to aggregate across tournaments (case-insensitive)
                const playerKey = player.name.trim().toLowerCase();

                if (!playerStats[playerKey]) {
                    playerStats[playerKey] = {
                        name: player.name, // Keep original casing for display
                        totalMatchesWon: 0,
                        totalGamesWon: 0,
                        tournamentsPlayed: 0
                    };
                }

                const matches = tournament.history.filter(m => m.completed && (m.teams[0].includes(player.id) || m.teams[1].includes(player.id)));
                let matchesWon = 0;
                let gamesWon = 0;

                matches.forEach(m => {
                    const teamIdx = m.teams[0].includes(player.id) ? 0 : 1;
                    const myScore = m.score[teamIdx];
                    const opponentScore = m.score[1 - teamIdx];
                    gamesWon += myScore;
                    if (myScore > opponentScore) matchesWon++;
                });

                playerStats[playerKey].totalMatchesWon += matchesWon;
                playerStats[playerKey].totalGamesWon += gamesWon;
                playerStats[playerKey].tournamentsPlayed++;
            });
        });

        // Calculate average performance and sort
        const players = Object.values(playerStats).map(p => ({
            ...p,
            avgMatchesWon: p.totalMatchesWon / p.tournamentsPlayed,
            avgGamesWon: p.totalGamesWon / p.tournamentsPlayed
        }));

        players.sort((a, b) => {
            if (b.avgMatchesWon !== a.avgMatchesWon) return b.avgMatchesWon - a.avgMatchesWon;
            return b.avgGamesWon - a.avgGamesWon;
        });

        return players[0];
    };

    const inFormPlayer = calculateInFormPlayer();

    if (tournaments.length === 0) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>Tournament History</h2>
                    <p className="empty-state">No saved tournaments yet. Complete a tournament to save it!</p>
                    <button onClick={onClose} className="btn btn-primary">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content history-modal">
                <h2>Tournament History</h2>

                {inFormPlayer && (
                    <div className="in-form-player">
                        <div className="in-form-icon">🔥</div>
                        <div className="in-form-content">
                            <div className="in-form-label">Most In-Form Player</div>
                            <div className="in-form-name">{inFormPlayer.name}</div>
                            <div className="in-form-stats">
                                Avg: {inFormPlayer.avgMatchesWon.toFixed(1)} matches won • {inFormPlayer.avgGamesWon.toFixed(1)} games won
                                <span className="in-form-tournaments"> (Last {inFormPlayer.tournamentsPlayed} tournaments)</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="modal-actions" style={{ marginBottom: '1.5rem', marginTop: '0' }}>
                    <button onClick={onClearAll} className="btn btn-danger">Clear All History</button>
                    <button onClick={onClose} className="btn btn-secondary">Close</button>
                </div>

                <div className="tournament-list">
                    {tournaments.map((tournament) => (
                        <div key={tournament.id} className="tournament-item">
                            <div className="tournament-info">
                                <div className="tournament-date">
                                    {new Date(tournament.date).toLocaleDateString()} {new Date(tournament.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="tournament-players">
                                    {tournament.players.length} Players: {tournament.players.slice(0, 3).map(p => p.name).join(', ')}
                                    {tournament.players.length > 3 && '...'}
                                </div>
                                <div className="tournament-stats">
                                    {(() => {
                                        // Calculate round robins completed
                                        const n = tournament.players.length;
                                        const gamesPerRoundRobin = (n * (n - 1)) / 4;
                                        const completedMatches = tournament.history.filter(m => m.completed).length;
                                        const roundRobinsCompleted = completedMatches / gamesPerRoundRobin;

                                        return `${roundRobinsCompleted.toFixed(2)} Round Robins • ${completedMatches} Matches`;
                                    })()}
                                </div>
                            </div>
                            <div className="tournament-actions">
                                <button
                                    onClick={() => onLoadTournament(tournament.id)}
                                    className="btn btn-primary btn-sm"
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => onDeleteTournament(tournament.id)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TournamentHistory;
