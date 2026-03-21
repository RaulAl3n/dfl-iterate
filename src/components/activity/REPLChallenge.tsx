import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { Activity } from '@/types';
import { ActivityGameCard } from '@/components/game';
import { ActivityType } from '@/enums';


interface TerminalCommand {
  command: string;
  description: string;
  output?: string;
  validation?: 'exact' | 'contains' | 'regex';
}

interface REPLChallengeActivity extends Activity {
  type: typeof ActivityType.REPL_CHALLENGE;
  commands: TerminalCommand[];
  initialPrompt?: string;
}

interface REPLChallengeProps {
  activity: Activity;
  onSubmit: (commands: string[]) => void;
}

type LineType = 'prompt' | 'output' | 'error' | 'success' | 'info';

interface TerminalLine {
  id: string;
  type: LineType;
  content: string;
}


function validateCommand(input: string, expected: TerminalCommand): boolean {
  const mode = expected.validation ?? 'exact';
  const trimmed = input.trim();

  if (mode === 'exact') return trimmed === expected.command;
  if (mode === 'contains') return trimmed.includes(expected.command);
  if (mode === 'regex') {
    try {
      return new RegExp(expected.command).test(trimmed);
    } catch {
      return false;
    }
  }
  return false;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}


export function REPLChallenge({ activity, onSubmit }: REPLChallengeProps) {
  const act = activity as REPLChallengeActivity;
  const commands = act.commands ?? [];
  const prompt = act.initialPrompt ?? '$ ';

  const [lines, setLines] = useState<TerminalLine[]>([
    { id: uid(), type: 'info', content: '─── Bem-vindo ao terminal de prática ───' },
    { id: uid(), type: 'info', content: `Siga as instruções e execute os comandos corretos.` },
    { id: uid(), type: 'info', content: '' },
  ]);

  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [completedCommands, setCompletedCommands] = useState<string[]>([]);
  const [stepStatus, setStepStatus] = useState<('idle' | 'success' | 'error')[]>(
    () => commands.map(() => 'idle')
  );
  const [done, setDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const focusInput = useCallback(() => {
    if (!done) inputRef.current?.focus();
  }, [done]);

  const addLine = useCallback((type: LineType, content: string) => {
    setLines(prev => [...prev, { id: uid(), type, content }]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || done) return;

    const trimmed = input.trim();

    addLine('prompt', `${prompt}${trimmed}`);

    setHistory(prev => [trimmed, ...prev]);
    setHistoryIndex(-1);
    setInput('');

    if (currentStep >= commands.length) return;

    const expected = commands[currentStep];
    const isValid = validateCommand(trimmed, expected);

    if (isValid) {
      if (expected.output) {
        expected.output.split('\n').forEach(line => addLine('output', line));
      }
      addLine('success', `✓ Correto!`);

      const newCompleted = [...completedCommands, trimmed];
      setCompletedCommands(newCompleted);

      setStepStatus(prev => {
        const next = [...prev];
        next[currentStep] = 'success';
        return next;
      });

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      if (nextStep >= commands.length) {
        addLine('info', '');
        addLine('success', '🎉 Todos os comandos executados com sucesso!');
        setDone(true);
        setTimeout(() => onSubmit(newCompleted), 800);
      } else {
        addLine('info', '');
      }
    } else {
      addLine('error', `✗ Comando incorreto. Tente novamente.`);
      addLine('info', `  Dica: verifique a sintaxe de "${expected.command}"`);

      setStepStatus(prev => {
        const next = [...prev];
        next[currentStep] = 'error';
        return next;
      });

      setTimeout(() => {
        setStepStatus(prev => {
          const next = [...prev];
          next[currentStep] = 'idle';
          return next;
        });
      }, 1200);
    }
  }, [input, done, currentStep, commands, completedCommands, addLine, onSubmit, prompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex < 0) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
      return;
    }
  }, [handleSubmit, historyIndex, history]);

  const handleReset = () => {
    setLines([
      { id: uid(), type: 'info', content: '─── Terminal reiniciado ───' },
      { id: uid(), type: 'info', content: '' },
    ]);
    setInput('');
    setCurrentStep(0);
    setCompletedCommands([]);
    setStepStatus(commands.map(() => 'idle'));
    setDone(false);
    setHistory([]);
    setHistoryIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const lineColor: Record<LineType, string> = {
    prompt: 'text-green-400',
    output: 'text-gray-300',
    error: 'text-red-400',
    success: 'text-emerald-400',
    info: 'text-gray-500',
  };

  const stepIcon = (status: 'idle' | 'success' | 'error', index: number) => {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    if (index === currentStep) return <ChevronRight className="w-4 h-4 text-green-400 shrink-0 animate-pulse" />;
    return <span className="w-4 h-4 rounded-full border border-gray-600 shrink-0 inline-block" />;
  };

  return (
    <ActivityGameCard
      type={ActivityType.REPL_CHALLENGE}
      title={activity.title}
      question={activity.objective || 'Execute os comandos corretos no terminal.'}
      actions={
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reiniciar
        </button>
      }
    >
      <div className="flex gap-4 h-full overflow-hidden">
        {/* ── Left: Instructions panel ── */}
        <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Instructions */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Instruções</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {activity.instructions}
            </p>
          </div>

          {/* Command Steps */}
          <div className="rounded-xl border border-border bg-card p-4 flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Progresso ({Math.min(currentStep, commands.length)}/{commands.length})
            </p>
            <div className="flex flex-col gap-3">
              {commands.map((cmd, i) => (
                <motion.div
                  key={i}
                  className={`flex gap-2 items-start transition-opacity ${
                    i > currentStep ? 'opacity-30' : 'opacity-100'
                  }`}
                  animate={stepStatus[i] === 'error' ? { x: [0, -4, 4, -4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mt-0.5">{stepIcon(stepStatus[i], i)}</div>
                  <div className="min-w-0">
                    <code className={`text-xs font-mono block truncate ${
                      stepStatus[i] === 'success' ? 'text-emerald-400' :
                      i === currentStep ? 'text-green-300' : 'text-gray-400'
                    }`}>
                      {cmd.command}
                    </code>
                    <span className="text-xs text-muted-foreground leading-tight block mt-0.5">
                      {cmd.description}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Terminal ── */}
        <div
          className="flex-1 flex flex-col rounded-xl overflow-hidden border border-gray-700 cursor-text"
          onClick={focusInput}
          style={{ background: '#0d1117' }}
        >
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700/60"
            style={{ background: '#161b22' }}>
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Terminal className="w-3 h-3" />
                <span className="font-mono">bash</span>
              </div>
            </div>
          </div>

          {/* Terminal output */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-6"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
          >
            <AnimatePresence initial={false}>
              {lines.map(line => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`${lineColor[line.type]} whitespace-pre-wrap break-all`}
                >
                  {line.content || '\u00A0'}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Active input line */}
            {!done && (
              <div className="flex items-center gap-0 text-green-400">
                <span className="shrink-0">{prompt}</span>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full bg-transparent outline-none text-green-400 caret-green-400 font-mono"
                    style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                    }}
                  />
                </div>
              </div>
            )}

            {done && (
              <div className="text-green-400 mt-1 animate-pulse">{prompt}▋</div>
            )}
          </div>
        </div>
      </div>
    </ActivityGameCard>
  );
}
