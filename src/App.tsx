/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  RotateCcw, 
  Play, 
  Pause, 
  Settings2, 
  ChevronLeft,
  Zap,
  BrainCircuit,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameMode, Position, BlockData, GridData } from './types';
import { getGameTips } from './services/geminiService';

const ROWS = 10;
const COLS = 6;
const INITIAL_ROWS = 4;
const TARGET_MIN = 10;
const TARGET_MAX = 30;
const TIME_LIMIT = 15; // Seconds for time mode

const generateId = () => Math.random().toString(36).substr(2, 9);

const VALUE_COLORS: Record<number, string> = {
  1: '#3b82f6', // blue
  2: '#10b981', // emerald
  3: '#ef4444', // red
  4: '#f59e0b', // amber
  5: '#8b5cf6', // violet
  6: '#ec4899', // pink
  7: '#06b6d4', // cyan
  8: '#f97316', // orange
  9: '#6366f1', // indigo
};

const createRandomBlock = (): BlockData => ({
  id: generateId(),
  value: Math.floor(Math.random() * 9) + 1,
});

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [mode, setMode] = useState<GameMode>('classic');
  const [grid, setGrid] = useState<GridData>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<Position[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);
  const [tip, setTip] = useState<string>("");
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  const initGame = useCallback((selectedMode: GameMode) => {
    const newGrid: GridData = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    
    // Fill bottom rows
    for (let r = ROWS - 1; r >= ROWS - INITIAL_ROWS; r--) {
      for (let c = 0; c < COLS; c++) {
        newGrid[r][c] = createRandomBlock();
      }
    }

    setGrid(newGrid);
    setTarget(Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN);
    setScore(0);
    setSelected([]);
    setMode(selectedMode);
    setTimeLeft(TIME_LIMIT);
    setGameState('playing');
    setIsPaused(false);
    
    fetchTip(0, selectedMode);
  }, []);

  const fetchTip = async (s: number, m: string) => {
    const newTip = await getGameTips(s, m);
    setTip(newTip || "");
  };

  // Add a new row at the bottom
  const addRow = useCallback(() => {
    setGrid(prev => {
      // Check for game over (if top row has any block)
      if (prev[0].some(cell => cell !== null)) {
        setGameState('gameover');
        return prev;
      }

      const newGrid = [...prev.map(row => [...row])];
      // Shift everything up
      for (let r = 0; r < ROWS - 1; r++) {
        newGrid[r] = [...newGrid[r + 1]];
      }
      // New row at bottom
      newGrid[ROWS - 1] = Array(COLS).fill(null).map(() => createRandomBlock());
      
      return newGrid;
    });
  }, []);

  // Timer logic for Time Mode
  useEffect(() => {
    if (gameState === 'playing' && mode === 'time' && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, mode, isPaused, addRow]);

  const handleBlockClick = (row: number, col: number) => {
    if (gameState !== 'playing' || isPaused) return;
    const block = grid[row][col];
    if (!block) return;

    const isAlreadySelected = selected.some(p => p.row === row && p.col === col);
    let newSelected: Position[];

    if (isAlreadySelected) {
      newSelected = selected.filter(p => !(p.row === row && p.col === col));
    } else {
      newSelected = [...selected, { row, col }];
    }

    const currentSum = newSelected.reduce((sum, p) => sum + (grid[p.row][p.col]?.value || 0), 0);

    if (currentSum === target) {
      // Success!
      handleSuccess(newSelected);
    } else if (currentSum > target) {
      // Failed - reset selection
      setSelected([]);
    } else {
      setSelected(newSelected);
    }
  };

  const handleSuccess = (positions: Position[]) => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#34d399', '#6ee7b7']
    });

    setScore(prev => {
      const newScore = prev + target;
      if (newScore > highScore) setHighScore(newScore);
      return newScore;
    });

    setGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      // Remove blocks
      positions.forEach(p => {
        newGrid[p.row][p.col] = null;
      });

      // Gravity: blocks fall down
      for (let c = 0; c < COLS; c++) {
        let emptyRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (newGrid[r][c] !== null) {
            const temp = newGrid[r][c];
            newGrid[r][c] = null;
            newGrid[emptyRow][c] = temp;
            emptyRow--;
          }
        }
      }
      return newGrid;
    });

    setSelected([]);
    setTarget(Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN);
    
    if (mode === 'classic') {
      addRow();
    } else {
      setTimeLeft(TIME_LIMIT);
    }

    // Occasionally update tips
    if (Math.random() > 0.7) {
      fetchTip(score + target, mode);
    }
  };

  const currentSum = selected.reduce((sum, p) => sum + (grid[p.row][p.col]?.value || 0), 0);

  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6 font-sans text-[#141414]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-[#141414] rounded-2xl shadow-xl">
                <BrainCircuit className="w-12 h-12 text-[#E4E3E0]" />
              </div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic">SumStack</h1>
            <p className="text-sm font-medium opacity-60 uppercase tracking-widest">终极数学挑战</p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => initGame('classic')}
              className="group relative overflow-hidden bg-[#141414] text-[#E4E3E0] p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between"
            >
              <div className="text-left">
                <h3 className="text-xl font-bold uppercase">经典模式</h3>
                <p className="text-xs opacity-60">每次成功消除后新增一行。挑战生存极限。</p>
              </div>
              <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </button>

            <button 
              onClick={() => initGame('time')}
              className="group relative overflow-hidden border-2 border-[#141414] p-6 rounded-2xl transition-all hover:bg-[#141414] hover:text-[#E4E3E0] active:scale-95 flex items-center justify-between"
            >
              <div className="text-left">
                <h3 className="text-xl font-bold uppercase">计时模式</h3>
                <p className="text-xs opacity-60">与时间赛跑。倒计时结束未完成则强制新增一行。</p>
              </div>
              <Clock className="w-6 h-6 group-hover:animate-pulse" />
            </button>
          </div>

          <div className="pt-8 border-t border-[#141414]/10">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">游戏规则</p>
            <p className="text-sm mt-2 opacity-70">点击数字使其相加等于目标数字。别让方块堆到顶部！</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] font-sans text-[#141414] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-[#141414] flex items-center justify-between bg-[#E4E3E0] z-10">
        <button 
          onClick={() => setGameState('start')}
          className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">目标数字</span>
          <span className="text-4xl font-black italic">{target}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">得分</span>
            <p className="text-xl font-black">{score}</p>
          </div>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 border border-[#141414] rounded-lg hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Game Area */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4">
        {/* Progress Bars */}
        <div className="w-full max-w-sm mb-4 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">当前总和: {currentSum}</span>
            {mode === 'time' && (
              <span className={`text-[10px] font-bold uppercase tracking-widest ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'opacity-50'}`}>
                剩余时间: {timeLeft}s
              </span>
            )}
          </div>
          <div className="h-1 bg-[#141414]/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#141414]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentSum / target) * 100}%` }}
            />
          </div>
          {mode === 'time' && (
            <div className="h-1 bg-[#141414]/10 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-[#141414]'}`}
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          )}
        </div>

        {/* Grid Container */}
        <div className="relative bg-[#141414]/5 p-2 rounded-xl border border-[#141414]/10 shadow-inner">
          <div 
            className="grid gap-1"
            style={{ 
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              width: 'min(90vw, 360px)',
              aspectRatio: `${COLS}/${ROWS}`
            }}
          >
            {grid.map((row, r) => (
              row.map((block, c) => {
                const isSelected = selected.some(p => p.row === r && p.col === c);
                const isDanger = r === 0 && block !== null;
                const blockColor = block ? VALUE_COLORS[block.value] : '#FFFFFF';
                
                return (
                  <div 
                    key={block?.id || `empty-${r}-${c}`}
                    className="relative aspect-square"
                  >
                    <AnimatePresence mode="popLayout">
                      {block && (
                        <motion.button
                          layoutId={block.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            scale: 1, 
                            opacity: 1,
                            backgroundColor: isSelected ? '#141414' : blockColor,
                            color: isSelected ? blockColor : '#FFFFFF',
                            borderColor: isDanger ? '#ef4444' : (isSelected ? blockColor : 'transparent'),
                            boxShadow: isSelected ? `0 0 15px ${blockColor}44` : 'none'
                          }}
                          exit={{ scale: 1.5, opacity: 0 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleBlockClick(r, c)}
                          className={`
                            w-full h-full rounded-lg border-2 flex items-center justify-center
                            text-xl font-black transition-colors shadow-sm
                            ${isDanger ? 'animate-bounce border-red-500 z-10' : 'border-transparent'}
                          `}
                        >
                          {block.value}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ))}
          </div>

          {/* Pause Overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#E4E3E0]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-xl"
              >
                <h2 className="text-3xl font-black uppercase italic mb-4">游戏暂停</h2>
                <button 
                  onClick={() => setIsPaused(false)}
                  className="bg-[#141414] text-[#E4E3E0] px-8 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <Play className="w-5 h-5" /> 继续游戏
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Tip */}
        <div className="mt-6 max-w-sm w-full bg-white/50 p-4 rounded-xl border border-[#141414]/5 flex gap-3 items-start">
          <BrainCircuit className="w-5 h-5 mt-0.5 opacity-40 shrink-0" />
          <p className="text-xs italic opacity-60 leading-relaxed">
            {tip || "将数字相加以达到目标！"}
          </p>
        </div>
      </main>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#141414]/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#E4E3E0] max-w-sm w-full rounded-3xl p-8 text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="p-4 bg-red-500 rounded-2xl shadow-lg">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <div>
                <h2 className="text-4xl font-black uppercase italic">游戏结束</h2>
                <p className="text-sm opacity-60 uppercase tracking-widest mt-1">方块已触顶</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#141414]/10">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-40">最终得分</p>
                  <p className="text-2xl font-black">{score}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-40">最高得分</p>
                  <p className="text-2xl font-black">{highScore}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => initGame(mode)}
                  className="w-full bg-[#141414] text-[#E4E3E0] py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-5 h-5" /> 再试一次
                </button>
                <button 
                  onClick={() => setGameState('start')}
                  className="w-full border-2 border-[#141414] py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Stats */}
      <footer className="p-4 border-t border-[#141414]/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
        <span>模式: {mode === 'classic' ? '经典' : '计时'}</span>
        <span>最高分: {highScore}</span>
      </footer>
    </div>
  );
}
