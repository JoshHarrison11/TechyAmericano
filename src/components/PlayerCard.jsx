import React from 'react';

const PlayerCard = ({ player, stats, onClick, rank }) => {
    const getStreakIndicator = () => {
        if (!stats) return null;

        if (stats.currentStreak >= 5) {
            return <span className="streak-hot">🔥🔥</span>;
        } else if (stats.currentStreak >= 3) {
            return <span className="streak-hot">🔥</span>;
        } else if (stats.matchesPlayed >= 3 && stats.currentStreak === 0 && stats.matchesLost >= 3) {
            return <span className="streak-cold">❄️</span>;
        }
        return null;
    };

    const getRankMedal = () => {
        if (!rank) return null;
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return null;
    };

    const winPercentage = stats && stats.matchesPlayed > 0
        ? ((stats.matchesWon / stats.matchesPlayed) * 100).toFixed(1)
        : '0.0';

    const eloRating = stats?.elo || 1500;
    const eloTier = stats?.eloTier || 'bronze';
    const medal = getRankMedal();

    return (
        <div className="player-card" onClick={onClick}>
            <div className="player-card-header">
                {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="player-avatar" />
                ) : (
                    <div className="player-avatar-placeholder">
                        {player.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="player-card-name">
                    {player.name}
                    {getStreakIndicator()}
                </div>
            </div>

            <div className="player-card-elo">
                <div className="elo-rating-badge" data-tier={eloTier}>
                    <span className="elo-value">{Math.round(eloRating)}</span>
                    <span className="elo-label">ELO</span>
                </div>
                {rank && (
                    <div className="rank-display">
                        {medal && <span className="rank-medal">{medal}</span>}
                        <span className="rank-position">#{rank}</span>
                    </div>
                )}
            </div>

            {stats && stats.matchesPlayed > 0 ? (
                <div className="player-card-stats">
                    <div className="stat-item">
                        <span className="stat-label">Matches</span>
                        <span className="stat-value">{stats.matchesPlayed}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Win %</span>
                        <span className="stat-value">{winPercentage}%</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Streak</span>
                        <span className="stat-value">{stats.currentStreak}</span>
                    </div>
                </div>
            ) : (
                <div className="player-card-stats">
                    <div className="stat-item-empty">No matches yet</div>
                </div>
            )}
        </div>
    );
};

export default PlayerCard;
