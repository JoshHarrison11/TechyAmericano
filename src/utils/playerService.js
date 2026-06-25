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
import { supabase } from './supabaseClient.js';

const STORAGE_KEYS = {
    PLAYERS: 'padelPlayers',
    MATCH_HISTORY: 'padelMatchHistory',
    TOURNAMENTS: 'padelTournaments'
};

// ============================================================================
// Pending-sync outbox — durable retry for flaky connections / fast tab closes
// ============================================================================
// Each write marks its table "dirty" in localStorage. A dirty flag survives a
// tab close, so the data is re-pushed on the next load / when back online /
// on a timer — and syncFromSupabase never overwrites a dirty table.
const PENDING_KEY = 'padelPendingSync';

const getPending = () => {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || {}; }
    catch { return {}; }
};

// Each table holds a monotonically increasing "dirty version". A push only
// clears the flag if the version is unchanged since it started — so a write
// that lands mid-push isn't accidentally marked as synced.
const markDirty = (table) => {
    const p = getPending();
    p[table] = (p[table] || 0) + 1;
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
};

const clearIfUnchanged = (table, version) => {
    const p = getPending();
    if (p[table] === version) {
        delete p[table];
        localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    }
};

// ── Pending DELETES outbox ──────────────────────────────────────────────
// Deletions are durable too: a delete applies to localStorage immediately and
// is queued so the Supabase delete is retried until it lands. Until then,
// syncFromSupabase filters these ids out of pulled data so they can't reappear.
const PENDING_DELETES_KEY = 'padelPendingDeletes';

const getPendingDeletes = () => {
    try { return JSON.parse(localStorage.getItem(PENDING_DELETES_KEY)) || {}; }
    catch { return {}; }
};

const savePendingDeletes = (d) => localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(d));

const queueDeleteIds = (table, ids) => {
    const d = getPendingDeletes();
    d[table] = [...new Set([...(d[table] || []), ...ids.map(String)])];
    savePendingDeletes(d);
};

const queueWipeAll = () => {
    const d = getPendingDeletes();
    d.wipeAll = true;
    savePendingDeletes(d);
};

export const hasPendingDeletes = () => {
    const d = getPendingDeletes();
    return !!(d.wipeAll || (d.tournaments && d.tournaments.length) || (d.players && d.players.length));
};

export const clearPendingDeletes = () => localStorage.removeItem(PENDING_DELETES_KEY);

export const getPendingSyncState = () => {
    const p = getPending();
    const deletes = hasPendingDeletes();
    return {
        players: !!p.players,
        matches: !!p.matches,
        tournaments: !!p.tournaments,
        deletes,
        pending: !!(p.players || p.matches || p.tournaments) || deletes
    };
};

export const clearPendingSync = () => {
    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_DELETES_KEY);
};

const getTournamentsLocal = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.TOURNAMENTS)) || []; }
    catch { return []; }
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

// Prune helpers — write localStorage immediately so local is authoritative.
const removeTournamentsLocal = (ids) => {
    const idset = new Set(ids.map(String));
    const tournaments = getTournamentsLocal().filter(t => !idset.has(String(t.id)));
    localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(tournaments));
    const matches = getAllMatches().filter(m => !idset.has(String(m.tournamentId)));
    localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(matches));
};

const removePlayerLocal = (playerId) => {
    const players = getAllPlayers().filter(p => p.id !== playerId);
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    const matches = getAllMatches().filter(m => !m.teams.flat().includes(playerId));
    localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(matches));
};

// Delete a player (and their matches). Durable: applied locally now, the
// Supabase delete is retried by the outbox and filtered out of pulls until done.
export const deletePlayer = (playerId) => {
    removePlayerLocal(playerId);
    queueDeleteIds('players', [playerId]);
    flushPendingSync();
};

// Delete one or more tournaments (and their matches). Same durability.
export const deleteTournaments = (tournamentIds) => {
    if (!tournamentIds || tournamentIds.length === 0) return;
    removeTournamentsLocal(tournamentIds);
    queueDeleteIds('tournaments', tournamentIds);
    flushPendingSync();
};

// Wipe ALL tournaments + matches for the group (clear-all). Durable.
export const wipeAllGroupData = () => {
    localStorage.removeItem(STORAGE_KEYS.MATCH_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.TOURNAMENTS);
    queueWipeAll();
    flushPendingSync();
};

// Pushes the CURRENT local players snapshot. Returns true on success so the
// outbox can clear the dirty flag (and retry later on failure).
const pushPlayersToSupabase = async () => {
    const groupId = localStorage.getItem('padelGroupId');
    if (!groupId) return false;
    try {
        const payload = getAllPlayers().map(p => ({
            id: p.id,
            group_id: groupId,
            name: p.name,
            avatar: p.avatar,
            created_at: p.createdAt,
            stats: p.stats,
            elo: p.elo,
            badges: p.badges
        }));
        const { error } = await supabase.from('players').upsert(payload);
        if (error) { console.error('Supabase players sync error:', error); return false; }
        return true;
    } catch (e) {
        console.error('Supabase players sync catch:', e);
        return false;
    }
};

const savePlayersToStorage = (players) => {
    try {
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
        markDirty('players');
        flushPendingSync(); // optimistic; retried by the outbox if it fails
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

const pushMatchesToSupabase = async () => {
    const groupId = localStorage.getItem('padelGroupId');
    if (!groupId) return false;
    try {
        const payload = getAllMatches().map(m => ({
            id: m.id.toString(), // Ensure string ID for database
            group_id: groupId,
            tournament_id: m.tournamentId?.toString() || null,
            date: m.date,
            teams: m.teams,
            score: m.score,
            completed: m.completed,
            players: m.players,
            elo_data: m.eloData
        }));
        const { error } = await supabase.from('matches').upsert(payload);
        if (error) { console.error('Supabase matches sync error:', error); return false; }
        return true;
    } catch (e) {
        console.error('Supabase matches sync catch:', e);
        return false;
    }
};

export const saveMatchesToStorage = (matches) => {
    try {
        localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(matches));
        markDirty('matches');
        flushPendingSync();
    } catch (error) {
        console.error('Error saving match history:', error);
    }
};

// ============================================================================
// Tournament Operations
// ============================================================================

const pushTournamentsToSupabase = async () => {
    const groupId = localStorage.getItem('padelGroupId');
    if (!groupId) return false;
    try {
        const payload = getTournamentsLocal().map(t => ({
            id: t.id.toString(),
            group_id: groupId,
            date: t.date,
            players: t.players,
            rounds: t.rounds,
            history: t.history,
            sit_outs: t.sitOuts
        }));
        const { error } = await supabase.from('tournaments').upsert(payload);
        if (error) { console.error('Supabase tournaments sync error:', error); return false; }
        return true;
    } catch (e) {
        console.error('Supabase tournaments sync catch:', e);
        return false;
    }
};

export const saveTournamentsToStorage = (tournaments) => {
    try {
        localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(tournaments));
        markDirty('tournaments');
        flushPendingSync();
    } catch (error) {
        console.error('Error saving tournaments:', error);
    }
};

// ── Remote delete helpers (return true on success so the queue can clear) ───
const deleteRemoteByGroup = async (table, groupId) => {
    try {
        const { error } = await supabase.from(table).delete().eq('group_id', groupId);
        if (error) { console.error(`Supabase wipe ${table} error:`, error); return false; }
        return true;
    } catch (e) { console.error(`Supabase wipe ${table} catch:`, e); return false; }
};

const deleteRemoteTournaments = async (ids) => {
    const strIds = ids.map(String);
    try {
        const { error: mError } = await supabase.from('matches').delete().in('tournament_id', strIds);
        if (mError) { console.error('Supabase tournament-matches delete error:', mError); return false; }
        const { error: tError } = await supabase.from('tournaments').delete().in('id', strIds);
        if (tError) { console.error('Supabase tournament delete error:', tError); return false; }
        return true;
    } catch (e) { console.error('Supabase tournament delete catch:', e); return false; }
};

const deleteRemotePlayers = async (ids) => {
    try {
        for (const id of ids) {
            const { error: mError } = await supabase.from('matches').delete().contains('players', [id]);
            if (mError) { console.error('Supabase player-matches delete error:', mError); return false; }
        }
        const { error: pError } = await supabase.from('players').delete().in('id', ids.map(String));
        if (pError) { console.error('Supabase player delete error:', pError); return false; }
        return true;
    } catch (e) { console.error('Supabase player delete catch:', e); return false; }
};

// Process queued deletes; clear each from the queue only once it lands remotely.
const flushDeletes = async (groupId) => {
    let d = getPendingDeletes();
    if (d.wipeAll) {
        const okM = await deleteRemoteByGroup('matches', groupId);
        const okT = await deleteRemoteByGroup('tournaments', groupId);
        if (okM && okT) {
            d = getPendingDeletes();
            delete d.wipeAll;
            delete d.tournaments; // superseded by the wipe
            savePendingDeletes(d);
        }
    }
    d = getPendingDeletes();
    if (d.tournaments && d.tournaments.length) {
        const ids = d.tournaments;
        if (await deleteRemoteTournaments(ids)) {
            const cur = getPendingDeletes();
            cur.tournaments = (cur.tournaments || []).filter(id => !ids.includes(id));
            if (!cur.tournaments.length) delete cur.tournaments;
            savePendingDeletes(cur);
        }
    }
    d = getPendingDeletes();
    if (d.players && d.players.length) {
        const ids = d.players;
        if (await deleteRemotePlayers(ids)) {
            const cur = getPendingDeletes();
            cur.players = (cur.players || []).filter(id => !ids.includes(id));
            if (!cur.players.length) delete cur.players;
            savePendingDeletes(cur);
        }
    }
};

// Push/delete everything that's still unsynced. Safe to call often: no-ops if
// nothing is pending, there's no group, or a flush is already running.
let flushInFlight = false;
export const flushPendingSync = async () => {
    const state = getPendingSyncState();
    if (!state.pending) return state;
    const groupId = localStorage.getItem('padelGroupId');
    if (!groupId) return state;
    if (flushInFlight) return state;

    flushInFlight = true;
    try {
        const versions = getPending(); // capture versions before pushing
        if (state.players && await pushPlayersToSupabase()) clearIfUnchanged('players', versions.players);
        if (state.matches && await pushMatchesToSupabase()) clearIfUnchanged('matches', versions.matches);
        if (state.tournaments && await pushTournamentsToSupabase()) clearIfUnchanged('tournaments', versions.tournaments);
        if (state.deletes) await flushDeletes(groupId);
    } finally {
        flushInFlight = false;
    }

    const after = getPendingSyncState();
    try { window.dispatchEvent(new CustomEvent('padel-sync', { detail: after })); } catch { /* non-browser */ }
    return after;
};

// Reset a league's stats WITHOUT deleting the league or its players.
// Players keep their name/avatar but have stats + ELO + badges wiped, and all
// tournaments and matches for the group are removed (durable, retried).
export const resetGroupStats = async (groupId) => {
    if (!groupId) return false;

    // 1. Reset every player's stats / ELO / badges (keep identity) — durable upsert
    const resetPlayers = getAllPlayers().map(p => ({
        ...p,
        stats: {
            tournamentsPlayed: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            wins: 0,
            losses: 0,
            gamesWon: 0,
            gamesLost: 0,
            currentStreak: 0,
            longestStreak: 0,
            firstTournamentDate: null,
            lastTournamentDate: null
        },
        elo: initializePlayerElo(),
        badges: []
    }));
    savePlayersToStorage(resetPlayers);

    // 2. Wipe matches + tournaments locally + queue a durable remote wipe
    localStorage.removeItem(STORAGE_KEYS.MATCH_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.TOURNAMENTS);
    localStorage.removeItem('activeTournamentState');
    queueWipeAll();

    await flushPendingSync();
    return true;
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

// ============================================================================
// Cloud Database Synchronization
// ============================================================================

export const syncFromSupabase = async (groupId) => {
    if (!groupId) return false;
    
    try {
        console.log(`Syncing from Supabase for group ${groupId}...`);

        // 0. Push any unsynced local changes FIRST so they can't be lost, then
        //    skip pulling over any table that's still dirty (push failed/offline).
        await flushPendingSync();
        const pending = getPendingSyncState();

        // Deletes that haven't landed remotely yet — filter them out of pulls so
        // a deleted item can never be resurrected from stale cloud data.
        const del = getPendingDeletes();
        const delT = new Set((del.tournaments || []).map(String));
        const delP = new Set((del.players || []).map(String));
        const wipeAll = !!del.wipeAll;

        // 1. Pull Players (unless local players are still unsynced)
        const { data: remotePlayers, error: pError } = await supabase.from('players').select('*').eq('group_id', groupId);
        if (pError) throw pError;

        if (!pending.players && remotePlayers && remotePlayers.length > 0) {
            const mappedPlayers = remotePlayers
                .filter(p => !delP.has(String(p.id)))
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    createdAt: p.created_at,
                    stats: p.stats,
                    elo: p.elo,
                    badges: p.badges
                }));
            localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(mappedPlayers));
        }

        // 2. Pull Matches (skip if a wipe is pending or matches are still unsynced)
        const { data: remoteMatches, error: mError } = await supabase.from('matches').select('*').eq('group_id', groupId);
        if (mError) throw mError;

        if (!wipeAll && !pending.matches && remoteMatches && remoteMatches.length > 0) {
            const mappedMatches = remoteMatches
                .filter(m => !delT.has(String(m.tournament_id)) && !(m.players || []).some(id => delP.has(String(id))))
                .map(m => ({
                    id: m.id.includes('_') ? m.id : parseInt(m.id, 10) || m.id, // Handle legacy numeric IDs
                    tournamentId: m.tournament_id,
                    date: m.date,
                    teams: m.teams,
                    score: m.score,
                    completed: m.completed,
                    players: m.players,
                    eloData: m.elo_data
                }));
            localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(mappedMatches));
        }

        // 3. Pull Tournaments (skip if a wipe is pending or tournaments are still unsynced)
        const { data: remoteTournaments, error: tError } = await supabase.from('tournaments').select('*').eq('group_id', groupId);
        if (tError) throw tError;

        if (!wipeAll && !pending.tournaments && remoteTournaments && remoteTournaments.length > 0) {
            const mappedTournaments = remoteTournaments
                .filter(t => !delT.has(String(t.id)))
                .map(t => ({
                    id: t.id,
                    date: t.date,
                    players: t.players,
                    rounds: t.rounds,
                    history: t.history,
                    sitOuts: t.sit_outs
                }));
            localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(mappedTournaments));
        }

        console.log(`Sync complete: ${remotePlayers?.length || 0} players, ${remoteMatches?.length || 0} matches, ${remoteTournaments?.length || 0} tournaments.`);
        return true;
    } catch (e) {
        console.error('Initial sync failed from Supabase:', e);
        return false;
    }
};
