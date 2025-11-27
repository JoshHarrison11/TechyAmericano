import React from 'react';
import { getTierThresholds } from '../utils/eloService';

const EloInfoModal = ({ onClose }) => {
    const tiers = getTierThresholds();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content elo-info-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📊 What is ELO Rating?</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <section className="info-section">
                        <h3>Understanding ELO</h3>
                        <p>
                            ELO is a number that shows your skill level. The higher your ELO, the better player you are!
                        </p>
                        <p>
                            Everyone starts at <strong>1500 ELO</strong>. As you play matches, your rating goes up when you win and down when you lose.
                        </p>
                    </section>

                    <section className="info-section">
                        <h3>How ELO Changes</h3>
                        <ul>
                            <li><strong>Win against better players:</strong> Gain more points</li>
                            <li><strong>Win against weaker players:</strong> Gain fewer points</li>
                            <li><strong>Lose to weaker players:</strong> Lose more points</li>
                            <li><strong>Lose to better players:</strong> Lose fewer points</li>
                        </ul>
                    </section>

                    <section className="info-section">
                        <h3>Score Margins Matter</h3>
                        <p>
                            The score of the match affects how much your ELO changes:
                        </p>
                        <ul>
                            <li><strong>Blowout wins (4-0, 4-1):</strong> Bigger ELO gains</li>
                            <li><strong>Close games (4-3):</strong> Smaller ELO changes</li>
                            <li><strong>Dominant performances:</strong> Rewarded with more points</li>
                        </ul>
                    </section>

                    <section className="info-section">
                        <h3>Rating Tiers</h3>
                        <p>Your ELO determines your tier. Climb the ranks to reach higher tiers!</p>
                        <div className="tier-list">
                            {tiers.map((tier) => (
                                <div key={tier.tier} className="tier-item" style={{ borderLeft: `4px solid ${tier.color}` }}>
                                    <span className="tier-name" style={{ color: tier.color }}>
                                        {tier.name}
                                    </span>
                                    <span className="tier-range">
                                        {tier.threshold === 0 ? '< ' : ''}
                                        {tier.threshold === 0 ? tier.maxThreshold : tier.threshold}
                                        {tier.maxThreshold < 9999 ? ` - ${tier.maxThreshold}` : '+'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="info-section">
                        <p className="tip">
                            💡 <strong>Tip:</strong> Keep playing to improve your rating and climb the tiers!
                        </p>
                    </section>
                </div>

                <div className="modal-footer">
                    <button className="button" onClick={onClose}>Got it!</button>
                </div>
            </div>
        </div>
    );
};

export default EloInfoModal;
