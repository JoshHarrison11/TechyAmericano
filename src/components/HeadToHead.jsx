import React, { useState } from 'react';
import { getAllPlayers, getHeadToHeadStats } from '../utils/playerService';

const HeadToHead = ({ onClose }) => {
    const players = getAllPlayers();
    const [player1Id, setPlayer1Id] = useState('');
    const [player2Id, setPlayer2Id] = useState('');
    const [stats, setStats] = useState(null);

    const handleCompare = () => {
        if (player1Id && player2Id && player1Id !== player2Id) {
            const h2hStats = getHeadToHeadStats(player1Id, player2Id);
            setStats(h2hStats);
        }
    };

    const getPlayerName = (playerId) => {
        const player = players.find(p => p.id === playerId);
        return player ? player.name : 'Unknown';
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content head-to-head-modal">
                <div className="modal-header">
                    <h2>Head-to-Head Comparison</h2>
                    <button onClick={onClose} className="btn-close" aria-label="Close">&times;</button>
                </div>

                <div className="player-selectors">
                    <div className="player-select-group">
                        <label>Player 1</label>
                        <select
                            value={player1Id}
                            onChange={(e) => setPlayer1Id(e.target.value)}
                            className="select-field"
                        >
                            <option value="">Select Player</option>
                            {players.map(player => (
                                <option key={player.id} value={player.id}>
                                    {player.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="vs-divider">VS</div>

                    <div className="player-select-group">
                        <label>Player 2</label>
                        <select
                            value={player2Id}
                            onChange={(e) => setPlayer2Id(e.target.value)}
                            className="select-field"
                        >
                            <option value="">Select Player</option>
                            {players.map(player => (
                                <option
                                    key={player.id}
                                    value={player.id}
                                    disabled={player.id === player1Id}
                                >
                                    {player.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleCompare}
                    disabled={!player1Id || !player2Id || player1Id === player2Id}
                    className="btn btn-primary btn-lg"
                >
                    Compare
                </button>

                {stats && (
                    <div className="h2h-results">
                        {stats.versusMatches > 0 ? (
                            <>
                                <div className="h2h-summary">
                                    <h3>Rivalry Stats</h3>
                                    <div className="h2h-record">
                                        <div className="h2h-player">
                                            <div className="h2h-player-name">{getPlayerName(player1Id)}</div>
                                            <div className="h2h-wins">{stats.player1Wins}</div>
                                            <div className="h2h-games">{stats.player1GamesWon} games</div>
                                        </div>
                                        <div className="h2h-divider">-</div>
                                        <div className="h2h-player">
                                            <div className="h2h-player-name">{getPlayerName(player2Id)}</div>
                                            <div className="h2h-wins">{stats.player2Wins}</div>
                                            <div className="h2h-games">{stats.player2GamesWon} games</div>
                                        </div>
                                    </div>
                                    <div className="h2h-stat-row">
                                        <span>Total Matches</span>
                                        <span>{stats.versusMatches}</span>
                                    </div>
                                    <div className="h2h-stat-row">
                                        <span>Average Margin</span>
                                        <span>{stats.averageMargin.toFixed(1)} games</span>
                                    </div>
                                </div>

                                {stats.closestMatch && (
                                    <div className="rivalry-highlight">
                                        <h4>🔥 Closest Match</h4>
                                        <div className="match-score">
                                            {stats.closestMatch.score[0]} - {stats.closestMatch.score[1]}
                                        </div>
                                        <div className="match-date">{formatDate(stats.closestMatch.date)}</div>
                                    </div>
                                )}

                                {stats.biggestMatch && (
                                    <div className="rivalry-highlight">
                                        <h4>💥 Biggest Blowout</h4>
                                        <div className="match-score">
                                            {stats.biggestMatch.score[0]} - {stats.biggestMatch.score[1]}
                                        </div>
                                        <div className="match-date">{formatDate(stats.biggestMatch.date)}</div>
                                    </div>
                                )}

                                {stats.recentMatches.length > 0 && (
                                    <div className="recent-matches">
                                        <h4>When Playing Against Each Other</h4>
                                        <p className="section-subtitle">Recent matches where these players faced off as opponents</p>
                                        {stats.recentMatches.map(match => {
                                            const p1Team = match.teams[0].includes(player1Id) ? 0 : 1;
                                            const p2Team = 1 - p1Team;
                                            const p1Score = match.score[p1Team];
                                            const p2Score = match.score[p2Team];
                                            const p1Won = p1Score > p2Score;

                                            // Get all four players
                                            const p1TeamPlayers = match.teams[p1Team];
                                            const p2TeamPlayers = match.teams[p2Team];

                                            // Find teammates
                                            const p1Teammate = p1TeamPlayers.find(id => id !== player1Id);
                                            const p2Teammate = p2TeamPlayers.find(id => id !== player2Id);

                                            return (
                                                <div key={match.id} className="match-item-enhanced">
                                                    <div className="match-item-header">
                                                        <div className="match-item-date">{formatDate(match.date)}</div>
                                                        <span className={`match-win-indicator ${p1Won ? 'win' : 'loss'}`}>
                                                            {p1Won ? '✓ Win' : '✗ Loss'}
                                                        </span>
                                                    </div>
                                                    <div className="match-teams-display">
                                                        <div className="match-team-row">
                                                            <div className="match-team">
                                                                <span className="match-player match-player-highlight">
                                                                    {getPlayerName(player1Id)}
                                                                </span>
                                                                <span className="match-player-separator">&</span>
                                                                <span className="match-player match-player-teammate">
                                                                    {getPlayerName(p1Teammate)}
                                                                </span>
                                                            </div>
                                                            <span className="match-vs-separator">vs</span>
                                                            <div className="match-team">
                                                                <span className="match-player match-player-highlight">
                                                                    {getPlayerName(player2Id)}
                                                                </span>
                                                                <span className="match-player-separator">&</span>
                                                                <span className="match-player match-player-teammate">
                                                                    {getPlayerName(p2Teammate)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="match-score-display">
                                                            {p1Score} - {p2Score}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="empty-state">
                                These players have never faced each other
                            </div>
                        )}

                        {stats.partnershipStats.matchesPlayed > 0 && (
                            <div className="partnership-section">
                                <h3>🤝 When Playing Together as Partners</h3>
                                <p className="section-subtitle">Statistics when these players were on the same team</p>
                                <div className="partnership-summary">
                                    <div className="partnership-stat">
                                        <span>Matches Together</span>
                                        <span>{stats.partnershipStats.matchesPlayed}</span>
                                    </div>
                                    <div className="partnership-stat">
                                        <span>Record</span>
                                        <span>{stats.partnershipStats.wins}-{stats.partnershipStats.losses}</span>
                                    </div>
                                    <div className="partnership-stat">
                                        <span>Win Rate</span>
                                        <span>{stats.partnershipStats.winRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="partnership-stat">
                                        <span>Games</span>
                                        <span>{stats.partnershipStats.gamesWon}-{stats.partnershipStats.gamesLost}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
};

export default HeadToHead;
