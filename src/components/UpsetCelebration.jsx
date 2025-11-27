import React, { useEffect } from 'react';

const UpsetCelebration = ({ eloDiff, underdogTeam, teams, players, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

    const underdogNames = teams[underdogTeam].map(getPlayerName).join(' & ');

    return (
        <div className="upset-celebration-overlay" onClick={onClose}>
            <div className="upset-celebration-content" onClick={(e) => e.stopPropagation()}>
                <div className="confetti-container">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                backgroundColor: ['#ffd700', '#ff6b35', '#4caf50', '#2196f3'][Math.floor(Math.random() * 4)]
                            }}
                        />
                    ))}
                </div>

                <div className="upset-icon">🎯</div>
                <h1 className="upset-title">UPSET VICTORY!</h1>
                <div className="upset-subtitle">Giant Slayer Achievement</div>

                <div className="upset-details">
                    <div className="upset-winners">{underdogNames}</div>
                    <div className="upset-elo-diff">
                        Defeated opponents with <span className="elo-advantage">+{Math.round(eloDiff)} ELO</span> advantage!
                    </div>
                </div>

                <button className="upset-close" onClick={onClose}>Continue</button>
            </div>
        </div>
    );
};

export default UpsetCelebration;
