import React, { useMemo, useState } from 'react';
import '../styles/eliteHud.css';

import { GutoAvatarController } from './guto/guto-avatar-controller';
import type { EvolutionStage } from '@/types/contract';
import type { GutoAvatarEmotion } from '@/lib/guto-vital-state';

const stages = [
  { id: 'baby', label: 'Baby', evolution: 'baby' },
  { id: 'teen', label: 'Teen', evolution: 'teen' },
  { id: 'adult', label: 'Adult', evolution: 'adult' },
  { id: 'elite', label: 'Elite', evolution: 'elite' },
] as const;

const rotatingPanels = ['Caminho', 'Evolução', 'Missões', 'Chat'] as const;
const moods: Array<{ id: GutoAvatarEmotion; label: string }> = [
  { id: 'default', label: 'Default' },
  { id: 'alert', label: 'Alert' },
  { id: 'critical', label: 'Critical' },
  { id: 'reward', label: 'Reward' },
];

const useTechTypewriter = (message: string, speedMs = 28) => {
  const [display, setDisplay] = React.useState('');

  React.useEffect(() => {
    let frame = 0;
    const charset = '01#@<>/_-';
    const timer = setInterval(() => {
      frame += 1;
      const targetLength = Math.min(message.length, frame);

      const scrambled = message
        .slice(0, targetLength)
        .split('')
        .map((char, i) => {
          if (i < frame - 2) return char;
          if (char === ' ') return ' ';
          return charset[Math.floor(Math.random() * charset.length)];
        })
        .join('');

      setDisplay(scrambled);
      if (targetLength >= message.length) {
        clearInterval(timer);
        setDisplay(message);
      }
    }, speedMs);

    return () => clearInterval(timer);
  }, [message, speedMs]);

  return display;
};

const EliteHudExperience: React.FC = () => {
  const [stage, setStage] = useState<(typeof stages)[number]['id']>('baby');
  const [panelIndex, setPanelIndex] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [mood, setMood] = useState<GutoAvatarEmotion>('default');

  const currentStage = useMemo(() => stages.find((s) => s.id === stage) ?? stages[0], [stage]);
  const currentEvolution = currentStage.evolution as EvolutionStage;

  const techMessage = useTechTypewriter(
    isCharging
      ? '⚡ Sincronizando cápsula... energia neural em 92%...'
      : 'Sistema GUTO Elite online. Sem distrações. Foco em alta performance.',
  );

  const activePanel = rotatingPanels[panelIndex];

  return (
    <section className="elite-hud-shell mb-10" aria-label="Prévia Comando de Elite">
      <div className="elite-hud-bg" />

      <header className="elite-hud-header">
        <p className="elite-kicker">Comando de Elite • Preview técnico</p>
        <h2>HUD Anime-Tech com WebM transparente</h2>
      </header>

      <div className={`capsule-stage ${isCharging ? 'charging' : ''}`}>
        <div className="capsule-light" />
        <div className="glass-ring top" />
        <div className="glass-ring bottom" />

        <GutoAvatarController
          key={`${currentStage.id}-${mood}`}
          stage={currentEvolution}
          size="xl"
          showPlatform={false}
          className="guto-video"
          interactive={false}
        />

        <div className="hud-overlay">
          <span className="hud-chip">FPS target: 60</span>
          <span className="hud-chip">Painel: {activePanel}</span>
          <span className="hud-chip">Stage: {currentStage.label}</span>
          <span className="hud-chip">Emotion: {moods.find((item) => item.id === mood)?.label}</span>
        </div>
      </div>

      <div className="hud-panels">
        <div className="glass-panel tech-message">{techMessage}</div>
        <div className="glass-panel controls">
          <div className="stage-picker" role="tablist" aria-label="Evoluções">
            {stages.map((item) => (
              <button
                key={item.id}
                className={item.id === stage ? 'active' : ''}
                onClick={() => setStage(item.id)}
                role="tab"
                aria-selected={item.id === stage}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="stage-picker" role="tablist" aria-label="Emoções do avatar">
            {moods.map((item) => (
              <button
                key={item.id}
                className={item.id === mood ? 'active' : ''}
                onClick={() => setMood(item.id)}
                role="tab"
                aria-selected={item.id === mood}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="interaction-row">
            <button
              className={`charge-button ${isCharging ? 'active' : ''}`}
              onMouseDown={() => setIsCharging(true)}
              onMouseUp={() => setIsCharging(false)}
              onMouseLeave={() => setIsCharging(false)}
              onTouchStart={() => setIsCharging(true)}
              onTouchEnd={() => setIsCharging(false)}
            >
              Segurar para energizar cápsula
            </button>
            <button className="panel-button" onClick={() => setPanelIndex((idx) => (idx + 1) % rotatingPanels.length)}>
              Girar painel holográfico
            </button>
          </div>

          <p className="hint">
            Dica: coloque seus WebM em <code>/public/assets/guto</code> com os nomes mostrados para ver a animação real com
            alpha.
          </p>
        </div>
      </div>
    </section>
  );
};

export default EliteHudExperience;
