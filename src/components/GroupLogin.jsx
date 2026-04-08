import React, { useState } from 'react';
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
        <div style={{ padding: '2rem', maxWidth: '400px', margin: '10vh auto', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <h1 style={{ color: 'white', marginBottom: '1rem' }}>Padel Groups</h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Enter your private group ID to access your tournament data, or create a brand new league.
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                    type="text" 
                    placeholder={isCreating ? "Choose a unique Group ID..." : "Enter your Group ID..."}
                    value={groupId} 
                    onChange={e => setGroupId(e.target.value)}
                    style={{ padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
                />
                
                {error && <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'left' }}>{error}</div>}
                
                <button 
                    type="submit" 
                    disabled={loading || !groupId.trim()}
                    style={{ 
                        padding: '0.75rem', 
                        fontSize: '1rem', 
                        fontWeight: 'bold',
                        backgroundColor: loading || !groupId.trim() ? '#475569' : '#3b82f6', 
                        color: 'white', 
                        borderRadius: '8px', 
                        border: 'none', 
                        cursor: loading || !groupId.trim() ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {loading ? 'Entering Court...' : (isCreating ? 'Create League' : 'Enter League')}
                </button>
            </form>

            <button 
                onClick={() => { setIsCreating(!isCreating); setError(''); setGroupId(''); }}
                style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
            >
                {isCreating ? 'Already have a group? Enter here.' : 'Need a new group? Create one here.'}
            </button>
        </div>
    );
}
