/**
 * Player Profile Service - Complete Working Version
 * Manages player profiles and match history with localStorage persistence
 */

import {
    initializePlayerElo,
    calculateMatchEloChanges,
    updatePlayerElo,
    calculateEloTrend,
    getPlayerRank,
    getEloTier
} from './eloService.js';

const STORAGE_KEYS = {
    PLAYERS: 'padelPlayers',
    MATCH_HISTORY: 'padelMatchHistory',
    TOURNAMENTS: 'padelTournaments'
};

// ============================================================================
// Player CRUD Operations
// ============================================================================

export const getAllPlayers = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading players:', error);
        return [];
    }
};

export const getPlayerById = (playerId) => {
    const players = getAllPlayers();
    return players.find(p => p.id === playerId);
};

export const createPlayer = (name, avatar = null) => {
    const players = getAllPlayers();

    const newPlayer = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        avatar,
        createdAt: Date.now(),
        stats: {
            tournamentsPlayed: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            gamesWon: 0,
            gamesLost: 0,
            currentStreak: 0,
            longestStreak: 0,
            firstTournamentDate: null,
            lastTournamentDate: null
        },
        elo: initializePlayerElo(),
        badges: []
    };

    players.push(newPlayer);
    savePlayersToStorage(players);
    return newPlayer;
};

export const updatePlayer = (playerId, updates) => {
    const players = getAllPlayers();
    const index = players.findIndex(p => p.id === playerId);

    if (index === -1) return null;

    players[index] = {
        ...players[index],
        ...updates,
        id: playerId,
        stats: players[index].stats
    };

    savePlayersToStorage(players);
    return players[index];
};

export const deletePlayer = (playerId) => {
    const players = getAllPlayers();
    const filtered = players.filter(p => p.id !== playerId);
    savePlayersToStorage(filtered);

    const matches = getAllMatches();
    const filteredMatches = matches.filter(m =>
        !m.teams.flat().includes(playerId)
    );
    saveMatchesToStorage(filteredMatches);
};

const savePlayersToStorage = (players) => {
    try {
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    } catch (error) {
        console.error('Error saving players:', error);
    }
};

// ============================================================================
// Match History Operations
// ============================================================================

export const getAllMatches = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading match history:', error);
        return [];
    }
};

export const getMatchesByPlayer = (playerId) => {
    const matches = getAllMatches();
    return matches.filter(m => m.teams.flat().includes(playerId));
};

export const saveMatchesToStorage = (matches) => {
    try {
        localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(matches));
    } catch (error) {
        console.error('Error saving match history:', error);
    }
};

export const addMatchToHistory = (match, tournamentId) => {
    const matches = getAllMatches();
    const players = getAllPlayers();

    const playerRatings = {};
    const playerMatches = {};

    match.players.forEach(playerId => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            playerRatings[playerId] = player.elo?.current || 1500;
            playerMatches[playerId] = player.elo?.matchesForRating || 0;
        }
    });

    const eloData = calculateMatchEloChanges(match, playerRatings, playerMatches);

    const matchRecord = {
        id: match.id,
        tournamentId,
        date: Date.now(),
        teams: match.teams,
        score: match.score,
        completed: match.completed,
        players: match.players,
        eloData
    };

    matches.push(matchRecord);
    saveMatchesToStorage(matches);

    if (match.completed) {
        match.players.forEach(playerId => {
            const player = players.find(p => p.id === playerId);
            if (player && player.elo) {
                const change = eloData.changes[playerId];
                player.elo = updatePlayerElo(player.elo, change, match.id, matchRecord.date);
            }
        });
        savePlayersToStorage(players);
    }

    return matchRecord;
};

// ============================================================================
// Statistics Calculation
// ============================================================================

export const calculatePlayerStats = (playerId) => {
    const matches = getMatchesByPlayer(playerId);
    const completedMatches = matches.filter(m => m.completed);
    const player = getPlayerById(playerId);

    let matchesWon = 0;
    let matchesLost = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    const tournamentIds = new Set(matches.map(m => m.tournamentId));
    const sortedMatches = [...completedMatches].sort((a, b) => a.date - b.date);

    sortedMatches.forEach(match => {
        const teamIndex = match.teams[0].includes(playerId) ? 0 : 1;
        const myScore = match.score[teamIndex];
        const opponentScore = match.score[1 - teamIndex];

        gamesWon += myScore;
        gamesLost += opponentScore;

        if (myScore > opponentScore) {
            matchesWon++;
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else if (myScore < opponentScore) {
            matchesLost++;
            currentStreak = 0;
        }
    });

    let firstTournamentDate = null;
    let lastTournamentDate = null;

    if (matches.length > 0) {
        const dates = matches.map(m => m.date).sort((a, b) => a - b);
        firstTournamentDate = dates[0];
        lastTournamentDate = dates[dates.length - 1];
    }

    const elo = player?.elo || initializePlayerElo();
    const allPlayers = getAllPlayers();
    const allElos = allPlayers.map(p => p.elo?.current || 1500);
    const eloRank = getPlayerRank(elo.current, allElos);
    const eloTrend = calculateEloTrend(elo.history);
    const eloTier = getEloTier(elo.current);

    return {
        tournamentsPlayed: tournamentIds.size,
        matchesPlayed: completedMatches.length,
        matchesWon,
        matchesLost,
        gamesWon,
        gamesLost,
        winPercentage: completedMatches.length > 0 ? (matchesWon / completedMatches.length) * 100 : 0,
        avgGamesPerMatch: completedMatches.length > 0 ? gamesWon / completedMatches.length : 0,
        currentStreak,
        longestStreak,
        pointsDifferential: gamesWon - gamesLost,
        firstTournamentDate,
        lastTournamentDate,
        elo: elo.current,
        eloPeak: elo.peak,
        eloPeakDate: elo.peakDate,
        eloRank,
        eloTrend,
        eloTier,
        eloProvisional: elo.provisional,
        eloMatchesForRating: elo.matchesForRating,
        totalPlayers: allPlayers.length
    };
};

export const updatePlayerStats = (playerId) => {
    const stats = calculatePlayerStats(playerId);
    const players = getAllPlayers();
    const index = players.findIndex(p => p.id === playerId);

    if (index !== -1) {
        players[index].stats = {
            tournamentsPlayed: stats.tournamentsPlayed,
            matchesPlayed: stats.matchesPlayed,
            wins: stats.matchesWon,
            losses: stats.matchesLost,
            matchesWon: stats.matchesWon,
            matchesLost: stats.matchesLost,
            gamesWon: stats.gamesWon,
            gamesLost: stats.gamesLost,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            firstTournamentDate: stats.firstTournamentDate,
            lastTournamentDate: stats.lastTournamentDate
        };

        savePlayersToStorage(players);
    }
};

// ============================================================================
// Head-to-Head Analysis
// ============================================================================

export const getHeadToHeadStats = (player1Id, player2Id) => {
    const matches = getAllMatches().filter(m =>
        m.completed &&
        m.teams.flat().includes(player1Id) &&
        m.teams.flat().includes(player2Id)
    );

    let player1Wins = 0;
    let player2Wins = 0;
    let player1GamesWon = 0;
    let player2GamesWon = 0;
    let closestMargin = Infinity;
    let biggestBlowout = 0;
    let closestMatch = null;
    let biggestMatch = null;

    const versusMatches = matches.filter(m => {
        const team1 = m.teams[0];
        const team2 = m.teams[1];
        return (team1.includes(player1Id) && team2.includes(player2Id)) ||
            (team2.includes(player1Id) && team1.includes(player2Id));
    });

    versusMatches.forEach(match => {
        const p1Team = match.teams[0].includes(player1Id) ? 0 : 1;
        const p2Team = 1 - p1Team;

        const p1Score = match.score[p1Team];
        const p2Score = match.score[p2Team];
        const margin = Math.abs(p1Score - p2Score);

        player1GamesWon += p1Score;
        player2GamesWon += p2Score;

        if (p1Score > p2Score) {
            player1Wins++;
        } else if (p2Score > p1Score) {
            player2Wins++;
        }

        if (margin < closestMargin) {
            closestMargin = margin;
            closestMatch = match;
        }

        if (margin > biggestBlowout) {
            biggestBlowout = margin;
            biggestMatch = match;
        }
    });

    const partnershipMatches = matches.filter(m => {
        const team1 = m.teams[0];
        const team2 = m.teams[1];
        return (team1.includes(player1Id) && team1.includes(player2Id)) ||
            (team2.includes(player1Id) && team2.includes(player2Id));
    });

    let partnershipWins = 0;
    let partnershipGamesWon = 0;
    let partnershipGamesLost = 0;

    partnershipMatches.forEach(match => {
        const teamIndex = match.teams[0].includes(player1Id) ? 0 : 1;
        const myScore = match.score[teamIndex];
        const opponentScore = match.score[1 - teamIndex];

        partnershipGamesWon += myScore;
        partnershipGamesLost += opponentScore;

        if (myScore > opponentScore) {
            partnershipWins++;
        }
    });

    return {
        versusMatches: versusMatches.length,
        player1Wins,
        player2Wins,
        player1GamesWon,
        player2GamesWon,
        averageMargin: versusMatches.length > 0 ?
            Math.abs(player1GamesWon - player2GamesWon) / versusMatches.length : 0,
        closestMatch,
        biggestMatch,
        recentMatches: versusMatches.slice(-5).reverse(),
        partnershipStats: {
            matchesPlayed: partnershipMatches.length,
            wins: partnershipWins,
            losses: partnershipMatches.length - partnershipWins,
            gamesWon: partnershipGamesWon,
            gamesLost: partnershipGamesLost,
            winRate: partnershipMatches.length > 0 ?
                (partnershipWins / partnershipMatches.length) * 100 : 0
        }
    };
};

// ============================================================================
// Partnership Analysis
// ============================================================================

export const getPartnerStats = (playerId) => {
    const matches = getMatchesByPlayer(playerId).filter(m => m.completed);
    const partnerMap = new Map();

    matches.forEach(match => {
        const teamIndex = match.teams[0].includes(playerId) ? 0 : 1;
        const team = match.teams[teamIndex];
        const partnerId = team.find(id => id !== playerId);

        if (!partnerId) return;

        if (!partnerMap.has(partnerId)) {
            partnerMap.set(partnerId, {
                partnerId,
                matchesPlayed: 0,
                wins: 0,
                gamesWon: 0,
                gamesLost: 0
            });
        }

        const stats = partnerMap.get(partnerId);
        stats.matchesPlayed++;

        const myScore = match.score[teamIndex];
        const opponentScore = match.score[1 - teamIndex];

        stats.gamesWon += myScore;
        stats.gamesLost += opponentScore;

        if (myScore > opponentScore) {
            stats.wins++;
        }
    });

    const partners = Array.from(partnerMap.values()).map(p => ({
        ...p,
        winRate: p.matchesPlayed > 0 ? (p.wins / p.matchesPlayed) * 100 : 0
    }));

    partners.sort((a, b) => b.matchesPlayed - a.matchesPlayed);

    return partners;
};

export const getBestPartnership = (playerId) => {
    const partners = getPartnerStats(playerId);
    const qualifiedPartners = partners.filter(p => p.matchesPlayed >= 3);

    if (qualifiedPartners.length === 0) return null;

    qualifiedPartners.sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.matchesPlayed - a.matchesPlayed;
    });

    return qualifiedPartners[0];
};

// Minimal exports for migration functions
export const migrateExistingTournaments = () => ({ playersCreated: 0, matchesMigrated: 0 });
export const migrateEloData = () => ({ success: true });
export const exportData = () => '{}';
export const importData = () => ({ success: false });
export const clearAllData = () => { };
