import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Eye,
  EyeOff,
  RotateCcw,
  CoffeeIcon,
  CheckCircle2,
  LogIn,
  LogOut,
} from "lucide-react";

const cards = ['0', '1/2', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

const SESSION_STORAGE_KEY = 'planning-poker-session';

type Player = {
  id: number;
  name: string;
  vote: string | null;
};

type SessionState = {
  activeUser: string | null;
  votes: Record<string, string | null>;
};

const loadSessionState = (): SessionState => {
  if (typeof window === 'undefined') {
    return {
      activeUser: null,
      votes: {},
    };
  }

  const storedState = sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!storedState) {
    return {
      activeUser: null,
      votes: {},
    };
  }

  try {
    const parsedState = JSON.parse(storedState) as Partial<SessionState>;

    return {
      activeUser:
        typeof parsedState.activeUser === 'string'
          ? parsedState.activeUser
          : null,
      votes: parsedState.votes ?? {},
    };
  } catch {
    return {
      activeUser: null,
      votes: {},
    };
  }
};

const Footer = () => (
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
);

export default function App() {
  const [sessionName, setSessionName] = useState('Sprint Planning');
  const [loginName, setLoginName] = useState('');
  const [sessionState, setSessionState] = useState<SessionState>(loadSessionState);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(sessionState)
    );
  }, [sessionState]);

  const players = useMemo<Player[]>(
    () =>
      Object.entries(sessionState.votes).map(([name, vote], index) => ({
        id: index + 1,
        name,
        vote,
      })),
    [sessionState.votes]
  );

  const currentUser = sessionState.activeUser;
  const currentVote = currentUser ? sessionState.votes[currentUser] ?? null : null;

  const vote = (card: string) => {
    if (!currentUser) return;

    setSessionState((prev) => ({
      ...prev,
      votes: {
        ...prev.votes,
        [prev.activeUser as string]: card,
      },
    }));
  };

  const resetVoting = () => {
    setRevealed(false);

    setSessionState((prev) => ({
      ...prev,
      votes: Object.fromEntries(
        Object.entries(prev.votes).map(([name]) => [name, null])
      ),
    }));
  };

  const login = () => {
    const trimmedName = loginName.trim();

    if (!trimmedName) return;

    setSessionState((prev) => ({
      activeUser: trimmedName,
      votes: {
        ...prev.votes,
        [trimmedName]: prev.votes[trimmedName] ?? null,
      },
    }));

    setLoginName('');
    setRevealed(false);
  };

  const logout = () => {
    setSessionState((prev) => ({
      ...prev,
      activeUser: null,
    }));

    setRevealed(false);
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-md bg-white/10 backdrop-blur border border-white/10 rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <LogIn className="w-6 h-6" />
            </div>

            <div>
              <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs font-bold">
                Planning Poker
              </p>
              <h1 className="text-3xl font-black mt-1">Entrar na sessão</h1>
            </div>
          </div>

          <p className="text-slate-300 mb-6 leading-relaxed">
            Digite apenas seu usuário para acessar a votação. A sessão fica
            salva no navegador enquanto esta aba estiver aberta.
          </p>

          <label className="text-sm text-slate-300 block mb-2">Usuário</label>

          <div className="flex gap-3">
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  login();
                }
              }}
              className="flex-1 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition"
              placeholder="Seu nome"
              autoFocus
            />

            <button
              onClick={login}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-5 rounded-2xl transition flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Entrar
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-slate-400 text-sm">Sessão atual</p>
            <h2 className="text-xl font-bold mt-1">{sessionName}</h2>
          </div>

          <Footer />
        </div>
      </div>
    );
  }

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

              <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
                <div>
                  <p className="text-slate-400 text-sm">Usuário logado</p>
                  <p className="font-semibold">{currentUser}</p>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>

              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-slate-400">
                        {player.vote ? 'Votou' : 'Aguardando voto'}
                      </p>
                    </div>

                    <div>
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                {cards.map((card) => {
                  const isSelected = currentVote === card;
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
                          <CoffeeIcon className="w-10 h-10 mb-2" />
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

        <Footer />
      </div>
    </div>
  );
}
