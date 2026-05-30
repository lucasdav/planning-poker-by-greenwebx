import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Eye,
  EyeOff,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Trash2,
  LogOut,
} from "lucide-react";

import { supabase } from "./lib/supabase";

const cards = [
  "0",
  "1/2",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
  "☕",
];

type Player = {
  id: string;
  name: string;
  vote: string | null;
  session_id: string;
};

type SessionRecord = {
  id: string;
  name: string;
  revealed: boolean;
};

const DEFAULT_SESSION_NAME = "Sprint Planning";
const LOCAL_PLAYER_KEY = "planning-poker-player-id";
const LOCAL_SESSION_KEY = "planning-poker-session-id";

const getPlayerStorageKey = (sessionId: string) => `${LOCAL_PLAYER_KEY}:${sessionId}`;

export default function App() {
  const [availableSessions, setAvailableSessions] = useState<SessionRecord[]>([]);

  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  const [newSessionName, setNewSessionName] = useState("");

  const [sessionName, setSessionName] = useState(DEFAULT_SESSION_NAME);

  const [playerName, setPlayerName] = useState("");

  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const [activePlayerId, setActivePlayerId] = useState<string>("");

  const [revealed, setRevealed] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    const sessions = (data ?? []) as SessionRecord[];

    setAvailableSessions(sessions);

    if (!sessions.length) {
      setCurrentSessionId("");
      return;
    }

    setCurrentSessionId((current) => {
      if (current && sessions.some((session) => session.id === current)) {
        return current;
      }

      const storedSession = sessionStorage.getItem(LOCAL_SESSION_KEY);

      if (storedSession && sessions.some((session) => session.id === storedSession)) {
        return storedSession;
      }

      return sessions[0].id;
    });
  };

  const loadSession = async (sessionId: string) => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (data) {
      setSessionName(data.name);
      setRevealed(data.revealed);
    }
  };

  const loadPlayers = async (sessionId: string) => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("session_id", sessionId)
      .order("id");

    const sessionPlayers = (data ?? []) as Player[];

    setPlayers(sessionPlayers);

    if (!sessionPlayers.length) {
      setLocalPlayerId(null);
      setActivePlayerId("");
      return;
    }

    const storedLocal = sessionStorage.getItem(getPlayerStorageKey(sessionId));
    const storedPlayerExists = storedLocal
      ? sessionPlayers.some((player) => player.id === storedLocal)
      : false;

    if (storedPlayerExists && storedLocal) {
      setLocalPlayerId(storedLocal);
      setActivePlayerId(storedLocal);
      return;
    }

    setLocalPlayerId(null);

    const preferred =
      sessionPlayers.find((player) => player.id === activePlayerId)?.id ||
      sessionPlayers[0].id;

    setActivePlayerId(preferred);
  };

  const startSession = async (sessionId: string) => {
    if (!sessionId) return;

    sessionStorage.setItem(LOCAL_SESSION_KEY, sessionId);
    setCurrentSessionId(sessionId);

    await loadSession(sessionId);
    await loadPlayers(sessionId);
  };

  const joinSession = async (sessionId: string, name: string) => {
    if (!name.trim()) return;

    const { data } = await supabase
      .from("players")
      .insert({
        name: name.trim(),
        vote: null,
        session_id: sessionId,
      })
      .select()
      .single();

    if (data && data.id) {
      sessionStorage.setItem(getPlayerStorageKey(sessionId), data.id);
      setLocalPlayerId(data.id);
      setActivePlayerId(data.id);
    }

    await loadPlayers(sessionId);

    setPlayerName("");
  };

  const createSession = async () => {
    if (!newSessionName.trim()) return;

    const { data } = await supabase
      .from("sessions")
      .insert({
        name: newSessionName.trim(),
        revealed: false,
      })
      .select()
      .single();

    if (!data?.id) return;

    setNewSessionName("");

    await loadSessions();

    sessionStorage.setItem(LOCAL_SESSION_KEY, data.id);
    await startSession(data.id);

    if (playerName.trim()) {
      await joinSession(data.id, playerName);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!currentSessionId) {
      setLocalPlayerId(null);
      setPlayers([]);
      setSessionName(DEFAULT_SESSION_NAME);
      setRevealed(false);
      setSelectedCard(null);
      setActivePlayerId("");
      return;
    }

    const storedLocal = sessionStorage.getItem(getPlayerStorageKey(currentSessionId));

    if (storedLocal) {
      setLocalPlayerId(storedLocal);
      setActivePlayerId(storedLocal);
    } else {
      setLocalPlayerId(null);
    }

    loadSession(currentSessionId);
    loadPlayers(currentSessionId);

    const playersChannel = supabase
      .channel(`players-realtime-${currentSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${currentSessionId}`,
        },
        async () => {
          await loadPlayers(currentSessionId);
        },
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel(`sessions-realtime-${currentSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${currentSessionId}`,
        },
        async () => {
          await loadSession(currentSessionId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [currentSessionId]);

  const addPlayer = async () => {
    if (!currentSessionId) return;

    await joinSession(currentSessionId, playerName);
  };

  const removePlayer = async (playerId: string) => {
    await supabase.from("players").delete().eq("id", playerId);

    if (currentSessionId) {
      await loadPlayers(currentSessionId);
    }
  };

  const vote = async (card: string) => {
    const targetPlayerId =
      players.find((player) => player.id === activePlayerId)?.id ??
      players[0]?.id;

    if (!targetPlayerId) return;

    setSelectedCard(card);

    await supabase
      .from("players")
      .update({
        vote: card,
      })
      .eq("id", targetPlayerId);

    if (currentSessionId) {
      await loadPlayers(currentSessionId);
    }
  };

  const toggleReveal = async () => {
    if (!currentSessionId) return;

    await supabase
      .from("sessions")
      .update({
        revealed: !revealed,
      })
      .eq("id", currentSessionId);

    await loadSession(currentSessionId);
  };

  const resetVoting = async () => {
    if (!currentSessionId) return;

    setSelectedCard(null);

    await supabase
      .from("players")
      .update({
        vote: null,
      })
      .eq("session_id", currentSessionId);

    await supabase
      .from("sessions")
      .update({
        revealed: false,
      })
      .eq("id", currentSessionId);

    await loadPlayers(currentSessionId);
    await loadSession(currentSessionId);
  };

  const logout = () => {
    if (currentSessionId) {
      sessionStorage.removeItem(getPlayerStorageKey(currentSessionId));
    }

    sessionStorage.removeItem(LOCAL_SESSION_KEY);

    setLocalPlayerId(null);
    setActivePlayerId("");
    setSelectedCard(null);
    setPlayerName("");
    setCurrentSessionId("");
    setSessionName(DEFAULT_SESSION_NAME);
    setRevealed(false);
    setPlayers([]);
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

  if (!localPlayerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-3xl grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="bg-white/10 backdrop-blur border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Users className="w-6 h-6" />
              </div>

              <div>
                <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs font-bold">Entrar</p>
                <h1 className="text-2xl font-black mt-1">{sessionName}</h1>
              </div>
            </div>

            <p className="text-slate-300 mb-6">Escolha uma sessão existente e informe seu nome para entrar na votação.</p>

            <label className="text-sm text-slate-300 block mb-2">Sessão</label>

            <select
              value={currentSessionId}
              onChange={(e) => {
                const nextSessionId = e.target.value;
                sessionStorage.setItem(LOCAL_SESSION_KEY, nextSessionId);
                setCurrentSessionId(nextSessionId);
              }}
              className="w-full bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition mb-5"
            >
              {availableSessions.length ? (
                availableSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))
              ) : (
                <option value="">Nenhuma sessão criada</option>
              )}
            </select>

            <label className="text-sm text-slate-300 block mb-2">Nome</label>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addPlayer();
                  }
                }}
                className="flex-1 min-w-0 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition"
                placeholder="Seu nome"
                autoFocus
              />

              <button
                type="button"
                onClick={addPlayer}
                className="w-full sm:w-auto flex-shrink-0 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold px-5 rounded-2xl transition cursor-pointer"
              >
                Entrar
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <p className="text-emerald-300 uppercase tracking-[0.3em] text-xs font-bold">Criar sessão</p>
                <h2 className="text-2xl font-black mt-1">Nova rodada</h2>
              </div>
            </div>

            <p className="text-slate-300 mb-6">Crie uma nova sessão e entre nela em seguida usando o mesmo nome, se quiser.</p>

            <label className="text-sm text-slate-300 block mb-2">Nome da sessão</label>

            <input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="w-full bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-emerald-400 transition mb-5"
              placeholder="Ex.: Planning da sprint 24"
            />

            <button
              type="button"
              onClick={createSession}
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-5 py-3 rounded-2xl transition cursor-pointer"
            >
              Criar sessão
            </button>
          </div>
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
              Sessão ativa
            </label>

            <div className="flex flex-col gap-3">
              <select
                value={currentSessionId}
                onChange={(e) => {
                  const nextSessionId = e.target.value;
                  sessionStorage.setItem(LOCAL_SESSION_KEY, nextSessionId);
                  setCurrentSessionId(nextSessionId);
                }}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition"
              >
                {availableSessions.length ? (
                  availableSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))
                ) : (
                  <option value="">Nenhuma sessão disponível</option>
                )}
              </select>

              <button
                type="button"
                onClick={logout}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 font-semibold text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-100"
              >
                <LogOut className="w-4 h-4 transition group-hover:-translate-x-0.5" />
                Sair da sessão
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <Users className="w-6 h-6 text-cyan-400" />

                <h2 className="text-2xl font-bold">Participantes</h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Adicionar participante"
                  className="flex-1 min-w-0 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition"
                />

                <button
                  type="button"
                  onClick={addPlayer}
                  className="w-full sm:w-auto flex-shrink-0 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold px-5 rounded-2xl transition cursor-pointer"
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
                        ? "border-cyan-400 ring-1 ring-cyan-400/40"
                        : "border-slate-700 hover:border-slate-500")
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
                            ? "Selecionado para votar"
                            : player.vote
                              ? "Votou"
                              : "Aguardando voto"}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {revealed ? (
                        <div className="w-12 h-16 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
                          {player.vote || "-"}
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
                  onClick={toggleReveal}
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

                  <h3 className="text-3xl font-black mt-2">{revealed ? (average ?? "-") : "-"}</h3>
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
              <h3 className="text-xl font-bold mb-6">Escolha sua estimativa</h3>

              <p className="mb-4 text-sm text-slate-300">
                Votando em:{" "}
                <span className="font-semibold text-cyan-300">
                  {players.find((player) => player.id === activePlayerId)
                    ?.name ?? "Selecione um participante"}
                </span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                {cards.map((card) => {
                  const isSelected = selectedCard === card;

                  const isCoffee = card === "☕";

                  return (
                    <button
                      key={card}
                      onClick={() => vote(card)}
                      className={`
                        h-36 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center font-black text-4xl shadow-xl
                        ${
                          isSelected
                            ? "bg-cyan-400 border-cyan-300 text-slate-950 scale-105"
                            : "bg-slate-900/60 border-slate-700 hover:border-cyan-400 hover:-translate-y-1"
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
          </div>
        </div>
      </div>
      <footer className="mt-8 text-center text-sm text-slate-400">
        desenvolvido por{" "}
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
  );
}
