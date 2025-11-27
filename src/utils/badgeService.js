// Achievement badge definitions and logic

export const BADGE_DEFINITIONS = {
    // First achievements
    FIRST_BLOOD: {
        id: 'first_blood',
        name: 'First Blood',
        description: 'Win your first ever match',
        icon: '🎯',
        rarity: 'common',
        checkCondition: (player, match, allMatches) => {
            const wins = allMatches.filter(m => {
                const teamIdx = m.teams[0].includes(player.id) ? 0 : 1;
                return m.score[teamIdx] > m.score[1 - teamIdx];
            }).length;
            return wins === 1;
        }
    },

    // Win streak achievements
    HOT_STREAK: {
        id: 'hot_streak',
        name: 'Hot Streak',
        description: 'Win 5 consecutive matches',
        icon: '🔥',
        rarity: 'rare',
        checkCondition: (player) => player.stats?.currentStreak >= 5
    },

    UNSTOPPABLE: {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: 'Win 10 consecutive matches',
        icon: '⚡',
        rarity: 'epic',
        checkCondition: (player) => player.stats?.currentStreak >= 10
    },

    // Tier achievements
    BRONZE_LEAGUE: {
        id: 'bronze_league',
        name: 'Bronze League',
        description: 'Reach Bronze tier',
        icon: '🥉',
        rarity: 'common',
        checkCondition: (player) => {
            const tier = player.elo?.tier || 'wood';
            return ['bronze', 'silver', 'gold', 'platinum', 'master', 'grandmaster'].includes(tier);
        }
    },

    SILVER_LEAGUE: {
        id: 'silver_league',
        name: 'Silver League',
        description: 'Reach Silver tier',
        icon: '🥈',
        rarity: 'common',
        checkCondition: (player) => {
            const tier = player.elo?.tier || 'wood';
            return ['silver', 'gold', 'platinum', 'master', 'grandmaster'].includes(tier);
        }
    },

    GOLDEN_TOUCH: {
        id: 'golden_touch',
        name: 'Golden Touch',
        description: 'Reach Gold tier',
        icon: '🥇',
        rarity: 'rare',
        checkCondition: (player) => {
            const tier = player.elo?.tier || 'wood';
            return ['gold', 'platinum', 'master', 'grandmaster'].includes(tier);
        }
    },

    PLATINUM_ELITE: {
        id: 'platinum_elite',
        name: 'Platinum Elite',
        description: 'Reach Platinum tier',
        icon: '💎',
        rarity: 'epic',
        checkCondition: (player) => {
            const tier = player.elo?.tier || 'wood';
            return ['platinum', 'master', 'grandmaster'].includes(tier);
        }
    },

    MASTER_CLASS: {
        id: 'master_class',
        name: 'Master Class',
        description: 'Reach Master tier',
        icon: '👑',
        rarity: 'epic',
        checkCondition: (player) => {
            const tier = player.elo?.tier || 'wood';
            return ['master', 'grandmaster'].includes(tier);
        }
    },

    GRANDMASTER: {
        id: 'grandmaster',
        name: 'Grandmaster',
        description: 'Reach Grandmaster tier',
        icon: '⭐',
        rarity: 'legendary',
        checkCondition: (player) => {
            const tier = player.elo?.tier || 'wood';
            return tier === 'grandmaster';
        }
    },

    // Performance achievements
    PERFECT_VICTORY: {
        id: 'perfect_victory',
        name: 'Perfect Victory',
        description: 'Win a match 4-0',
        icon: '💯',
        rarity: 'rare',
        checkCondition: (player, match) => {
            if (!match) return false;
            const teamIdx = match.teams[0].includes(player.id) ? 0 : 1;
            return match.score[teamIdx] === 4 && match.score[1 - teamIdx] === 0;
        }
    },

    // Participation achievements
    CENTURY_CLUB: {
        id: 'century_club',
        name: 'Century Club',
        description: 'Play 100 total matches',
        icon: '💯',
        rarity: 'epic',
        checkCondition: (player) => (player.stats?.matchesPlayed || 0) >= 100
    },

    TOURNAMENT_REGULAR: {
        id: 'tournament_regular',
        name: 'Tournament Regular',
        description: 'Complete 10 tournaments',
        icon: '🏆',
        rarity: 'rare',
        checkCondition: (player) => (player.stats?.tournamentsPlayed || 0) >= 10
    },

    // ELO milestones
    CENTURY_MAKER: {
        id: 'century_maker',
        name: 'Century Maker',
        description: 'Gain 100+ ELO points from starting rating',
        icon: '📈',
        rarity: 'rare',
        checkCondition: (player) => {
            const current = player.elo?.current || 1500;
            return current >= 1600;
        }
    },

    RISING_STAR: {
        id: 'rising_star',
        name: 'Rising Star',
        description: 'Reach 1700 ELO',
        icon: '🌟',
        rarity: 'epic',
        checkCondition: (player) => (player.elo?.current || 0) >= 1700
    }
};

export const RARITY_COLORS = {
    common: '#94a3b8',
    rare: '#60a5fa',
    epic: '#a78bfa',
    legendary: '#fbbf24'
};

/**
 * Check if a player has earned a specific badge
 */
export const checkBadgeEarned = (badgeId, player, match = null, allMatches = []) => {
    const badge = BADGE_DEFINITIONS[badgeId];
    if (!badge) return false;

    return badge.checkCondition(player, match, allMatches);
};

/**
 * Check all badges for a player and return newly earned ones
 */
export const checkAllBadges = (player, match = null, allMatches = []) => {
    const earnedBadges = player.badges || [];
    const earnedBadgeIds = earnedBadges.map(b => b.badgeId);
    const newlyEarned = [];

    Object.keys(BADGE_DEFINITIONS).forEach(badgeId => {
        if (!earnedBadgeIds.includes(badgeId)) {
            if (checkBadgeEarned(badgeId, player, match, allMatches)) {
                const badge = BADGE_DEFINITIONS[badgeId];
                newlyEarned.push({
                    badgeId,
                    name: badge.name,
                    description: badge.description,
                    icon: badge.icon,
                    rarity: badge.rarity,
                    dateEarned: new Date().toISOString()
                });
            }
        }
    });

    return newlyEarned;
};

/**
 * Get all badge definitions for display
 */
export const getAllBadgeDefinitions = () => {
    return Object.keys(BADGE_DEFINITIONS).map(id => ({
        id,
        ...BADGE_DEFINITIONS[id]
    }));
};
