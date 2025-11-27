import React, { useEffect } from 'react';

const TierChangeNotification = ({ playerName, oldTier, newTier, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isPromotion = getTierOrder(newTier) > getTierOrder(oldTier);
    const oldTierEmoji = getTierEmoji(oldTier);
    const newTierEmoji = getTierEmoji(newTier);

    return (
        <div className="tier-change-notification-compact">
            <span className="tier-player-name">{playerName}</span>
            <span className="tier-action">{isPromotion ? 'Promoted' : 'Demoted'}</span>
            <span className="tier-badges">
                {oldTierEmoji} → {newTierEmoji}
            </span>
        </div>
    );
};

// Helper to get tier order for comparison
const getTierOrder = (tier) => {
    const order = {
        wood: 1,
        bronze: 2,
        silver: 3,
        gold: 4,
        platinum: 5,
        master: 6,
        grandmaster: 7
    };
    return order[tier] || 0;
};

// Helper to get tier emoji
const getTierEmoji = (tier) => {
    const emojis = {
        wood: '🪵',
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎',
        master: '👑',
        grandmaster: '⭐'
    };
    return emojis[tier] || '❓';
};

export default TierChangeNotification;
