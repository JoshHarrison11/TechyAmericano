import React, { useState } from 'react';

const PlayerInput = ({ players, onAddPlayer, onRemovePlayer, onStartTournament }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onAddPlayer(name.trim());
            setName('');
        }
    };

    return (
        <div className="card">
            <h2>Players</h2>
            <form onSubmit={handleSubmit} className="player-form">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter player name"
                    className="input-field"
                />
                <button type="submit" className="btn btn-primary">Add</button>
            </form>

            <ul className="player-list">
                {players.map(player => (
                    <li key={player.id} className="player-item">
                        <span>{player.name}</span>
                        <button onClick={() => onRemovePlayer(player.id)} className="btn-icon" aria-label="Remove">
                            &times;
                        </button>
                    </li>
                ))}
            </ul>

            <div className="action-bar">
                <p className="player-count">{players.length} Players</p>
                <button
                    onClick={onStartTournament}
                    disabled={players.length < 4}
                    className="btn btn-success"
                >
                    Start Tournament
                </button>
            </div>
        </div>
    );
};

export default PlayerInput;
