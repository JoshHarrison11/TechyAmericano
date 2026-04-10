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
        eloChange: Math.round((p.finalElo ?? p.elo?.current ?? 1500) - (p.startingElo ?? p.elo?.current ?? 1500)),
      };
    });

    completedMatches.forEach(match => {
      const s1 = match.score?.[0] ?? 0;
      const s2 = match.score?.[1] ?? 0;
      const t1won = s1 > s2;
      const t2won = s2 > s1;

      (match.teams?.[0] || []).forEach(pid => {
        if (!stats[pid]) return;
        if (t1won) stats[pid].wins++;
        else if (t2won) stats[pid].losses++;
        stats[pid].gamesFor += s1;
        stats[pid].gamesAgainst += s2;
      });
      (match.teams?.[1] || []).forEach(pid => {
        if (!stats[pid]) return;
        if (t2won) stats[pid].wins++;
        else if (t1won) stats[pid].losses++;
        stats[pid].gamesFor += s2;
        stats[pid].gamesAgainst += s1;
      });
    });

    const getName = id => playerMap[id]?.name ?? id;

    const matchLines = completedMatches.map((m, i) => {
      const t1 = (m.teams?.[0] || []).map(getName).join(' & ');
      const t2 = (m.teams?.[1] || []).map(getName).join(' & ');
      return `Match ${i + 1}: ${t1} ${m.score?.[0] ?? 0}-${m.score?.[1] ?? 0} ${t2}`;
    }).join('\n');

    const playerLines = Object.values(stats)
      .sort((a, b) => b.wins - a.wins || (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst))
      .map(s => {
        const diff = s.eloChange >= 0 ? `+${s.eloChange}` : `${s.eloChange}`;
        return `${s.name}: ${s.wins}W-${s.losses}L | Games ${s.gamesFor}-${s.gamesAgainst} | ELO ${diff}`;
      }).join('\n');

    const motd = completedMatches.reduce((closest, m) => {
      const diff = Math.abs((m.score?.[0] ?? 0) - (m.score?.[1] ?? 0));
      const closestDiff = Math.abs((closest.score?.[0] ?? 0) - (closest.score?.[1] ?? 0));
      return diff < closestDiff ? m : closest;
    }, completedMatches[0]);
    const motdT1 = (motd.teams?.[0] || []).map(getName).join(' & ');
    const motdT2 = (motd.teams?.[1] || []).map(getName).join(' & ');

    return `You are a foul-mouthed, brutally honest padel pundit writing a post-session match report for a WhatsApp group. Think Roy Keane doing commentary after six pints. You are allowed — encouraged — to swear. Be genuinely savage about bad performances. If someone absolutely dominated, go completely over the top with the praise — treat them like they just won the World Cup single-handedly. Keep it under 350 words and make it actually funny, not just rude.

Rules:
- Swearing is fine, encouraged even. Don't hold back.
- Bad players get roasted. Hard. Base every insult on their actual stats — make it specific and sting.
- Dominant players get absurdly over-the-top hero worship. Compare them to legends. It should be embarrassingly complimentary.
- Average players get mediocre energy — damn them with faint praise or mild disappointment.
- ELO changes matter: losing ELO is shameful, gaining a lot is glorious.
- Tone: angry football pundit meets group chat chaos. Funny above all else.

Write a report with exactly these sections:

## HEADLINE
One gloriously dramatic headline. Make it feel like a tabloid front page.

## SESSION OVERVIEW
2-3 sentences. Set the scene. Spare no feelings.

## PLAYER RATINGS
Rate each player out of 10 based purely on their actual results below. One brutal or glorious one-liner each — no filler, make every word count. Format: **PlayerName** — X/10 — one-liner

## MATCH OF THE DAY
The closest match was ${motdT1} ${motd.score?.[0] ?? 0}-${motd.score?.[1] ?? 0} ${motdT2}. Comment on it in 1-2 sentences.

## FINAL VERDICT
One last gut-punch of a closing line.

---
SESSION DATA:

Match Results:
${matchLines}

Player Records (W-L | Games For-Against | ELO change):
${playerLines}

Total matches: ${completedMatches.length}`;
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

    const prompt = buildPrompt();

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          signal: abortRef.current.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
