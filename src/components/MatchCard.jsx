import React, { useMemo } from 'react';
import { calculateMatchEloChanges } from '../utils/eloService';
import TierBadge from './TierBadge';

const MatchCard = ({ match, players, onUpdateScore, onFinishMatch, onSkipMatch, onPlayerClick, allPlayers }) => {
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

    const formatPlayerWithElo = (playerId) => {
        const playerElo = getPlayerElo(playerId);
        const eloChange = eloChanges?.changes[playerId];

        return (
            <div key={playerId} className="player-with-elo">
                <div className="player-name-row">
                    <TierBadge rating={playerElo} />
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
                        {getPlayerName(playerId)}
                    </span>
                </div>
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

    // Direct entry: tap the score to type the final number (e.g. 24) instead of
    // tapping + two dozen times. Selects on focus so a typed value replaces cleanly.
    const setScore = (teamIndex, raw) => {
        const n = parseInt(raw, 10);
        onUpdateScore(match.id, teamIndex, Number.isNaN(n) ? 0 : Math.max(0, n));
    };

    const leader = match.score[0] === match.score[1] ? -1 : (match.score[0] > match.score[1] ? 0 : 1);

    const renderSide = (teamIndex) => {
        const names = match.teams[teamIndex].map(getPlayerName).join(' & ');
        const isLeading = match.completed && leader === teamIndex;
        return (
            <div className={`team ${isLeading ? 'leading' : ''}`}>
                <div className="team-header">
                    <div className="team-elo-display">
                        {Math.round(teamIndex === 0 ? team1Elo : team2Elo)} <span>avg</span>
                    </div>
                </div>
                <div className="team-players">
                    {match.teams[teamIndex].map(playerId => formatPlayerWithElo(playerId))}
                </div>
                <div className="score-controls">
                    <button
                        onClick={() => decrementScore(teamIndex)}
                        disabled={match.completed || match.score[teamIndex] === 0}
                        className="score-btn"
                        aria-label={`Remove a point from ${names}`}
                    >
                        −
                    </button>
                    {match.completed ? (
                        <div className="score-display">{match.score[teamIndex]}</div>
                    ) : (
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            className="score-input"
                            value={match.score[teamIndex]}
                            onChange={(e) => setScore(teamIndex, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            aria-label={`${names} score`}
                        />
                    )}
                    <button
                        onClick={() => incrementScore(teamIndex)}
                        disabled={match.completed}
                        className="score-btn"
                        aria-label={`Add a point for ${names}`}
                    >
                        +
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={`match-card ${match.completed ? 'completed' : ''} ${match.skipped ? 'skipped' : ''}`}>
            <div className="teams">
                {renderSide(0)}
                <div className="vs"><span className="net-ring">Net</span></div>
                {renderSide(1)}
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
