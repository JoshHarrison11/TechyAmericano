import React, { useState } from 'react';
import { getAllPlayers } from '../utils/playerService';

const PlayerSelector = ({ selectedPlayers, onPlayersChange, onStartTournament }) => {
    const [availablePlayers] = useState(getAllPlayers());
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickPlayerName, setQuickPlayerName] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const handleSelectPlayer = (player) => {
        if (!selectedPlayers.find(p => p.id === player.id)) {
            onPlayersChange([...selectedPlayers, player]);
        }
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

    return (
        <div className="card">
            <h2>Select Players</h2>

            <div className="player-selector-controls">
                <div className="dropdown-container">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        Select from Registered Players
                    </button>

                    {showDropdown && (
                        <div className="dropdown-menu">
                            {unselectedPlayers.length === 0 ? (
                                <div className="dropdown-empty">All players selected</div>
                            ) : (
                                unselectedPlayers.map(player => (
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
                    + Quick Add Player
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
                    disabled={selectedPlayers.length < 4}
                    className="btn btn-success"
                >
                    Start Tournament
                </button>
            </div>
        </div>
    );
};

export default PlayerSelector;
