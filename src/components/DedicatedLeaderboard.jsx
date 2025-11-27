import React, { useState, useMemo } from 'react';
import { getAllPlayers } from '../utils/playerService';
import { getEloTier, getEloColor, getTierDisplayName, calculateEloTrend } from '../utils/eloService';
import EloInfoModal from './EloInfoModal';

const DedicatedLeaderboard = ({ onPlayerClick }) => {
    const [sortBy, setSortBy] = useState('elo'); // 'elo', 'wins', 'winRate', 'gamesWon', 'streak'
    const [showEloInfo, setShowEloInfo] = useState(false);

    const players = useMemo(() => {
        const allPlayers = getAllPlayers();

        // Calculate stats for each player
        const playersWithStats = allPlayers.map(player => {
            const stats = player.stats || {};
            const elo = player.elo || { current: 1500, history: [] };

            const totalMatches = (stats.wins || 0) + (stats.losses || 0);
            const winRate = totalMatches > 0 ? ((stats.wins || 0) / totalMatches) * 100 : 0;
            const trend = calculateEloTrend(elo.history, 5);

            return {
                ...player,
                totalMatches,
                winRate,
                trend,
                gamesWon: stats.gamesWon || 0,
                gamesLost: stats.gamesLost || 0,
                currentStreak: stats.currentStreak || 0,
                wins: stats.wins || 0,
                losses: stats.losses || 0
            };
        });

        // Sort based on selected criteria
        playersWithStats.sort((a, b) => {
            switch (sortBy) {
                case 'wins':
                    return b.wins - a.wins;
                case 'winRate':
                    return b.winRate - a.winRate;
                case 'gamesWon':
                    return b.gamesWon - a.gamesWon;
                case 'streak':
                    return Math.abs(b.currentStreak) - Math.abs(a.currentStreak);
                case 'elo':
                default:
                    return (b.elo?.current || 1500) - (a.elo?.current || 1500);
            }
        });

        return playersWithStats;
    }, [sortBy]);

    const getTrendIcon = (trend) => {
        if (trend > 5) return '🔥';  // Trending up
        if (trend < -5) return '💩';  // Trending down
        return '😐';  // Stable
    };

    const getTrendColor = (trend) => {
        if (trend > 0) return '#4caf50';
        if (trend < 0) return '#f44336';
        return '#999';
    };

    const getPodiumClass = (index) => {
        if (sortBy === 'elo') {
            if (index === 0) return 'rank-1';
            if (index === 1) return 'rank-2';
            if (index === 2) return 'rank-3';
        }
        return '';
    };

    const getStreakDisplay = (streak) => {
        // Only show win streaks of 3 or more
        if (streak >= 3) {
            return <span className="streak-positive">🔥{streak}</span>;
        }
        return null;
    };

    return (
        <div className="dedicated-leaderboard">
            <div className="leaderboard-header">
                <div className="header-title">
                    <h2>🏆 Leaderboard</h2>
                    <button
                        className="info-icon-button"
                        onClick={() => setShowEloInfo(true)}
                        title="What is ELO?"
                    >
                        ℹ️
                    </button>
                </div>
                <p className="player-count">{players.length} Active Players</p>
            </div>

            <div className="sort-controls">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="elo">ELO Rating</option>
                    <option value="wins">Total Wins</option>
                    <option value="winRate">Win Percentage</option>
                    <option value="gamesWon">Games Won</option>
                    <option value="streak">Win Streak</option>
                </select>
            </div>

            {/* Mobile Card Layout */}
            <div className="leaderboard-cards">
                {players.map((player, index) => {
                    const tier = getEloTier(player.elo?.current || 1500);
                    const tierColor = getEloColor(player.elo?.current || 1500);
                    const tierName = getTierDisplayName(tier);

                    return (
                        <div
                            key={player.id}
                            className={`leaderboard-card ${getPodiumClass(index)}`}
                            onClick={() => onPlayerClick && onPlayerClick(player.id)}
                        >
                            <div className="card-header">
                                <div className="card-rank">
                                    #{index + 1}
                                    {index === 0 && sortBy === 'elo' && <span className="medal">🥇</span>}
                                    {index === 1 && sortBy === 'elo' && <span className="medal">🥈</span>}
                                    {index === 2 && sortBy === 'elo' && <span className="medal">🥉</span>}
                                </div>
                                <div className="card-player-info">
                                    <span className="player-avatar">{player.name.charAt(0).toUpperCase()}</span>
                                    <span className="player-name-text">{player.name}</span>
                                </div>
                            </div>

                            <div className="card-elo-section">
                                <div className="card-elo-value">{player.elo?.current || 1500}</div>
                                <span
                                    className="tier-badge-small"
                                    style={{
                                        backgroundColor: tierColor,
                                        color: tier === 'gold' || tier === 'silver' ? '#000' : '#fff'
                                    }}
                                >
                                    {tierName}
                                </span>
                            </div>

                            <div className="card-stats-row">
                                <div className="stat-item">
                                    <span className="stat-label">Record</span>
                                    <span className="stat-value">
                                        <span className="wins">{player.wins}</span>
                                        <span className="separator">/</span>
                                        <span className="losses">{player.losses}</span>
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Win %</span>
                                    <span className="stat-value">{player.winRate.toFixed(0)}%</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Form</span>
                                    <span className="stat-value" style={{ color: getTrendColor(player.trend) }}>
                                        {getTrendIcon(player.trend)}
                                        {player.trend !== 0 && (
                                            <span className="trend-value-small">
                                                {player.trend > 0 ? '+' : ''}{player.trend}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {player.currentStreak >= 3 && (
                                <div className="card-streak">
                                    {getStreakDisplay(player.currentStreak)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table Layout */}
            <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th className="col-rank">#</th>
                            <th className="col-name">Player</th>
                            <th className="col-elo">ELO</th>
                            <th className="col-record">W/L</th>
                            <th className="col-winrate">Win %</th>
                            <th className="col-trend">ELO Trend</th>
                            <th className="col-games mobile-hide">Games</th>
                            <th className="col-streak mobile-hide">Streak</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player, index) => {
                            const tier = getEloTier(player.elo?.current || 1500);
                            const tierColor = getEloColor(player.elo?.current || 1500);
                            const tierName = getTierDisplayName(tier);

                            return (
                                <tr
                                    key={player.id}
                                    className={`leaderboard-row ${getPodiumClass(index)}`}
                                    onClick={() => onPlayerClick && onPlayerClick(player.id)}
                                >
                                    <td className="col-rank">
                                        {index + 1}
                                        {index === 0 && sortBy === 'elo' && <span className="medal">🥇</span>}
                                        {index === 1 && sortBy === 'elo' && <span className="medal">🥈</span>}
                                        {index === 2 && sortBy === 'elo' && <span className="medal">🥉</span>}
                                    </td>
                                    <td className="col-name">
                                        <div className="player-name-cell">
                                            <span className="player-avatar">{player.name.charAt(0).toUpperCase()}</span>
                                            <span className="player-name-text">{player.name}</span>
                                        </div>
                                    </td>
                                    <td className="col-elo">
                                        <div className="elo-cell">
                                            <span className="elo-value">{player.elo?.current || 1500}</span>
                                            <span
                                                className="tier-badge-small"
                                                style={{
                                                    backgroundColor: tierColor,
                                                    color: tier === 'gold' || tier === 'silver' ? '#000' : '#fff'
                                                }}
                                            >
                                                {tierName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="col-record">
                                        <span className="wins">{player.wins}</span>
                                        <span className="separator">/</span>
                                        <span className="losses">{player.losses}</span>
                                    </td>
                                    <td className="col-winrate">
                                        {player.winRate.toFixed(0)}%
                                    </td>
                                    <td className="col-trend">
                                        <span
                                            className="trend-indicator"
                                            style={{ color: getTrendColor(player.trend) }}
                                        >
                                            {getTrendIcon(player.trend)}
                                            {player.trend !== 0 && (
                                                <span className="trend-value">
                                                    {player.trend > 0 ? '+' : ''}{player.trend}
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="col-games mobile-hide">
                                        {player.gamesWon}/{player.gamesLost}
                                    </td>
                                    <td className="col-streak mobile-hide">
                                        {player.currentStreak >= 3 && (
                                            <span className="streak-positive">🔥{player.currentStreak}</span>
                                        )}
                                        {player.currentStreak < 3 && '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {players.length === 0 && (
                <div className="empty-state">
                    <p>No players yet. Add some players to see the leaderboard!</p>
                </div>
            )}

            {showEloInfo && <EloInfoModal onClose={() => setShowEloInfo(false)} />}
        </div>
    );
};

export default DedicatedLeaderboard;
