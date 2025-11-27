import React, { useState, useEffect } from 'react';
import PlayerSelector from './components/PlayerSelector';
import MatchCard from './components/MatchCard';
import Leaderboard from './components/Leaderboard';
import SessionSummary from './components/SessionSummary';
import TournamentHistory from './components/TournamentHistory';
import PlayerManagement from './components/PlayerManagement';
import PlayerProfile from './components/PlayerProfile';
import HeadToHead from './components/HeadToHead';
import DedicatedLeaderboard from './components/DedicatedLeaderboard';
import TierChangeNotificationContainer from './components/TierChangeNotificationContainer';
import { generateRound, clearPairingHistory } from './utils/americanoLogic';
import {
  migrateExistingTournaments,
  addMatchToHistory,
  updatePlayerStats,
  createPlayer,
  getAllPlayers,
  migrateEloData
} from './utils/playerService';
import { getEloTier } from './utils/eloService';
import './App.css';

/**
 * Fisher-Yates shuffle algorithm
 * Randomly shuffles an array in place
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function App() {
  const [players, setPlayers] = useState([]);
  const [allRounds, setAllRounds] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sitOuts, setSitOuts] = useState([]);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedTournaments, setSavedTournaments] = useState([]);
  const [currentTournamentId, setCurrentTournamentId] = useState(null);

  // Player profile system states
  const [currentView, setCurrentView] = useState('tournament'); // 'tournament', 'players', 'h2h'
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showHeadToHead, setShowHeadToHead] = useState(false);
  const [playersLastUpdated, setPlayersLastUpdated] = useState(Date.now());

  // Tier change notifications
  const [tierChangeNotifications, setTierChangeNotifications] = useState([]);

  // Load saved tournaments on mount
  useEffect(() => {
    const saved = localStorage.getItem('padelTournaments');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSavedTournaments(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load tournaments:', e);
      }
    }
  }, []);

  // Run migration once on mount
  useEffect(() => {
    const result = migrateExistingTournaments();
    console.log('Migration result:', result);

    // Run ELO migration
    const eloResult = migrateEloData();
    console.log('ELO migration result:', eloResult);
  }, []);

  // Save tournaments to localStorage whenever they change
  useEffect(() => {
    if (savedTournaments.length > 0) {
      localStorage.setItem('padelTournaments', JSON.stringify(savedTournaments));
    }
  }, [savedTournaments]);

  // Auto-save active tournament state
  useEffect(() => {
    if (gameStarted) {
      const state = {
        players,
        allRounds,
        currentRoundIndex,
        history,
        sitOuts,
        rotationIndex,
        gameStarted,
        sessionEnded,
        currentTournamentId,
        playersLastUpdated
      };
      localStorage.setItem('activeTournamentState', JSON.stringify(state));
    }
  }, [players, allRounds, currentRoundIndex, history, sitOuts, gameStarted, sessionEnded, currentTournamentId, playersLastUpdated]);

  // Restore active tournament state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('activeTournamentState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.gameStarted) {
          setPlayers(state.players);
          setAllRounds(state.allRounds);
          setCurrentRoundIndex(state.currentRoundIndex);
          setHistory(state.history);
          setSitOuts(state.sitOuts);
          setRotationIndex(state.rotationIndex || 0);
          setGameStarted(state.gameStarted);
          setSessionEnded(state.sessionEnded);
          setCurrentTournamentId(state.currentTournamentId);
          if (state.playersLastUpdated) {
            setPlayersLastUpdated(state.playersLastUpdated);
          }
        }
      } catch (e) {
        console.error('Failed to restore tournament state:', e);
      }
    }
  }, []);

  // Refresh protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameStarted && !sessionEnded) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameStarted, sessionEnded]);

  const startTournament = () => {
    if (players.length < 4) return;

    const allCurrentPlayers = getAllPlayers();

    // Clear pairing history for new tournament
    clearPairingHistory();

    // Ensure all quick players are converted to persistent players and capture starting ELO
    const updatedPlayers = players.map(player => {
      let playerObj = player;
      if (player.isQuickPlayer) {
        // Create persistent player
        playerObj = createPlayer(player.name);
      }

      // Capture starting ELO
      const fullPlayer = allCurrentPlayers.find(p => p.id === playerObj.id) || playerObj;
      return {
        ...playerObj,
        startingElo: fullPlayer.elo?.current || 1500
      };
    });

    // Randomize player order for variety in match sequences
    const shuffledPlayers = shuffleArray(updatedPlayers);

    setPlayers(shuffledPlayers);
    setRotationIndex(0);
    setGameStarted(true);
    startNextRound();
  };

  const startNextRound = () => {
    // Calculate max courts
    const courts = Math.floor(players.length / 4);
    const { matches, sitOuts: sitting } = generateRound(players, history, courts, rotationIndex);

    const newRound = {
      roundNumber: allRounds.length + 1,
      matches,
      sitOuts: sitting
    };

    setAllRounds([...allRounds, newRound]);
    setCurrentRoundIndex(allRounds.length);
    setSitOuts(sitting);

    // Advance rotation index by the number of players sitting out
    const sitOutCount = players.length - (courts * 4);
    setRotationIndex((rotationIndex + sitOutCount) % players.length);
  };

  const updateScore = (matchId, teamIndex, score) => {
    const updatedRounds = [...allRounds];
    const round = updatedRounds[currentRoundIndex];

    round.matches = round.matches.map(m => {
      if (m.id === matchId) {
        const newScore = [...m.score];
        newScore[teamIndex] = score;
        return { ...m, score: newScore };
      }
      return m;
    });

    setAllRounds(updatedRounds);
  };

  const finishMatch = (matchId) => {
    const updatedRounds = [...allRounds];
    const round = updatedRounds[currentRoundIndex];
    const match = round.matches.find(m => m.id === matchId);
    if (!match) return;

    // Toggle completion
    let newCompletedState = !match.completed;
    let updatedMatch;

    if (match.skipped) {
      newCompletedState = true;
      updatedMatch = { ...match, completed: true, skipped: false };
    } else {
      updatedMatch = { ...match, completed: newCompletedState };
    }

    round.matches = round.matches.map(m =>
      m.id === matchId ? updatedMatch : m
    );

    setAllRounds(updatedRounds);

    // Update history
    if (newCompletedState) {
      if (history.find(h => h.id === matchId)) {
        setHistory(history.map(h => h.id === matchId ? updatedMatch : h));
      } else {
        setHistory([...history, updatedMatch]);
      }

      // Track tier changes before updating stats
      const allPlayers = getAllPlayers();
      const oldTiers = {};
      updatedMatch.players.forEach(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
          oldTiers[playerId] = getEloTier(player.elo?.current || 1500);
        }
      });

      // Save to match history and update player stats
      const tournamentId = currentTournamentId || Date.now().toString();
      addMatchToHistory(updatedMatch, tournamentId);

      // Update stats for all players in this match
      updatedMatch.players.forEach(playerId => {
        updatePlayerStats(playerId);
      });

      // Check for tier changes after stats update
      const updatedPlayers = getAllPlayers();
      updatedMatch.players.forEach(playerId => {
        const player = updatedPlayers.find(p => p.id === playerId);
        if (player) {
          const newTier = getEloTier(player.elo?.current || 1500);
          if (oldTiers[playerId] && oldTiers[playerId] !== newTier) {
            // Tier changed! Show notification
            setTierChangeNotifications(prev => [...prev, {
              id: Date.now() + Math.random(),
              playerId,
              playerName: player.name,
              oldTier: oldTiers[playerId],
              newTier
            }]);
          }
        }
      });
    } else {
      // If we are un-completing a match, we should probably remove it from history/stats?
      // The current implementation just updates the history state but doesn't "undo" the stats update in playerService.
      // This might be a limitation of the current system, but I'll stick to the requested changes.
      // For skipped matches, we definitely don't want them in history.
      setHistory(history.map(h => h.id === matchId ? updatedMatch : h));
    }
  };

  const skipMatch = (matchId) => {
    const updatedRounds = [...allRounds];
    const round = updatedRounds[currentRoundIndex];
    const match = round.matches.find(m => m.id === matchId);
    if (!match) return;

    // Toggle skipped state
    const newSkippedState = !match.skipped;
    const updatedMatch = {
      ...match,
      skipped: newSkippedState,
      completed: false // Ensure it's not marked as completed if skipped
    };

    round.matches = round.matches.map(m =>
      m.id === matchId ? updatedMatch : m
    );

    setAllRounds(updatedRounds);

    // If we are skipping, ensure it's removed from history if it was somehow there
    if (newSkippedState) {
      setHistory(history.filter(h => h.id !== matchId));
    }
  };

  const goToPreviousRound = () => {
    if (currentRoundIndex > 0) {
      setCurrentRoundIndex(currentRoundIndex - 1);
    }
  };

  const goToNextRound = () => {
    if (currentRoundIndex < allRounds.length - 1) {
      setCurrentRoundIndex(currentRoundIndex + 1);
    }
  };

  const endSession = () => {
    const skippedCount = allRounds.reduce((acc, round) =>
      acc + round.matches.filter(m => m.skipped).length, 0
    );

    if (skippedCount > 0) {
      if (!window.confirm(`You have ${skippedCount} skipped match(es). These will not count towards the standings. Are you sure you want to end the session?`)) {
        return;
      }
    }

    // Capture final ELO for all players
    const allCurrentPlayers = getAllPlayers();
    const finalPlayers = players.map(player => {
      const fullPlayer = allCurrentPlayers.find(p => p.id === player.id);
      return {
        ...player,
        finalElo: fullPlayer?.elo?.current || player.startingElo || 1500
      };
    });

    setPlayers(finalPlayers);
    setSessionEnded(true);
    // Auto-save tournament with updated players
    saveTournament(finalPlayers);
  };

  const saveTournament = (playersToSave = players) => {
    const tournament = {
      id: currentTournamentId || Date.now().toString(),
      date: new Date().toISOString(),
      players: playersToSave,
      rounds: allRounds,
      history,
      sitOuts
    };

    setSavedTournaments(prev => {
      // Remove existing if updating
      const filtered = prev.filter(t => t.id !== tournament.id);
      return [tournament, ...filtered];
    });

    setCurrentTournamentId(tournament.id);
  };

  const closeSummary = () => {
    setShowSummary(false);
    // Keep sessionEnded true so we stay in review mode
  };

  const resetSession = () => {
    localStorage.removeItem('activeTournamentState');
    clearPairingHistory();
    setGameStarted(false);
    setSessionEnded(false);
    setHistory([]);
    setAllRounds([]);
    setCurrentRoundIndex(-1);
    setSitOuts([]);
    setRotationIndex(0);
    setShowSummary(false);
    setCurrentTournamentId(null);
    setPlayers([]);
  };

  const loadTournament = (tournamentId) => {
    const tournament = savedTournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    setPlayers(tournament.players);
    setAllRounds(tournament.rounds);
    setHistory(tournament.history);
    setSitOuts(tournament.sitOuts || []);
    setCurrentRoundIndex(tournament.rounds.length - 1);
    setGameStarted(true);
    setSessionEnded(true);
    setCurrentTournamentId(tournament.id);
    setShowHistory(false);
  };

  const deleteTournament = (tournamentId) => {
    setSavedTournaments(prev => prev.filter(t => t.id !== tournamentId));
    // If we're viewing the deleted tournament, reset
    if (currentTournamentId === tournamentId) {
      resetSession();
    }
  };

  const handleViewProfile = (playerId) => {
    setSelectedProfileId(playerId);
    setShowPlayerProfile(true);
  };

  const handleCloseProfile = () => {
    setShowPlayerProfile(false);
    setSelectedProfileId(null);
    setPlayersLastUpdated(Date.now()); // Refresh players in case of changes
  };

  const handleProfileDeleted = () => {
    setShowPlayerProfile(false);
    setSelectedProfileId(null);
    setShowPlayerManagement(false);
    setPlayersLastUpdated(Date.now()); // Refresh players
  };

  // Get current round data
  const currentRound = allRounds[currentRoundIndex];
  const currentRoundMatches = currentRound?.matches || [];
  const currentSitOuts = currentRound?.sitOuts || [];

  const roundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.completed || m.skipped);

  return (
    <div className="app-container">
      <header>
        <h1>🎾 Techy Americano</h1>

        {!gameStarted && (
          <div className="navigation-tabs">
            <button
              className={`nav-tab ${currentView === 'tournament' ? 'active' : ''}`}
              onClick={() => setCurrentView('tournament')}
            >
              Tournament
            </button>
            <button
              className={`nav-tab ${currentView === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('leaderboard')}
            >
              🏆 Leaderboard
            </button>
            <button
              className={`nav-tab ${currentView === 'players' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('players');
                setShowPlayerManagement(true);
              }}
            >
              Players ({getAllPlayers().length})
            </button>
            <button
              className={`nav-tab ${currentView === 'h2h' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('h2h');
                setShowHeadToHead(true);
              }}
            >
              Head-to-Head
            </button>
          </div>
        )}
      </header>

      <main>
        {!gameStarted ? (
          <>
            {currentView === 'leaderboard' ? (
              <DedicatedLeaderboard onPlayerClick={handleViewProfile} />
            ) : (
              <>
                <PlayerSelector
                  key={playersLastUpdated}
                  selectedPlayers={players}
                  onPlayersChange={setPlayers}
                  onStartTournament={startTournament}
                />
                {savedTournaments.length > 0 && (
                  <div className="history-button-container">
                    <button
                      onClick={() => setShowHistory(true)}
                      className="btn btn-secondary btn-lg"
                    >
                      📜 Tournament History ({savedTournaments.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : sessionEnded ? (
          <div className="tournament-view">
            <div className="session-ended-header">
              <h2>🏆 Tournament Complete</h2>
              <p className="session-subtitle">Review the results below</p>
            </div>

            {allRounds.length > 0 && (
              <div className="round-navigation">
                <button
                  className="nav-btn"
                  onClick={goToPreviousRound}
                  disabled={currentRoundIndex === 0}
                >
                  ← Previous
                </button>
                <div className="round-indicator">
                  Round {currentRound?.roundNumber || 0}
                </div>
                <button
                  className="nav-btn"
                  onClick={goToNextRound}
                  disabled={currentRoundIndex === allRounds.length - 1}
                >
                  Next →
                </button>
              </div>
            )}

            <div className="round-info">
              {currentSitOuts.length > 0 && (
                <div className="sit-outs">
                  <strong>Sitting out:</strong> {currentSitOuts.map(p => p.name).join(', ')}
                </div>
              )}
            </div>

            <div className="matches-grid">
              {currentRoundMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  history={history}
                  allPlayers={getAllPlayers()}
                  onUpdateScore={() => { }} // Read-only in review mode
                  onFinishMatch={() => { }} // Read-only in review mode
                  onPlayerClick={handleViewProfile}
                />
              ))}
            </div>

            <Leaderboard
              players={players}
              history={history}
              allPlayers={getAllPlayers()}
              onPlayerClick={handleViewProfile}
            />

            <div className="controls">
              <button className="btn btn-primary" onClick={() => setShowSummary(true)}>View Summary</button>
              <button className="btn btn-secondary" onClick={resetSession}>New Tournament</button>
            </div>
          </div>
        ) : (
          <div className="tournament-view">
            {allRounds.length > 0 && (
              <div className="round-navigation">
                <button
                  className="nav-btn"
                  onClick={goToPreviousRound}
                  disabled={currentRoundIndex === 0}
                >
                  ← Previous
                </button>
                <div className="round-indicator">
                  Round {currentRound?.roundNumber || 0}
                </div>
                <button
                  className="nav-btn"
                  onClick={goToNextRound}
                  disabled={currentRoundIndex === allRounds.length - 1}
                >
                  Next →
                </button>
              </div>
            )}

            <div className="round-info">
              {currentSitOuts.length > 0 && (
                <div className="sit-outs">
                  <strong>Sitting out:</strong> {currentSitOuts.map(p => p.name).join(', ')}
                </div>
              )}
            </div>

            <div className="matches-grid">
              {currentRoundMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  history={history}
                  allPlayers={getAllPlayers()}
                  onUpdateScore={updateScore}
                  onFinishMatch={finishMatch}
                  onSkipMatch={skipMatch}
                  onPlayerClick={handleViewProfile}
                />
              ))}
            </div>

            {roundComplete && (
              <div className="round-actions">
                <button onClick={startNextRound} className="btn btn-success btn-lg">
                  Start Next Round
                </button>
              </div>
            )}

            <Leaderboard
              players={players}
              history={history}
              allPlayers={getAllPlayers()}
              onPlayerClick={handleViewProfile}
            />

            <div className="controls">
              <button className="btn btn-primary" onClick={endSession}>End Session</button>
              <button className="btn btn-secondary" onClick={resetSession}>Reset Tournament</button>
            </div>
          </div>
        )}

        {showSummary && (
          <SessionSummary
            players={players}
            history={history}
            onClose={closeSummary}
          />
        )}

        {showHistory && (
          <TournamentHistory
            tournaments={savedTournaments}
            onLoadTournament={loadTournament}
            onDeleteTournament={deleteTournament}
            onClose={() => setShowHistory(false)}
            onClearAll={() => {
              if (window.confirm('Are you sure you want to clear all tournament history?')) {
                setSavedTournaments([]);
                localStorage.removeItem('padelTournaments');
              }
            }}
          />
        )}

        {showPlayerManagement && (
          <PlayerManagement
            onViewProfile={handleViewProfile}
            onClose={() => {
              setShowPlayerManagement(false);
              setCurrentView('tournament');
              setPlayersLastUpdated(Date.now()); // Refresh players
            }}
          />
        )}

        {showPlayerProfile && selectedProfileId && (
          <PlayerProfile
            playerId={selectedProfileId}
            onClose={handleCloseProfile}
            onDeleted={handleProfileDeleted}
          />
        )}

        {showHeadToHead && (
          <HeadToHead
            onClose={() => {
              setShowHeadToHead(false);
              setCurrentView('tournament');
            }}
          />
        )}
      </main>

      {/* Tier Change Notifications */}
      <TierChangeNotificationContainer
        notifications={tierChangeNotifications}
        onClose={(id) => {
          setTierChangeNotifications(prev =>
            prev.filter(n => n.id !== id)
          );
        }}
      />
    </div>
  );
}

export default App;
