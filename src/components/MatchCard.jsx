import React, { useMemo } from 'react';
import { calculateMatchEloChanges } from '../utils/eloService';

const MatchCard = ({ match, players, onUpdateScore, onFinishMatch, onSkipMatch, history, onPlayerClick, allPlayers }) => {
    const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

    // Get player ELO at match start
    const getPlayerElo = (playerId) => {
        const player = allPlayers?.find(p => p.id === playerId);
        return player?.elo?.current || 1500;
    };

    // Calculate team ELOs
    const team1Elo = useMemo(() => {
        const elo1 = getPlayerElo(match.teams[0][0]);
        const elo2 = getPlayerElo(match.teams[0][1]);
        return (elo1 + elo2) / 2;
    }, [match.teams, allPlayers]);

    const team2Elo = useMemo(() => {
        const elo1 = getPlayerElo(match.teams[1][0]);
        const elo2 = getPlayerElo(match.teams[1][1]);
        return (elo1 + elo2) / 2;
    }, [match.teams, allPlayers]);

    // Preview ELO changes based on current score
    const eloChanges = useMemo(() => {
        if (!allPlayers || (match.score[0] === 0 && match.score[1] === 0)) {
            return null;
        }

        // Build player ratings and match counts
        const playerRatings = {};
        const playerMatches = {};

        match.players.forEach(playerId => {
            const player = allPlayers.find(p => p.id === playerId);
            playerRatings[playerId] = player?.elo?.current || 1500;
            playerMatches[playerId] = player?.elo?.matchesForRating || 0;
        });

        // Create a match object for calculation
        const matchForCalc = {
            teams: match.teams,
            score: match.score,
            players: match.players
        };

        return calculateMatchEloChanges(matchForCalc, playerRatings, playerMatches);
    }, [match.score, match.teams, match.players, allPlayers]);

    // Calculate player stats for badges
    const getPlayerBadges = (playerId) => {
        const player = players.find(p => p.id === playerId);
        if (!player || !history) return { prefix: '', suffix: '' };

        // Calculate rank
        const playerStats = players.map(p => {
            const playerMatches = history.filter(m => m.completed && m.players.includes(p.id));
            let matchesWon = 0;
            let gamesWon = 0;

            playerMatches.forEach(m => {
                const teamIdx = m.teams[0].includes(p.id) ? 0 : 1;
                const myScore = m.score[teamIdx];
                const opponentScore = m.score[1 - teamIdx];
                gamesWon += myScore;
                if (myScore > opponentScore) matchesWon++;
            });

            return { id: p.id, matchesWon, gamesWon };
        });

        playerStats.sort((a, b) => {
            if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
            return b.gamesWon - a.gamesWon;
        });

        const rank = playerStats.findIndex(p => p.id === playerId);
        const isFirst = rank === 0 && playerStats[0].matchesWon > 0;

        // Calculate win streak
        const playerMatches = history.filter(m => m.completed && m.players.includes(playerId));
        const sortedMatches = [...playerMatches].sort((a, b) => a.id - b.id);
        let currentStreak = 0;

        sortedMatches.forEach(m => {
            const teamIdx = m.teams[0].includes(playerId) ? 0 : 1;
            const myScore = m.score[teamIdx];
            const opponentScore = m.score[1 - teamIdx];

            if (myScore > opponentScore) {
                currentStreak++;
            } else {
                currentStreak = 0;
            }
        });

        return {
            prefix: isFirst ? '👑 ' : '',
            suffix: currentStreak >= 3 ? ' 🔥' : ''
        };
    };

    const formatPlayerWithElo = (playerId) => {
        const badges = getPlayerBadges(playerId);
        const playerElo = getPlayerElo(playerId);
        const eloChange = eloChanges?.changes[playerId];

        return (
            <div key={playerId} className="player-with-elo">
                <span
                    className="player-name"
                    onClick={(e) => {
                        if (onPlayerClick) {
                            e.stopPropagation();
                            onPlayerClick(playerId);
                        }
                    }}
                    style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                >
                    {badges.prefix}{getPlayerName(playerId)}{badges.suffix}
                </span>
                <div className="player-elo-info">
                    <span className="player-elo-badge">
                        {Math.round(playerElo)}
                    </span>
                    {eloChange !== undefined && eloChange !== 0 && (
                        <span className={`elo-change ${eloChange > 0 ? 'positive' : 'negative'}`}>
                            {eloChange > 0 ? '+' : ''}{eloChange}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const incrementScore = (teamIndex) => {
        onUpdateScore(match.id, teamIndex, match.score[teamIndex] + 1);
    };

    const decrementScore = (teamIndex) => {
        if (match.score[teamIndex] > 0) {
            onUpdateScore(match.id, teamIndex, match.score[teamIndex] - 1);
        }
    };

    return (
        <div className={`match-card ${match.completed ? 'completed' : ''} ${match.skipped ? 'skipped' : ''}`}>
            <div className="teams">
                <div className="team">
                    <div className="team-header">
                        <div className="team-elo-display">
                            ⚡ {Math.round(team1Elo)}
                        </div>
                    </div>
                    <div className="team-players">
                        {match.teams[0].map(playerId => formatPlayerWithElo(playerId))}
                    </div>
                    <div className="score-controls">
                        <button
                            onClick={() => decrementScore(0)}
                            disabled={match.completed || match.score[0] === 0}
                            className="score-btn"
                        >
                            −
                        </button>
                        <div className="score-display">{match.score[0]}</div>
                        <button
                            onClick={() => incrementScore(0)}
                            disabled={match.completed}
                            className="score-btn"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="vs">VS</div>
                <div className="team">
                    <div className="team-header">
                        <div className="team-elo-display">
                            ⚡ {Math.round(team2Elo)}
                        </div>
                    </div>
                    <div className="team-players">
                        {match.teams[1].map(playerId => formatPlayerWithElo(playerId, 1))}
                    </div>
                    <div className="score-controls">
                        <button
                            onClick={() => decrementScore(1)}
                            disabled={match.completed || match.score[1] === 0}
                            className="score-btn"
                        >
                            −
                        </button>
                        <div className="score-display">{match.score[1]}</div>
                        <button
                            onClick={() => incrementScore(1)}
                            disabled={match.completed}
                            className="score-btn"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {match.skipped ? (
                <div className="match-skipped-overlay">
                    <span className="skipped-label">SKIPPED</span>
                    {onSkipMatch && (
                        <button onClick={() => onSkipMatch(match.id)} className="btn btn-primary btn-sm">
                            Play Match
                        </button>
                    )}
                </div>
            ) : (
                <div className="match-actions">
                    {!match.completed ? (
                        <>
                            <button onClick={() => onFinishMatch(match.id)} className="btn btn-primary btn-sm">
                                Finish
                            </button>
                            {onSkipMatch && (
                                <button onClick={() => onSkipMatch(match.id)} className="btn btn-secondary btn-sm btn-skip">
                                    Skip
                                </button>
                            )}
                        </>
                    ) : (
                        <button onClick={() => onFinishMatch(match.id)} className="btn btn-secondary btn-sm">
                            Edit
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MatchCard;
