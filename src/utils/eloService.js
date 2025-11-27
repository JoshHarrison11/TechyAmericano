/**
 * ELO Rating Service
 * Handles all ELO calculations for the Padel tournament app
 */

const STARTING_ELO = 1500;
const K_FACTOR_NEW = 32;      // < 20 matches
const K_FACTOR_ESTABLISHED = 24; // 20-100 matches
const K_FACTOR_MASTER = 16;   // > 100 matches

/**
 * Calculate expected score for a player/team
 * @param {number} ratingA - ELO rating of player/team A
 * @param {number} ratingB - ELO rating of player/team B
 * @returns {number} Expected score (0 to 1)
 */
export const calculateExpectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Get K-factor based on number of matches played
 * @param {number} matchesPlayed - Total matches played
 * @returns {number} K-factor value
 */
export const getKFactor = (matchesPlayed) => {
    if (matchesPlayed < 20) return K_FACTOR_NEW;
    if (matchesPlayed < 100) return K_FACTOR_ESTABLISHED;
    return K_FACTOR_MASTER;
};

/**
 * Calculate Score Multiplier based on Margin of Victory (MOV)
 * Formula: 0.55 + (0.3 * MOV)
 * @param {number} mov - Margin of Victory (absolute score difference)
 * @returns {number} Multiplier
 */
export const calculateScoreMultiplier = (mov) => {
    const cappedMov = Math.min(mov, 5);
    return 0.55 + (0.3 * cappedMov);
};

/**
 * Calculate ELO change for a single player
 * @param {number} playerRating - Current player rating
 * @param {number} opponentRating - Opponent team rating
 * @param {number} actualScore - Actual score (1 for win, 0.5 for draw, 0 for loss)
 * @param {number} kFactor - K-factor for this player
 * @param {number} scoreMultiplier - Multiplier based on score margin
 * @returns {number} ELO change (can be positive or negative)
 */
export const calculateEloChange = (playerRating, opponentRating, actualScore, kFactor, scoreMultiplier = 1) => {
    const expectedScore = calculateExpectedScore(playerRating, opponentRating);
    return Math.round(kFactor * (actualScore - expectedScore) * scoreMultiplier);
};

/**
 * Get ELO tier based on rating
 * @param {number} rating - ELO rating
 * @returns {string} Tier name
 */
export const getEloTier = (rating) => {
    if (rating < 1300) return 'wood';
    if (rating < 1450) return 'bronze';
    if (rating < 1550) return 'silver';
    if (rating < 1650) return 'gold';
    if (rating < 1800) return 'platinum';
    if (rating < 2000) return 'master';
    return 'grandmaster';
};

/**
 * Get ELO color based on rating
 * @param {number} rating - ELO rating
 * @returns {string} Color hex code
 */
export const getEloColor = (rating) => {
    const tier = getEloTier(rating);
    const colors = {
        wood: '#8B4513',
        bronze: '#cd7f32',
        silver: '#c0c0c0',
        gold: '#ffd700',
        platinum: '#e5e4e2',
        master: '#9b59b6',
        grandmaster: '#ff4444'
    };
    return colors[tier];
};

/**
 * Get tier display name
 * @param {string} tier - Tier identifier
 * @returns {string} Display name
 */
export const getTierDisplayName = (tier) => {
    const names = {
        wood: 'Wood',
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold',
        platinum: 'Diamond',
        master: 'Master',
        grandmaster: 'Grandmaster'
    };
    return names[tier] || 'Unranked';
};

/**
 * Get all tier thresholds for display
 * @returns {array} Array of tier objects with name, threshold, and color
 */
export const getTierThresholds = () => {
    return [
        { name: 'Wood', tier: 'wood', threshold: 0, maxThreshold: 1299, color: '#8B4513' },
        { name: 'Bronze', tier: 'bronze', threshold: 1300, maxThreshold: 1449, color: '#cd7f32' },
        { name: 'Silver', tier: 'silver', threshold: 1450, maxThreshold: 1549, color: '#c0c0c0' },
        { name: 'Gold', tier: 'gold', threshold: 1550, maxThreshold: 1649, color: '#ffd700' },
        { name: 'Diamond', tier: 'platinum', threshold: 1650, maxThreshold: 1799, color: '#e5e4e2' },
        { name: 'Master', tier: 'master', threshold: 1800, maxThreshold: 1999, color: '#9b59b6' },
        { name: 'Grandmaster', tier: 'grandmaster', threshold: 2000, maxThreshold: 9999, color: '#ff4444' }
    ];
};

/**
 * Calculate ELO changes for all players in a match
 * @param {object} match - Match object with teams and score
 * @param {object} playerRatings - Object mapping playerId to current ELO rating
 * @param {object} playerMatches - Object mapping playerId to matches played count
 * @returns {object} ELO changes and metadata
 */
export const calculateMatchEloChanges = (match, playerRatings, playerMatches) => {
    const { teams, score } = match;

    const team1Players = teams[0];
    const team2Players = teams[1];

    const team1Rating1 = playerRatings[team1Players[0]] || STARTING_ELO;
    const team1Rating2 = playerRatings[team1Players[1]] || STARTING_ELO;
    const team2Rating1 = playerRatings[team2Players[0]] || STARTING_ELO;
    const team2Rating2 = playerRatings[team2Players[1]] || STARTING_ELO;

    const team1Elo = (team1Rating1 + team1Rating2) / 2;
    const team2Elo = (team2Rating1 + team2Rating2) / 2;

    const team1Score = score[0];
    const team2Score = score[1];

    let team1Actual = 0;
    if (team1Score > team2Score) team1Actual = 1;
    else if (team1Score === team2Score) team1Actual = 0.5;

    const team2Actual = 1 - team1Actual;

    const mov = Math.abs(team1Score - team2Score);
    const scoreMultiplier = calculateScoreMultiplier(mov);

    const team1Expected = calculateExpectedScore(team1Elo, team2Elo);
    const team2Expected = 1 - team1Expected;

    const k1 = getKFactor(playerMatches[team1Players[0]] || 0);
    const k2 = getKFactor(playerMatches[team1Players[1]] || 0);
    const k3 = getKFactor(playerMatches[team2Players[0]] || 0);
    const k4 = getKFactor(playerMatches[team2Players[1]] || 0);

    const team1Change1 = Math.round(k1 * (team1Actual - team1Expected) * scoreMultiplier);
    const team1Change2 = Math.round(k2 * (team1Actual - team1Expected) * scoreMultiplier);
    const team2Change1 = Math.round(k3 * (team2Actual - team2Expected) * scoreMultiplier);
    const team2Change2 = Math.round(k4 * (team2Actual - team2Expected) * scoreMultiplier);

    const beforeRatings = {
        [team1Players[0]]: team1Rating1,
        [team1Players[1]]: team1Rating2,
        [team2Players[0]]: team2Rating1,
        [team2Players[1]]: team2Rating2
    };

    const changes = {
        [team1Players[0]]: team1Change1,
        [team1Players[1]]: team1Change2,
        [team2Players[0]]: team2Change1,
        [team2Players[1]]: team2Change2
    };

    const afterRatings = {
        [team1Players[0]]: team1Rating1 + team1Change1,
        [team1Players[1]]: team1Rating2 + team1Change2,
        [team2Players[0]]: team2Rating1 + team2Change1,
        [team2Players[1]]: team2Rating2 + team2Change2
    };

    return {
        beforeRatings,
        afterRatings,
        changes,
        teamElos: [team1Elo, team2Elo],
        expectedOutcome: team1Expected,
        scoreMultiplier,
        mov
    };
};

/**
 * Initialize ELO data structure for a player
 * @returns {object} Initial ELO data
 */
export const initializePlayerElo = () => {
    return {
        current: STARTING_ELO,
        peak: STARTING_ELO,
        peakDate: null,
        history: [],
        provisional: true,
        matchesForRating: 0
    };
};

/**
 * Update player ELO after a match
 * @param {object} playerElo - Current player ELO data
 * @param {number} change - ELO change from match
 * @param {string} matchId - Match ID
 * @param {number} timestamp - Match timestamp
 * @returns {object} Updated ELO data
 */
export const updatePlayerElo = (playerElo, change, matchId, timestamp) => {
    const newRating = playerElo.current + change;
    const matchesForRating = playerElo.matchesForRating + 1;

    let peak = playerElo.peak;
    let peakDate = playerElo.peakDate;
    if (newRating > peak) {
        peak = newRating;
        peakDate = timestamp;
    }

    const provisional = matchesForRating < 20;

    const history = [
        ...playerElo.history,
        {
            date: timestamp,
            rating: newRating,
            change: change,
            matchId: matchId
        }
    ];

    return {
        current: newRating,
        peak,
        peakDate,
        history,
        provisional,
        matchesForRating
    };
};

/**
 * Calculate ELO trend (average change over last N matches)
 * @param {array} history - ELO history array
 * @param {number} lastN - Number of recent matches to consider
 * @returns {number} Average change
 */
export const calculateEloTrend = (history, lastN = 5) => {
    if (!history || history.length === 0) return 0;

    const recentMatches = history.slice(-lastN);
    const totalChange = recentMatches.reduce((sum, entry) => sum + (entry.change || 0), 0);
    return Math.round(totalChange / recentMatches.length);
};

/**
 * Get player's rank position based on ELO
 * @param {number} playerElo - Player's ELO rating
 * @param {array} allPlayerElos - Array of all player ELO ratings
 * @returns {number} Rank position (1-based)
 */
export const getPlayerRank = (playerElo, allPlayerElos) => {
    const sortedElos = [...allPlayerElos].sort((a, b) => b - a);
    return sortedElos.indexOf(playerElo) + 1;
};

export default {
    STARTING_ELO,
    calculateExpectedScore,
    getKFactor,
    calculateScoreMultiplier,
    calculateEloChange,
    getEloTier,
    getEloColor,
    getTierDisplayName,
    getTierThresholds,
    calculateMatchEloChanges,
    initializePlayerElo,
    updatePlayerElo,
    calculateEloTrend,
    getPlayerRank
};
