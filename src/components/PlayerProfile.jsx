import React from 'react';
import {
    getPlayerById,
    calculatePlayerStats,
    getPartnerStats,
    getBestPartnership,
    getAllPlayers,
    getMatchesByPlayer,
    deletePlayer
} from '../utils/playerService';

const PlayerProfile = ({ playerId, onClose, onDeleted }) => {
    const player = getPlayerById(playerId);
    const stats = calculatePlayerStats(playerId);
    const partners = getPartnerStats(playerId);
    const bestPartnership = getBestPartnership(playerId);
    const allPlayers = getAllPlayers();
    const matches = getMatchesByPlayer(playerId).slice(0, 15); // Get last 15 matches

    if (!player) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>Player not found</h2>
                    <button onClick={onClose} className="btn btn-primary">Close</button>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${player.name}? This will remove all their statistics.`)) {
            deletePlayer(playerId);
            onDeleted();
        }
    };

    const getPartnerName = (partnerId) => {
        const partner = allPlayers.find(p => p.id === partnerId);
        return partner ? partner.name : 'Unknown';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content player-profile-modal">
                <div className="modal-header">
                    <h2>Player Profile</h2>
                    <button onClick={onClose} className="btn-close" aria-label="Close">&times;</button>
                </div>

                <div className="player-profile-header">
                    {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="player-avatar-large" />
                    ) : (
                        <div className="player-avatar-large-placeholder">
                            {player.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h3 className="player-profile-name">{player.name}</h3>
                </div>

                {/* ELO Rating Section */}
                <div className="elo-rating-section">
                    <div className="elo-rating-main">
                        <div className="elo-badge-large" data-tier={stats.eloTier}>
                            <div className="elo-value-large">{Math.round(stats.elo)}</div>
                            <div className="elo-label-large">ELO Rating</div>
                            <div className="elo-tier-label">{stats.eloTier?.toUpperCase()}</div>
                        </div>
                        <div className="elo-rank-large">
                            <span className="rank-position-large">#{stats.eloRank}</span>
                            <span className="rank-total-large">of {stats.totalPlayers}</span>
                        </div>
                    </div>

                    <div className="elo-stats-row">
                        <div className="elo-stat-item">
                            <span className="elo-stat-label">Peak ELO</span>
                            <span className="elo-stat-value">{Math.round(stats.eloPeak)}</span>
                            {stats.eloPeakDate && (
                                <span className="elo-stat-date">{formatDate(stats.eloPeakDate)}</span>
                            )}
                        </div>
                        <div className="elo-stat-item">
                            <span className="elo-stat-label">Trend</span>
                            <span className={`elo-stat-value ${stats.eloTrend > 0 ? 'positive' : stats.eloTrend < 0 ? 'negative' : ''}`}>
                                {stats.eloTrend > 0 ? '🔥' : stats.eloTrend < 0 ? '📉' : '➡️'}
                                {stats.eloTrend > 0 ? '+' : ''}{stats.eloTrend}
                            </span>
                            <span className="elo-stat-date">Last 5 matches</span>
                        </div>
                    </div>

                    {stats.eloProvisional && (
                        <div className="elo-provisional-badge">
                            ⚠️ Provisional Rating ({stats.eloMatchesForRating}/20 matches)
                        </div>
                    )}
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-label">Tournaments</div>
                        <div className="stat-card-value">{stats.tournamentsPlayed}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Matches Played</div>
                        <div className="stat-card-value">{stats.matchesPlayed}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Win %</div>
                        <div className="stat-card-value">{stats.winPercentage.toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Record</div>
                        <div className="stat-card-value">
                            {stats.matchesWon}-{stats.matchesLost}
                        </div>
                    </div>
                </div>

                <div className="stats-section">
                    <h4>Performance Metrics</h4>
                    <div className="stats-list">
                        <div className="stat-row">
                            <span>Games Won</span>
                            <span className="stat-value-positive">{stats.gamesWon}</span>
                        </div>
                        <div className="stat-row">
                            <span>Games Lost</span>
                            <span className="stat-value-negative">{stats.gamesLost}</span>
                        </div>
                        <div className="stat-row">
                            <span>Points Differential</span>
                            <span className={stats.pointsDifferential >= 0 ? 'stat-value-positive' : 'stat-value-negative'}>
                                {stats.pointsDifferential >= 0 ? '+' : ''}{stats.pointsDifferential}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span>Avg Games/Match</span>
                            <span>{stats.avgGamesPerMatch.toFixed(1)}</span>
                        </div>
                        <div className="stat-row">
                            <span>Current Streak</span>
                            <span>{stats.currentStreak} {stats.currentStreak >= 3 && '🔥'}</span>
                        </div>
                        <div className="stat-row">
                            <span>Longest Streak</span>
                            <span>{stats.longestStreak}</span>
                        </div>
                    </div>
                </div>

                <div className="stats-section">
                    <h4>Career Timeline</h4>
                    <div className="stats-list">
                        <div className="stat-row">
                            <span>First Tournament</span>
                            <span>{formatDate(stats.firstTournamentDate)}</span>
                        </div>
                        <div className="stat-row">
                            <span>Last Tournament</span>
                            <span>{formatDate(stats.lastTournamentDate)}</span>
                        </div>
                    </div>
                </div>

                {partners.length > 0 && (
                    <div className="stats-section">
                        <h4>Most Frequent Partners</h4>
                        <div className="partner-list">
                            {partners.slice(0, 5).map(partner => (
                                <div key={partner.partnerId} className="partner-item">
                                    <div className="partner-info">
                                        <span className="partner-name">{getPartnerName(partner.partnerId)}</span>
                                        <span className="partner-matches">{partner.matchesPlayed} matches</span>
                                    </div>
                                    <div className="partner-stats">
                                        <span className="partner-record">{partner.wins}-{partner.matchesPlayed - partner.wins}</span>
                                        <span className="partner-winrate">{partner.winRate.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {bestPartnership && (
                    <div className="stats-section best-partnership">
                        <h4>🏆 Best Partnership</h4>
                        <div className="partnership-highlight">
                            <div className="partnership-name">{getPartnerName(bestPartnership.partnerId)}</div>
                            <div className="partnership-stats">
                                <span>{bestPartnership.matchesPlayed} matches</span>
                                <span className="partnership-record">{bestPartnership.wins}-{bestPartnership.matchesPlayed - bestPartnership.wins}</span>
                                <span className="partnership-winrate">{bestPartnership.winRate.toFixed(1)}% win rate</span>
                            </div>
                        </div>
                    </div>
                )}

                {matches.length > 0 && (
                    <div className="stats-section player-match-history">
                        <h4>📋 Recent Match History</h4>
                        <p className="section-subtitle">Last {matches.length} matches played</p>
                        <div className="match-history-list">
                            {matches.map(match => {
                                // Determine which team the player was on
                                const playerTeamIndex = match.teams[0].includes(playerId) ? 0 : 1;
                                const opponentTeamIndex = 1 - playerTeamIndex;

                                // Get team players
                                const playerTeam = match.teams[playerTeamIndex];
                                const opponentTeam = match.teams[opponentTeamIndex];

                                // Find partner and opponents
                                const partnerId = playerTeam.find(id => id !== playerId);
                                const opponent1Id = opponentTeam[0];
                                const opponent2Id = opponentTeam[1];

                                // Get scores
                                const playerScore = match.score[playerTeamIndex];
                                const opponentScore = match.score[opponentTeamIndex];
                                const won = playerScore > opponentScore;

                                return (
                                    <div key={match.id} className="match-item-enhanced">
                                        <div className="match-item-header">
                                            <div className="match-item-date">{formatDate(match.date)}</div>
                                            <span className={`match-win-indicator ${won ? 'win' : 'loss'}`}>
                                                {won ? '✓ Win' : '✗ Loss'}
                                            </span>
                                        </div>
                                        <div className="match-teams-display">
                                            <div className="match-team-row">
                                                <div className="match-team">
                                                    <span className="match-player match-player-highlight">
                                                        {player.name}
                                                    </span>
                                                    <span className="match-player-separator">&</span>
                                                    <span className="match-player match-player-teammate">
                                                        {getPartnerName(partnerId)}
                                                    </span>
                                                </div>
                                                <span className="match-vs-separator">vs</span>
                                                <div className="match-team">
                                                    <span className="match-player">
                                                        {getPartnerName(opponent1Id)}
                                                    </span>
                                                    <span className="match-player-separator">&</span>
                                                    <span className="match-player">
                                                        {getPartnerName(opponent2Id)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="match-score-display">
                                                {playerScore} - {opponentScore}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={handleDelete} className="btn btn-danger">Delete Player</button>
                    <button onClick={onClose} className="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
