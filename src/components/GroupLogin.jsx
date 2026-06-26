import React, { useState } from 'react';
import Icon from './Icon';
import { supabase } from '../utils/supabaseClient';

export default function GroupLogin({ onLogin }) {
    const [groupId, setGroupId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const cleanId = groupId.trim();
        if(!cleanId) return;
        
        setLoading(true);
        try {
            if (isCreating) {
                // Check if exists
                const { data } = await supabase.from('groups').select('id').eq('id', cleanId);
                if (data && data.length > 0) {
                    setError('This Group ID is already taken. Try another or log in!');
                    setLoading(false);
                    return;
                }
                // Create
                const { error: insertErr } = await supabase.from('groups').insert([{ id: cleanId }]);
                if (insertErr) throw insertErr;
            } else {
                // Login
                const { data } = await supabase.from('groups').select('id').eq('id', cleanId);
                if (!data || data.length === 0) {
                    setError('Group ID not found. Did you mean to create a new one?');
                    setLoading(false);
                    return;
                }
            }
            onLogin(cleanId);
        } catch (err) {
            console.error(err);
            setError('Something went wrong connecting to the database.');
        }
        setLoading(false);
    };

    return (
        <div className="group-login-screen">
            <div className="group-login-card">
                <div className="group-login-logo">
                    <Icon name="racket" size={15} strokeWidth={2.25} />
                    Techy Americano
                </div>
                <h1 className="group-login-title">{isCreating ? 'New League' : 'Enter League'}</h1>
                <p className="group-login-sub">
                    {isCreating
                        ? 'Pick a unique ID for your crew. Track every match, climb the ELO ladder, settle the score.'
                        : 'Enter your private league ID to load your players, tournaments and rankings.'}
                </p>

                <form onSubmit={handleSubmit} className="group-login-form">
                    <input
                        type="text"
                        className="input-field"
                        placeholder={isCreating ? "Choose a unique Group ID..." : "Enter your Group ID..."}
                        value={groupId}
                        onChange={e => setGroupId(e.target.value)}
                        autoFocus
                    />

                    {error && <div className="group-login-error">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading || !groupId.trim()}
                        className="btn btn-primary btn-lg"
                    >
                        {loading ? 'Entering Court…' : (isCreating ? 'Create League' : 'Enter League')}
                    </button>
                </form>

                <button
                    className="group-login-toggle"
                    onClick={() => { setIsCreating(!isCreating); setError(''); setGroupId(''); }}
                >
                    {isCreating
                        ? <>Already have a league? <strong>Sign in</strong></>
                        : <>Need a new league? <strong>Create one</strong></>}
                </button>
            </div>
        </div>
    );
}
