import React, { useState, useEffect } from 'react';
import {
    getAllPlayers,
    createPlayer,
    addMatchToHistory,
    updatePlayerStats
} from '../utils/playerService';

const STORAGE_KEY = 'activeCompetitiveMatch';

const DEFAULT_CONFIG = {
    setsToWin: 3,      // first to this many sets wins the match
    gamesPerSet: 6,    // games needed to win a set
    winByTwo: true,    // deuce + tie-break at gamesPerSet-all
    tiebreakTo: 7      // tie-break is first to this, win by 2
};

const CompetitiveMode = ({ onMatchComplete }) => {
    const [allPlayers, setAllPlayers] = useState(() => getAllPlayers());

    const [phase, setPhase] = useState('setup');       // 'setup' | 'playing' | 'done'
    const [poolIds, setPoolIds] = useState([]);          // players added to this match
    const [assignment, setAssignment] = useState({});    // playerId -> 'A' | 'B'
    const [config, setConfig] = useState(DEFAULT_CONFIG);

    const [sets, setSets] = useState([]);                // completed sets: [{ a, b }]
    const [games, setGames] = useState({ a: 0, b: 0 });  // current-set games
    const [tb, setTb] = useState(null);                  // tie-break points { a, b } or null
    const [result, setResult] = useState(null);

    const [showDropdown, setShowDropdown] = useState(false);
    const [quickName, setQuickName] = useState('');

    // ── Restore an in-progress match on mount ──────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (s.phase === 'playing') {
                    setPhase('playing');
                    setPoolIds(s.poolIds || []);
                    setAssignment(s.assignment || {});
                    setConfig(s.config || DEFAULT_CONFIG);
                    setSets(s.sets || []);
                    setGames(s.games || { a: 0, b: 0 });
                    setTb(s.tb || null);
                }
            } catch { /* ignore corrupt state */ }
        }
    }, []);

    // ── Persist an in-progress match so a refresh doesn't lose it ───────
    useEffect(() => {
        if (phase === 'playing') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, poolIds, assignment, config, sets, games, tb }));
        } else if (phase === 'done') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [phase, poolIds, assignment, config, sets, games, tb]);

    const nameOf = (id) => allPlayers.find(p => p.id === id)?.name || 'Unknown';
    const eloOf = (id) => Math.round(allPlayers.find(p => p.id === id)?.elo?.current || 1500);

    const teamA = poolIds.filter(id => assignment[id] === 'A');
    const teamB = poolIds.filter(id => assignment[id] === 'B');
    const canStart = teamA.length === 2 && teamB.length === 2;

    // ── Setup actions ──────────────────────────────────────────────────
    const addToPool = (id) => {
        if (!poolIds.includes(id)) setPoolIds([...poolIds, id]);
        setShowDropdown(false);
    };

    const removeFromPool = (id) => {
        setPoolIds(poolIds.filter(p => p !== id));
        const next = { ...assignment };
        delete next[id];
        setAssignment(next);
    };

    const assignTeam = (id, team) => {
        const currentCount = poolIds.filter(p => assignment[p] === team && p !== id).length;
        setAssignment(prev => {
            if (prev[id] === team) {
                const next = { ...prev };
                delete next[id];
                return next; // toggle off
            }
            if (currentCount >= 2) return prev; // team full
            return { ...prev, [id]: team };
        });
    };

    const quickAdd = (e) => {
        e.preventDefault();
        const name = quickName.trim();
        if (!name) return;
        const player = createPlayer(name); // persistent so ELO can be tracked
        const refreshed = getAllPlayers();
        setAllPlayers(refreshed);
        setPoolIds([...poolIds, player.id]);
        setQuickName('');
    };

    const adjustConfig = (key, delta, min, max) => {
        setConfig(prev => ({ ...prev, [key]: Math.max(min, Math.min(max, prev[key] + delta)) }));
    };

    const startMatch = () => {
        if (!canStart) return;
        setSets([]);
        setGames({ a: 0, b: 0 });
        setTb(null);
        setResult(null);
        setPhase('playing');
    };

    // ── Scoring ────────────────────────────────────────────────────────
    const setsWon = (list) => ({
        a: list.filter(s => s.a > s.b).length,
        b: list.filter(s => s.b > s.a).length
    });

    const finishMatch = (finalSets, winner) => {
        const won = setsWon(finalSets);
        const match = {
            id: `comp_${Date.now()}`,
            teams: [teamA, teamB],
            players: [...teamA, ...teamB],
            score: [won.a, won.b],
            completed: true,
            mode: 'competitive',
            sets: finalSets
        };
        // Record + apply ELO and stats exactly like an Americano match
        const record = addMatchToHistory(match, match.id);
        match.players.forEach(updatePlayerStats);
        setAllPlayers(getAllPlayers());
        if (onMatchComplete) onMatchComplete();
        setResult({ winner, eloData: record.eloData, match, finalSets });
        setPhase('done');
    };

    const completeSet = (winnerGames, loserGames, winnerTeam) => {
        const newSet = winnerTeam === 'a'
            ? { a: winnerGames, b: loserGames }
            : { a: loserGames, b: winnerGames };
        const newSets = [...sets, newSet];
        setSets(newSets);
        setGames({ a: 0, b: 0 });
        setTb(null);

        const won = setsWon(newSets);
        if (won.a >= config.setsToWin) finishMatch(newSets, 'A');
        else if (won.b >= config.setsToWin) finishMatch(newSets, 'B');
    };

    const addPoint = (team) => {
        const other = team === 'a' ? 'b' : 'a';

        // Tie-break in progress
        if (tb) {
            const next = { ...tb, [team]: tb[team] + 1 };
            if (next[team] >= config.tiebreakTo && next[team] - next[other] >= 2) {
                // tie-break (and the set) won
                completeSet(config.gamesPerSet + 1, config.gamesPerSet, team);
            } else {
                setTb(next);
            }
            return;
        }

        const next = { ...games, [team]: games[team] + 1 };

        if (config.winByTwo) {
            if (next.a === config.gamesPerSet && next.b === config.gamesPerSet) {
                // deuce at gamesPerSet-all -> tie-break
                setGames(next);
                setTb({ a: 0, b: 0 });
                return;
            }
            if (next[team] >= config.gamesPerSet && next[team] - next[other] >= 2) {
                completeSet(next[team], next[other], team);
                return;
            }
        } else if (next[team] >= config.gamesPerSet) {
            completeSet(next[team], next[other], team);
            return;
        }

        setGames(next);
    };

    const removePoint = (team) => {
        if (tb) {
            setTb({ ...tb, [team]: Math.max(0, tb[team] - 1) });
        } else {
            setGames({ ...games, [team]: Math.max(0, games[team] - 1) });
        }
    };

    const resetToSetup = () => {
        localStorage.removeItem(STORAGE_KEY);
        setPhase('setup');
        setSets([]);
        setGames({ a: 0, b: 0 });
        setTb(null);
        setResult(null);
    };

    const rematch = () => {
        setSets([]);
        setGames({ a: 0, b: 0 });
        setTb(null);
        setResult(null);
        setPhase('playing');
    };

    // ════════════════════════════════════════════════════════════════════
    // SETUP
    // ════════════════════════════════════════════════════════════════════
    if (phase === 'setup') {
        const available = allPlayers.filter(p => !poolIds.includes(p.id));
        return (
            <div className="competitive">
                <div className="comp-intro">
                    <span className="comp-tag">🆚 Competitive</span>
                    <p className="section-subtitle">Pick four players, draft two teams, set the format.</p>
                </div>

                {/* Format config */}
                <div className="card comp-config">
                    <h3 className="comp-section-title">Match Format</h3>
                    <div className="comp-config-row">
                        <div className="comp-stepper">
                            <span className="comp-stepper-label">First to (sets)</span>
                            <div className="comp-stepper-controls">
                                <button className="score-btn" onClick={() => adjustConfig('setsToWin', -1, 1, 9)} disabled={config.setsToWin <= 1}>−</button>
                                <span className="comp-stepper-value">{config.setsToWin}</span>
                                <button className="score-btn" onClick={() => adjustConfig('setsToWin', 1, 1, 9)}>+</button>
                            </div>
                        </div>
                        <div className="comp-stepper">
                            <span className="comp-stepper-label">Games / set</span>
                            <div className="comp-stepper-controls">
                                <button className="score-btn" onClick={() => adjustConfig('gamesPerSet', -1, 1, 12)} disabled={config.gamesPerSet <= 1}>−</button>
                                <span className="comp-stepper-value">{config.gamesPerSet}</span>
                                <button className="score-btn" onClick={() => adjustConfig('gamesPerSet', 1, 1, 12)}>+</button>
                            </div>
                        </div>
                    </div>
                    <label className="comp-toggle">
                        <input
                            type="checkbox"
                            checked={config.winByTwo}
                            onChange={(e) => setConfig({ ...config, winByTwo: e.target.checked })}
                        />
                        <span>Win by 2 — tie-break at {config.gamesPerSet}–{config.gamesPerSet}</span>
                    </label>
                    <p className="comp-format-summary">
                        First to <strong>{config.setsToWin}</strong> {config.setsToWin === 1 ? 'set' : 'sets'} · first to <strong>{config.gamesPerSet}</strong> games per set{config.winByTwo ? ' (win by 2)' : ''}
                    </p>
                </div>

                {/* Player pool + team assignment */}
                <div className="card">
                    <h3 className="comp-section-title">Players & Teams</h3>

                    <div className="player-selector-controls">
                        <div className="dropdown-container">
                            <button className="btn btn-primary" onClick={() => setShowDropdown(!showDropdown)}>
                                Add Registered Player
                            </button>
                            {showDropdown && (
                                <div className="dropdown-menu">
                                    {available.length === 0 ? (
                                        <div className="dropdown-empty">No more players</div>
                                    ) : available.map(p => (
                                        <div key={p.id} className="dropdown-item" onClick={() => addToPool(p.id)}>
                                            {p.name} <span className="comp-elo-mini">{Math.round(p.elo?.current || 1500)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={quickAdd} className="quick-add-form">
                        <input
                            className="input-field"
                            placeholder="Quick add a new player"
                            value={quickName}
                            onChange={(e) => setQuickName(e.target.value)}
                        />
                        <button type="submit" className="btn btn-success btn-sm">Add</button>
                    </form>

                    {poolIds.length === 0 ? (
                        <p className="empty-state">No players added yet</p>
                    ) : (
                        <div className="comp-pool">
                            {poolIds.map(id => (
                                <div key={id} className="comp-pool-row">
                                    <div className="comp-pool-player">
                                        <span className="comp-pool-name">{nameOf(id)}</span>
                                        <span className="comp-elo-mini">{eloOf(id)}</span>
                                    </div>
                                    <div className="comp-team-toggle">
                                        <button
                                            className={`comp-team-btn team-a ${assignment[id] === 'A' ? 'active' : ''}`}
                                            onClick={() => assignTeam(id, 'A')}
                                        >A</button>
                                        <button
                                            className={`comp-team-btn team-b ${assignment[id] === 'B' ? 'active' : ''}`}
                                            onClick={() => assignTeam(id, 'B')}
                                        >B</button>
                                        <button className="btn-icon comp-remove" onClick={() => removeFromPool(id)} aria-label="Remove">&times;</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="comp-teams-preview">
                        <div className="comp-team-card team-a-card">
                            <span className="comp-team-label">Team A</span>
                            {teamA.length ? teamA.map(id => <span key={id} className="comp-team-member">{nameOf(id)}</span>)
                                : <span className="comp-team-empty">{2 - teamA.length} slot(s)</span>}
                        </div>
                        <span className="comp-vs">VS</span>
                        <div className="comp-team-card team-b-card">
                            <span className="comp-team-label">Team B</span>
                            {teamB.length ? teamB.map(id => <span key={id} className="comp-team-member">{nameOf(id)}</span>)
                                : <span className="comp-team-empty">{2 - teamB.length} slot(s)</span>}
                        </div>
                    </div>

                    <button className="btn btn-success btn-lg comp-start" onClick={startMatch} disabled={!canStart}>
                        {canStart ? 'Start Match' : 'Assign 2 players per team'}
                    </button>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════
    // PLAYING & DONE — shared scoreboard
    // ════════════════════════════════════════════════════════════════════
    const live = setsWon(sets);
    const renderTeam = (team, ids) => {
        const isWinner = result && result.winner === team.toUpperCase();
        return (
            <div className={`comp-score-team ${result ? (isWinner ? 'winner' : 'loser') : ''}`}>
                <div className="comp-score-names">
                    {ids.map(id => <span key={id} className="comp-score-name">{nameOf(id)}</span>)}
                </div>
                <div className="comp-sets-won">{team === 'a' ? live.a : live.b} <span>sets</span></div>
                <div className="comp-current">
                    <div className="comp-current-value">{tb ? tb[team] : games[team]}</div>
                    {phase === 'playing' && (
                        <div className="comp-score-controls">
                            <button className="score-btn" onClick={() => removePoint(team)} disabled={(tb ? tb[team] : games[team]) === 0}>−</button>
                            <button className="score-btn comp-add" onClick={() => addPoint(team)}>+</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="competitive">
            <div className="comp-scoreboard-head">
                <span className="comp-tag">🆚 Competitive</span>
                {phase === 'playing' && (
                    <span className="comp-status">
                        {tb ? '🎾 TIE-BREAK' : `Set ${sets.length + 1}`}
                    </span>
                )}
            </div>

            <div className="comp-scoreboard">
                {renderTeam('a', teamA)}
                <div className="comp-score-divider">
                    <span className="comp-vs">VS</span>
                    <span className="comp-format-mini">Bo{config.setsToWin * 2 - 1} · to {config.gamesPerSet}</span>
                </div>
                {renderTeam('b', teamB)}
            </div>

            {/* Completed sets */}
            {sets.length > 0 && (
                <div className="comp-sets-history">
                    {sets.map((s, i) => (
                        <div key={i} className="comp-set-pill">
                            <span className="comp-set-num">S{i + 1}</span>
                            <span className={s.a > s.b ? 'comp-set-win' : ''}>{s.a}</span>
                            <span className="comp-set-sep">–</span>
                            <span className={s.b > s.a ? 'comp-set-win' : ''}>{s.b}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Result */}
            {phase === 'done' && result && (
                <div className="card comp-result">
                    <div className="comp-result-banner">🏆 {(result.winner === 'A' ? teamA : teamB).map(nameOf).join(' & ')} win!</div>
                    <div className="comp-result-score">{live.a} – {live.b} sets</div>
                    <div className="comp-elo-changes">
                        {result.match.players.map(id => {
                            const change = result.eloData.changes[id] || 0;
                            const before = Math.round(result.eloData.beforeRatings[id] || 1500);
                            return (
                                <div key={id} className="comp-elo-row">
                                    <span className="comp-elo-name">{nameOf(id)}</span>
                                    <span className="comp-elo-detail">
                                        {before}
                                        <span className={`comp-elo-delta ${change > 0 ? 'positive' : change < 0 ? 'negative' : ''}`}>
                                            {change > 0 ? '+' : ''}{change}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="comp-result-actions">
                        <button className="btn btn-primary" onClick={rematch}>Rematch</button>
                        <button className="btn btn-secondary" onClick={resetToSetup}>New Match</button>
                    </div>
                </div>
            )}

            {phase === 'playing' && (
                <div className="controls">
                    <button className="btn btn-secondary" onClick={resetToSetup}>Abandon Match</button>
                </div>
            )}
        </div>
    );
};

export default CompetitiveMode;
