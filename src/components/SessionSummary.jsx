import React, { useState, useEffect } from 'react';

const SessionSummary = ({ players, history, onClose }) => {
    const [slideIndex, setSlideIndex] = useState(0);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        // Calculate stats
        if (!players || !history) return;

        // Helper to get player name
        const getPlayerName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

        // 1. Player of the Day (Most Matches Won, then Games Won)
        const playerStats = players.map(p => {
            const matches = history.filter(m => m.completed && m.players.includes(p.id));
            let gamesWon = 0;
            let matchesWon = 0;
            matches.forEach(m => {
                const teamIdx = m.teams[0].includes(p.id) ? 0 : 1;
                const myScore = m.score[teamIdx];
                const opponentScore = m.score[1 - teamIdx];
                gamesWon += myScore;
                if (myScore > opponentScore) matchesWon++;
            });
            return { ...p, gamesWon, matchesWon };
        });
        const bestPlayer = playerStats.sort((a, b) => {
            if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
            return b.gamesWon - a.gamesWon;
        })[0];

        // 2. Biggest Win (Largest score diff)
        let biggestWinMatch = null;
        let maxDiff = -1;
        history.forEach(m => {
            if (!m.completed) return;
            const diff = Math.abs(m.score[0] - m.score[1]);
            if (diff > maxDiff) {
                maxDiff = diff;
                biggestWinMatch = m;
            }
        });

        // Add team names to biggest win
        if (biggestWinMatch) {
            const winningTeamIdx = biggestWinMatch.score[0] > biggestWinMatch.score[1] ? 0 : 1;
            biggestWinMatch.winningTeam = biggestWinMatch.teams[winningTeamIdx].map(getPlayerName).join(' & ');
            biggestWinMatch.losingTeam = biggestWinMatch.teams[1 - winningTeamIdx].map(getPlayerName).join(' & ');
            biggestWinMatch.winningScore = Math.max(...biggestWinMatch.score);
            biggestWinMatch.losingScore = Math.min(...biggestWinMatch.score);
        }

        // 3. Closest Match (Smallest score diff)
        let closestMatch = null;
        let minDiff = Infinity;
        history.forEach(m => {
            if (!m.completed) return;
            const diff = Math.abs(m.score[0] - m.score[1]);
            if (diff < minDiff) {
                minDiff = diff;
                closestMatch = m;
            }
        });

        // Add team names to closest match
        if (closestMatch) {
            closestMatch.team1 = closestMatch.teams[0].map(getPlayerName).join(' & ');
            closestMatch.team2 = closestMatch.teams[1].map(getPlayerName).join(' & ');
        }

        setStats({ bestPlayer, biggestWinMatch, closestMatch, maxDiff, minDiff });
    }, [players, history]);

    const slides = [
        {
            title: "Session Complete!",
            content: <div className="summary-icon">🎉</div>
        },
        {
            title: "Player of the Day",
            content: stats?.bestPlayer ? (
                <div className="summary-highlight">
                    <div className="summary-name">{stats.bestPlayer.name}</div>
                    <div className="summary-detail">{stats.bestPlayer.matchesWon} Matches Won</div>
                    <div className="summary-subtext">{stats.bestPlayer.gamesWon} Games Won</div>
                </div>
            ) : "No data"
        },
        {
            title: "Biggest Win",
            content: stats?.biggestWinMatch ? (
                <div className="summary-highlight">
                    <div className="summary-name">{stats.biggestWinMatch.winningTeam}</div>
                    <div className="summary-detail">
                        {stats.biggestWinMatch.winningScore} - {stats.biggestWinMatch.losingScore}
                    </div>
                    <div className="summary-subtext">vs {stats.biggestWinMatch.losingTeam}</div>
                </div>
            ) : "No data"
        },
        {
            title: "Closest Match",
            content: stats?.closestMatch ? (
                <div className="summary-highlight">
                    <div className="summary-name">{stats.closestMatch.team1}</div>
                    <div className="summary-detail">
                        {stats.closestMatch.score[0]} - {stats.closestMatch.score[1]}
                    </div>
                    <div className="summary-subtext">vs {stats.closestMatch.team2}</div>
                </div>
            ) : "No data"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setSlideIndex(prev => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="slide-container">
                    <h2>{slides[slideIndex].title}</h2>
                    <div className="slide-content">
                        {slides[slideIndex].content}
                    </div>
                </div>
                <div className="slide-indicators">
                    {slides.map((_, idx) => (
                        <span key={idx} className={`indicator ${idx === slideIndex ? 'active' : ''}`}></span>
                    ))}
                </div>
                <button onClick={onClose} className="btn btn-primary close-btn">Close</button>
            </div>
        </div>
    );
};

export default SessionSummary;
