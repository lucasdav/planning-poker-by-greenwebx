import { useMemo, useState } from 'react';
import {
  Users,
  Eye,
  EyeOff,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

const cards = ['0', '1/2', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

type Player = {
  id: number;
  name: string;
  vote: string | null;
};

export default function App() {
  const [sessionName, setSessionName] = useState('Sprint Planning');
  const [playerName, setPlayerName] = useState('');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<number>(1);
  const [revealed, setRevealed] = useState(false);

  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Lucas', vote: '5' },
  ]);

  const addPlayer = () => {
    if (!playerName.trim()) return;

    const newPlayer: Player = {
      id: Date.now(),
      name: playerName,
      vote: null,
    };

    setPlayers((prev) => [...prev, newPlayer]);
    setPlayerName('');
  };

  const removePlayer = (playerId: number) => {
    setPlayers((prev) => {
      const nextPlayers = prev.filter((player) => player.id !== playerId);

      if (activePlayerId === playerId) {
        setActivePlayerId(nextPlayers[0]?.id ?? 0);
      }

      return nextPlayers;
    });
  };

  const vote = (card: string) => {
    const targetPlayerId =
      players.find((player) => player.id === activePlayerId)?.id ?? players[0]?.id;

    if (!targetPlayerId) return;

    setSelectedCard(card);

    setPlayers((prev) =>
      prev.map((player) => {
        if (player.id === targetPlayerId) {
          return {
            ...player,
            vote: card,
          };
        }

        return player;
      })
    );
  };

  const resetVoting = () => {
    setRevealed(false);
    setSelectedCard(null);

    setPlayers((prev) =>
      prev.map((player) => ({
        ...player,
        vote: null,
      }))
    );
  };

  const average = useMemo(() => {
    const numericVotes = players
      .map((player) => Number(player.vote))
      .filter((vote) => !Number.isNaN(vote));

    if (!numericVotes.length) return null;

    const total = numericVotes.reduce((acc, current) => acc + current, 0);

    return (total / numericVotes.length).toFixed(1);
  }, [players]);

  const votesCompleted = players.filter((player) => player.vote).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Planning Poker
            </h1>
            <p className="text-slate-300 mt-3 text-lg">
              Estime tarefas em equipe de forma rápida e visual.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/10 rounded-3xl p-5 w-full lg:w-[380px] shadow-2xl">
            <label className="text-sm text-slate-300 block mb-2">
              Nome da sessão
            </label>

            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition"
              placeholder="Digite o nome da sprint"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <Users className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold">Participantes</h2>
              </div>

              <div className="flex gap-3 mb-5">
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Adicionar participante"
                  className="flex-1 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition"
                />

                <button
                  onClick={addPlayer}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold px-5 rounded-2xl transition"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={
                      `w-full bg-slate-900/60 border rounded-2xl px-4 py-4 flex items-center justify-between gap-4 transition text-left ` +
                      (activePlayerId === player.id
                        ? 'border-cyan-400 ring-1 ring-cyan-400/40'
                        : 'border-slate-700 hover:border-slate-500')
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setActivePlayerId(player.id)}
                      className="flex-1 text-left"
                    >
                      <div>
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-sm text-slate-400">
                          {activePlayerId === player.id
                            ? 'Selecionado para votar'
                            : player.vote
                              ? 'Votou'
                              : 'Aguardando voto'}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-red-400 hover:text-red-300"
                        aria-label={`Remover participante ${player.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {revealed ? (
                        <div className="w-12 h-16 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
                          {player.vote || '-'}
                        </div>
                      ) : player.vote ? (
                        <div className="w-12 h-16 rounded-xl bg-slate-700 flex items-center justify-center">
                          ✓
                        </div>
                      ) : (
                        <div className="w-12 h-16 rounded-xl border border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                          -
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur shadow-xl">
              <h2 className="text-2xl font-bold mb-5">Controles</h2>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setRevealed((prev) => !prev)}
                  className="flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 transition text-white font-bold py-4 rounded-2xl"
                >
                  {revealed ? (
                    <>
                      <EyeOff className="w-5 h-5" />
                      Ocultar votos
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Revelar votos
                    </>
                  )}
                </button>

                <button
                  onClick={resetVoting}
                  className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 transition text-white font-bold py-4 rounded-2xl"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reiniciar rodada
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
                  <p className="text-slate-400 text-sm">Votos enviados</p>
                  <h3 className="text-3xl font-black mt-2">
                    {votesCompleted}/{players.length}
                  </h3>
                </div>

                <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
                  <p className="text-slate-400 text-sm">Média</p>
                  <h3 className="text-3xl font-black mt-2">
                    {average || '-'}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <p className="text-cyan-400 uppercase tracking-[0.3em] text-sm font-bold">
                  Sessão ativa
                </p>
                <h2 className="text-3xl font-black mt-2">{sessionName}</h2>
              </div>

              <div className="flex items-center gap-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-3 rounded-2xl">
                <CheckCircle2 className="w-5 h-5" />
                Scrum Team Online
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6">
                Escolha sua estimativa
              </h3>

              <p className="mb-4 text-sm text-slate-300">
                Votando em: <span className="font-semibold text-cyan-300">{players.find((player) => player.id === activePlayerId)?.name ?? 'Selecione um participante'}</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                {cards.map((card) => {
                  const isSelected = selectedCard === card;
                  const isCoffee = card === '☕';

                  return (
                    <button
                      key={card}
                      onClick={() => vote(card)}
                      className={`
                        h-36 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center font-black text-4xl shadow-xl
                        ${
                          isSelected
                            ? 'bg-cyan-400 border-cyan-300 text-slate-950 scale-105'
                            : 'bg-slate-900/60 border-slate-700 hover:border-cyan-400 hover:-translate-y-1'
                        }
                      `}
                    >
                      {isCoffee ? (
                        <>
                          <Coffee className="w-10 h-10 mb-2" />
                          <span className="text-lg">Break</span>
                        </>
                      ) : (
                        card
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 bg-slate-900/60 border border-slate-700 rounded-3xl p-6">
              <h3 className="text-2xl font-bold mb-4">Como funciona</h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700">
                  <span className="text-cyan-400 font-black text-3xl">1</span>
                  <p className="mt-3 text-slate-300">
                    Adicione participantes da sprint.
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700">
                  <span className="text-cyan-400 font-black text-3xl">2</span>
                  <p className="mt-3 text-slate-300">
                    Cada pessoa escolhe uma carta para estimar.
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700">
                  <span className="text-cyan-400 font-black text-3xl">3</span>
                  <p className="mt-3 text-slate-300">
                    Revele os votos e alinhe a estimativa final.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-sm text-slate-400">
          desenvolvido por{' '}
          <a
            href="https://green-webx.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-cyan-300 transition hover:text-cyan-200 hover:underline"
          >
            GreenWebX
          </a>
        </footer>
      </div>
    </div>
  );
}
