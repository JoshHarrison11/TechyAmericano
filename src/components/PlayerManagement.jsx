import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import { getAllPlayers, createPlayer, deletePlayer, calculatePlayerStats } from '../utils/playerService';

const PlayerManagement = ({ onViewProfile, onClose }) => {
    const [players, setPlayers] = useState(getAllPlayers());
    const [newPlayerName, setNewPlayerName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('elo'); // Default sort by ELO

    const handleAddPlayer = (e) => {
        e.preventDefault();
        if (newPlayerName.trim()) {
            createPlayer(newPlayerName.trim());
            setPlayers(getAllPlayers());
            setNewPlayerName('');
        }
    };

    const handleDeletePlayer = (playerId, playerName) => {
        if (window.confirm(`Are you sure you want to delete ${playerName}? This will remove all their statistics.`)) {
            deletePlayer(playerId);
            setPlayers(getAllPlayers());
        }
    };

    const filteredPlayers = players.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate stats for all filtered players
    const playersWithStats = filteredPlayers.map(player => ({
        player,
        stats: calculatePlayerStats(player.id)
    }));

    // Sort players based on selected criteria
    const sortedPlayers = [...playersWithStats].sort((a, b) => {
        switch (sortBy) {
            case 'elo':
                return (b.stats.elo || 1500) - (a.stats.elo || 1500);
            case 'name':
                return a.player.name.localeCompare(b.player.name);
            case 'tournaments':
                return b.stats.tournamentsPlayed - a.stats.tournamentsPlayed;
            case 'winRate':
                return b.stats.winPercentage - a.stats.winPercentage;
            default:
                return 0;
        }
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content player-management-modal">
                <div className="modal-header">
                    <h2>Player Management</h2>
                    <button onClick={onClose} className="btn-close" aria-label="Close">&times;</button>
                </div>

                <form onSubmit={handleAddPlayer} className="player-form">
                    <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Enter player name"
                        className="input-field"
                    />
                    <button type="submit" className="btn btn-primary">Add Player</button>
                </form>

                <div className="player-management-controls">
                    <div className="search-bar">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search players..."
                            className="input-field"
                        />
                    </div>

                    <div className="sort-controls">
                        <label htmlFor="sort-select">Sort by:</label>
                        <select
                            id="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select-field"
                        >
                            <option value="elo">ELO Rating</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="tournaments">Tournaments Played</option>
                            <option value="winRate">Win Rate</option>
                        </select>
                    </div>
                </div>

                <div className="player-count-display">
                    {sortedPlayers.length} {sortedPlayers.length === 1 ? 'Player' : 'Players'}
                </div>

                <div className="player-grid">
                    {sortedPlayers.length === 0 ? (
                        <div className="empty-state">
                            {searchQuery ? 'No players found' : 'No players yet. Add your first player above!'}
                        </div>
                    ) : (
                        sortedPlayers.map(({ player, stats }, index) => {
                            // Rank is based on ELO sort order
                            const rank = sortBy === 'elo' ? index + 1 : stats.eloRank;

                            return (
                                <div key={player.id} className="player-card-wrapper">
                                    <PlayerCard
                                        player={player}
                                        stats={stats}
                                        onClick={() => onViewProfile(player.id)}
                                        rank={rank}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePlayer(player.id, player.name);
                                        }}
                                        className="btn-delete-player"
                                        aria-label="Delete player"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PlayerManagement;
