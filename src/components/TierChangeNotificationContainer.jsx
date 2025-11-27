import React from 'react';
import TierChangeNotification from './TierChangeNotification';

const TierChangeNotificationContainer = ({ notifications, onClose }) => {
    if (notifications.length === 0) return null;

    return (
        <div className="tier-notification-container">
            {notifications.map((notif) => (
                <TierChangeNotification
                    key={notif.id}
                    playerName={notif.playerName}
                    oldTier={notif.oldTier}
                    newTier={notif.newTier}
                    onClose={() => onClose(notif.id)}
                />
            ))}
        </div>
    );
};

export default TierChangeNotificationContainer;
