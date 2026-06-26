import React from 'react';
import { getEloTier, getTierDisplayName } from '../utils/eloService';

// Single-glyph marker per tier. Colour (set in CSS via data-tier) does most of
// the work; the letter disambiguates. Grandmaster gets a star, not "G", so it
// never collides with Gold.
const GLYPHS = {
    wood: 'W',
    bronze: 'B',
    silver: 'S',
    gold: 'G',
    platinum: 'D', // displayed as "Diamond"
    master: 'M',
    grandmaster: '★'
};

const TierBadge = ({ rating }) => {
    const tier = getEloTier(rating || 1500);
    const name = getTierDisplayName(tier);
    return (
        <span className="tier-chip" data-tier={tier} title={`${name} · ${Math.round(rating || 1500)}`} aria-label={`${name} tier`}>
            {GLYPHS[tier] || '?'}
        </span>
    );
};

export default TierBadge;
