import React, { useEffect } from 'react';

const StreakNotification = ({ streak, playerName, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getStreakMessage = () => {
        const absStreak = Math.abs(streak);

        if (streak > 0) {
            // Only show win streaks of 3 or more
            if (absStreak >= 7) {
                return {
                    title: '⭐ LEGENDARY STREAK! ⭐',
                    message: `${playerName} has won ${absStreak} games in a row!`,
                    emoji: '🔥🔥🔥',
                    color: '#ff6b35'
                };
            } else if (absStreak >= 5) {
                return {
                    title: '🔥 UNSTOPPABLE! 🔥',
                    message: `${playerName} is on a ${absStreak}-game win streak!`,
                    emoji: '🔥🔥',
                    color: '#ff8c42'
                };
            } else if (absStreak >= 3) {
                return {
                    title: '🔥 ON FIRE! 🔥',
                    message: `${playerName} has won ${absStreak} in a row!`,
                    emoji: '🔥',
                    color: '#ffa600'
                };
            }
            // Don't show notifications for streaks less than 3
            return null;
        }
        // Don't show losing streak notifications
        return null;
    };

    const streakInfo = getStreakMessage();
    if (!streakInfo) return null;

    return (
        <div className="streak-notification" style={{ borderColor: streakInfo.color }}>
            <div className="streak-emoji">{streakInfo.emoji}</div>
            <div className="streak-content">
                <div className="streak-title" style={{ color: streakInfo.color }}>
                    {streakInfo.title}
                </div>
                <div className="streak-message">{streakInfo.message}</div>
            </div>
            <button className="streak-close" onClick={onClose}>×</button>
        </div>
    );
};

export default StreakNotification;
