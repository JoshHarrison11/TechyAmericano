import React, { useState } from 'react';

/**
 * Pick a custom 2v2 game from the players already in the tournament.
 * Calls onConfirm(teamAIds, teamBIds) with exactly two players per team.
 */
const CustomGameModal = ({ players, onConfirm, onClose }) => {
    const [assignment, setAssignment] = useState({}); // playerId -> 'A' | 'B'

    const nameOf = (id) => players.find(p => p.id === id)?.name || 'Unknown';

    const teamA = players.filter(p => assignment[p.id] === 'A').map(p => p.id);
    const teamB = players.filter(p => assignment[p.id] === 'B').map(p => p.id);
    const canConfirm = teamA.length === 2 && teamB.length === 2;

    const assignTeam = (id, team) => {
        const currentCount = players.filter(p => assignment[p.id] === team && p.id !== id).length;
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

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm(teamA, teamB);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content custom-game-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Custom Game</h2>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                <p className="section-subtitle">
                    Pick two players per team. This skips the round's auto match for these players and adds your game.
                </p>

                <div className="comp-pool">
                    {players.map(p => (
                        <div key={p.id} className="comp-pool-row">
                            <div className="comp-pool-player">
                                <span className="comp-pool-name">{p.name}</span>
                            </div>
                            <div className="comp-team-toggle">
                                <button
                                    className={`comp-team-btn team-a ${assignment[p.id] === 'A' ? 'active' : ''}`}
                                    onClick={() => assignTeam(p.id, 'A')}
                                >A</button>
                                <button
                                    className={`comp-team-btn team-b ${assignment[p.id] === 'B' ? 'active' : ''}`}
                                    onClick={() => assignTeam(p.id, 'B')}
                                >B</button>
                            </div>
                        </div>
                    ))}
                </div>

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

                <div className="modal-actions">
                    <button className="btn btn-success btn-lg" onClick={handleConfirm} disabled={!canConfirm}>
                        {canConfirm ? 'Add Game' : 'Assign 2 players per team'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default CustomGameModal;
