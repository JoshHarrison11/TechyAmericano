import React, { useState, useRef } from 'react';

const AIMatchReport = ({ players, history, allRounds }) => {
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const completedMatches = (history || []).filter(m => m.completed && !m.skipped);

  if (!completedMatches.length) return null;

  const buildPrompt = () => {
    const playerMap = {};
    (players || []).forEach(p => { playerMap[p.id] = p; });

    const stats = {};
    (players || []).forEach(p => {
      stats[p.id] = {
        name: p.name,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        eloChange: Math.round((p.finalElo ?? p.elo ?? 1500) - (p.startingElo ?? p.elo ?? 1500)),
      };
    });

    completedMatches.forEach(match => {
      const s1 = match.team1Score ?? 0;
      const s2 = match.team2Score ?? 0;
      const t1won = s1 > s2;
      const t2won = s2 > s1;

      (match.team1 || []).forEach(pid => {
        if (!stats[pid]) return;
        if (t1won) stats[pid].wins++;
        else if (t2won) stats[pid].losses++;
        stats[pid].gamesFor += s1;
        stats[pid].gamesAgainst += s2;
      });
      (match.team2 || []).forEach(pid => {
        if (!stats[pid]) return;
        if (t2won) stats[pid].wins++;
        else if (t1won) stats[pid].losses++;
        stats[pid].gamesFor += s2;
        stats[pid].gamesAgainst += s1;
      });
    });

    const getName = id => playerMap[id]?.name ?? id;

    const matchLines = completedMatches.map((m, i) => {
      const t1 = (m.team1 || []).map(getName).join(' & ');
      const t2 = (m.team2 || []).map(getName).join(' & ');
      return `Match ${i + 1}: ${t1} ${m.team1Score ?? 0}-${m.team2Score ?? 0} ${t2}`;
    }).join('\n');

    const playerLines = Object.values(stats)
      .sort((a, b) => b.wins - a.wins || (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst))
      .map(s => {
        const diff = s.eloChange >= 0 ? `+${s.eloChange}` : `${s.eloChange}`;
        return `${s.name}: ${s.wins}W-${s.losses}L | Games ${s.gamesFor}-${s.gamesAgainst} | ELO ${diff}`;
      }).join('\n');

    const motd = completedMatches.reduce((closest, m) => {
      const diff = Math.abs((m.team1Score ?? 0) - (m.team2Score ?? 0));
      const closestDiff = Math.abs((closest.team1Score ?? 0) - (closest.team2Score ?? 0));
      return diff < closestDiff ? m : closest;
    }, completedMatches[0]);
    const motdT1 = (motd.team1 || []).map(getName).join(' & ');
    const motdT2 = (motd.team2 || []).map(getName).join(' & ');

    return `You are a sports journalist writing a post-session match report for a WhatsApp group of padel tennis players. Keep it punchy, fun, and under 350 words. Use banter tone — savage but light-hearted, not mean.

Write a match report with exactly these sections:

## HEADLINE
A dramatic one-liner headline for the session.

## SESSION OVERVIEW
2-3 sentences covering the overall session vibe and standout moments.

## PLAYER RATINGS
Rate each player out of 10 with one savage but fair one-liner based purely on their actual results. Format each line as: **PlayerName** — X/10 — one-liner

## MATCH OF THE DAY
The closest scoreline was ${motdT1} ${motd.team1Score ?? 0}-${motd.team2Score ?? 0} ${motdT2}. Comment on it in 1-2 sentences.

## FINAL VERDICT
One punchy closing sentence summing up the session.

---
SESSION DATA:

Match Results:
${matchLines}

Player Records:
${playerLines}

Total matches played: ${completedMatches.length}`;
  };

  const generate = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_KEY;
    if (!apiKey) {
      setError('VITE_GEMINI_KEY is not set. Add it to your .env file.');
      return;
    }

    setIsGenerating(true);
    setReport('');
    setError('');
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          signal: abortRef.current.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt() }] }],
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        setError(`API error ${res.status}: ${errText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) setReport(prev => prev + text);
          } catch {
            // ignore malformed SSE frames
          }
        }
      }

      setHasGenerated(true);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    let isFirstContentAfterHeadline = false;

    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        const section = line.slice(3).trim();
        isFirstContentAfterHeadline = section === 'HEADLINE';
        return <div key={i} className="ai-report-section-header">{section}</div>;
      }

      if (line.trim() === '') {
        isFirstContentAfterHeadline = false;
        return <div key={i} className="ai-report-spacer" />;
      }

      const isHeadline = isFirstContentAfterHeadline;
      if (isFirstContentAfterHeadline) isFirstContentAfterHeadline = false;

      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="ai-report-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <div key={i} className={isHeadline ? 'ai-report-headline' : 'ai-report-line'}>
          {rendered}
        </div>
      );
    });
  };

  return (
    <div className="ai-match-report-card">
      <div className="ai-report-header">
        <span className="ai-report-label">⚡ AI Match Report</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : hasGenerated ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {isGenerating && !report && (
        <div className="ai-report-loading">
          <span className="ai-loading-dot" />
          <span className="ai-loading-dot" />
          <span className="ai-loading-dot" />
        </div>
      )}

      {error && (
        <div className="ai-report-error">{error}</div>
      )}

      {report && (
        <div className="ai-report-body">
          {renderMarkdown(report)}
          {isGenerating && <span className="ai-cursor">▋</span>}
        </div>
      )}
    </div>
  );
};

export default AIMatchReport;
