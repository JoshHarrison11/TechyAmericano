import React, { useState } from 'react';
import { getAllPlayers } from '../utils/playerService';

const MIN_PLAYERS = 4;

const PlayerSelector = ({ selectedPlayers, onPlayersChange, onStartTournament }) => {
    const [availablePlayers] = useState(getAllPlayers());
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickPlayerName, setQuickPlayerName] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [search, setSearch] = useState('');

    const handleSelectPlayer = (player) => {
        if (!selectedPlayers.find(p => p.id === player.id)) {
            onPlayersChange([...selectedPlayers, player]);
        }
        setSearch('');
        setShowDropdown(false);
    };

    const handleRemovePlayer = (playerId) => {
        onPlayersChange(selectedPlayers.filter(p => p.id !== playerId));
    };

    const handleQuickAdd = (e) => {
        e.preventDefault();
        if (quickPlayerName.trim()) {
            // Create a temporary player (not saved to profiles)
            const tempPlayer = {
                id: `temp_${Date.now()}`,
                name: quickPlayerName.trim(),
                isQuickPlayer: true
            };
            onPlayersChange([...selectedPlayers, tempPlayer]);
            setQuickPlayerName('');
            setShowQuickAdd(false);
        }
    };

    const unselectedPlayers = availablePlayers.filter(
        p => !selectedPlayers.find(sp => sp.id === p.id)
    );

    const filteredPlayers = unselectedPlayers.filter(
        p => p.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    const handleAddAll = () => {
        if (unselectedPlayers.length === 0) return;
        onPlayersChange([...selectedPlayers, ...unselectedPlayers]);
        setShowDropdown(false);
    };

    const remaining = MIN_PLAYERS - selectedPlayers.length;
    const canStart = remaining <= 0;
    const startLabel = canStart
        ? 'Start Tournament'
        : `Add ${remaining} more player${remaining === 1 ? '' : 's'}`;

    return (
        <div className="card">
            <h2>Select Players</h2>

            <div className="player-selector-controls">
                <div className="dropdown-container">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        Add player
                    </button>

                    {showDropdown && (
                        <div className="dropdown-menu">
                            <div className="dropdown-search">
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Search players…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {filteredPlayers.length === 0 ? (
                                <div className="dropdown-empty">
                                    {unselectedPlayers.length === 0 ? 'All players selected' : 'No matches'}
                                </div>
                            ) : (
                                filteredPlayers.map(player => (
                                    <div
                                        key={player.id}
                                        className="dropdown-item"
                                        onClick={() => handleSelectPlayer(player)}
                                    >
                                        {player.name}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                >
                    Quick add
                </button>

                <button
                    className="btn btn-secondary"
                    onClick={handleAddAll}
                    disabled={unselectedPlayers.length === 0}
                >
                    Add all ({unselectedPlayers.length})
                </button>
            </div>

            {showQuickAdd && (
                <form onSubmit={handleQuickAdd} className="quick-add-form">
                    <input
                        type="text"
                        value={quickPlayerName}
                        onChange={(e) => setQuickPlayerName(e.target.value)}
                        placeholder="Enter player name (one-time)"
                        className="input-field"
                        autoFocus
                    />
                    <button type="submit" className="btn btn-success btn-sm">Add</button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                            setShowQuickAdd(false);
                            setQuickPlayerName('');
                        }}
                    >
                        Cancel
                    </button>
                </form>
            )}

            <div className="selected-players-section">
                <h3>Selected Players ({selectedPlayers.length})</h3>
                {selectedPlayers.length === 0 ? (
                    <p className="empty-state">No players selected yet</p>
                ) : (
                    <ul className="player-list">
                        {selectedPlayers.map(player => (
                            <li key={player.id} className="player-item">
                                <span>
                                    {player.name}
                                    {player.isQuickPlayer && <span className="quick-player-badge">Quick</span>}
                                </span>
                                <button
                                    onClick={() => handleRemovePlayer(player.id)}
                                    className="btn-icon"
                                    aria-label="Remove"
                                >
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="action-bar">
                <p className="player-count">{selectedPlayers.length} Players</p>
                <button
                    onClick={onStartTournament}
                    disabled={!canStart}
                    className="btn btn-success"
                >
                    {startLabel}
                </button>
            </div>
        </div>
    );
};

export default PlayerSelector;
