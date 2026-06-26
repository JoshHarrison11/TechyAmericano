import React, { useState } from 'react';

/**
 * Destructive confirmation: wipe a league's stats (players' stats/ELO,
 * tournaments and matches) while keeping the league and players themselves.
 * The user must type the exact league name to enable the reset.
 */
const ResetStatsModal = ({ groupId, onConfirm, onClose }) => {
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);

    const matches = typed.trim() === groupId;

    const handleConfirm = async () => {
        if (!matches || busy) return;
        setBusy(true);
        try {
            await onConfirm();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={busy ? undefined : onClose}>
            <div className="modal-content reset-stats-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Reset League Stats</h2>
                    <button className="btn-close" onClick={onClose} disabled={busy}>&times;</button>
                </div>

                <p className="reset-warning">
                    This wipes <strong>all player stats and ELO</strong>, and deletes
                    <strong> every tournament and match</strong> in this league — on this device
                    and in the cloud. The league and your players are <strong>kept</strong>.
                    This cannot be undone.
                </p>

                <label className="reset-label">
                    Type the league name <strong>{groupId}</strong> to confirm:
                </label>
                <input
                    className="input-field reset-input"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={groupId}
                    autoFocus
                    disabled={busy}
                />

                <div className="modal-actions">
                    <button className="btn btn-danger" onClick={handleConfirm} disabled={!matches || busy}>
                        {busy ? 'Resetting…' : 'Reset Everything'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default ResetStatsModal;
