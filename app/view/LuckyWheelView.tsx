'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';

interface Segment {
  id: number;
  label: string;
  text: string;
  color: string;
  textColor: string;
  weight: number;
}

interface WheelConfig {
  title: string;
  segmentsRaw: string;
  resultSequence: string;
  isAdvancedMode: boolean;
}

interface HistoryItem {
  title: string;
  segmentsRaw: string;
}

const INITIAL_SEGMENTS_TEXT = [
  'Tặng túi xách',
  'Váy áo mới',
  'Giày cao gót',
  'Dây chuyền',
  'Móc khóa đáng yêu',
  'Ốp lưng điện thoại',
  'Đồng hồ',
  'Gấu bông',
  'Hoa',
  'Khăn choàng',
];

const COLORS = [
  { bg: '#fac400', text: '#0a1e5e' }, // Lighter Gold/Yellow
  { bg: '#ffdc81', text: '#0a1e5e' }, // Lightest Cream/Yellow
];

const HISTORY_PRESETS: HistoryItem[] = [
  { title: 'Sáng nay ăn gì?', segmentsRaw: 'Phở\nBún chả\nCơm tấm\nBánh mì' },
  { title: 'Chọn màu áo', segmentsRaw: 'Đỏ\nXanh\nVàng\nTím\nTrắng' },
  { title: 'Đặt tên con trai', segmentsRaw: 'Gia Bảo\nMinh Triết\nAnh Thái' },
  { title: 'Đặt tên con gái', segmentsRaw: 'Tuệ Nhi\nBảo Anh\nKhánh Huyền' },
  { title: 'Lì xì năm mới', segmentsRaw: '500K\n200K\n100K\n50K\n10K' },
  { title: 'Tặng voucher', segmentsRaw: '18% Học phí\nBuffet 200K\nVé xem phim' },
  { title: 'Tặng quà gì cho bạn gái?', segmentsRaw: INITIAL_SEGMENTS_TEXT.join('\n') },
];

const LuckyWheelView: React.FC = () => {
  const [wheelTitle, setWheelTitle] = useState<string>('TẶNG QUÀ GÌ CHO BẠN GÁI?');
  const [segmentsRaw, setSegmentsRaw] = useState<string>(INITIAL_SEGMENTS_TEXT.join('\n'));
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [resultSequence, setResultSequence] = useState<string>('');
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sequence'>('config');

  // Spin states
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<Segment | null>(null);

  // Derived state for segments based on raw text
  const segments = useMemo<Segment[]>(() => {
    return segmentsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line, idx) => {
        const parts = line.split('|');
        const label = parts[0].trim();
        const weight = parts[1] ? parseFloat(parts[1].trim()) || 1 : 1;
        return {
          id: idx,
          label,
          text: '',
          color: COLORS[idx % COLORS.length].bg,
          textColor: COLORS[idx % COLORS.length].text,
          weight,
        };
      });
  }, [segmentsRaw]);

  // Load from localStorage on mount
  useEffect(() => {
    const loadConfig = () => {
      const savedConfig = localStorage.getItem('lucky_wheel_config');
      const savedHistory = localStorage.getItem('lucky_wheel_history');

      if (savedConfig) {
        try {
          const config: WheelConfig = JSON.parse(savedConfig);
          setWheelTitle(config.title);
          setSegmentsRaw(config.segmentsRaw);
          if (config.resultSequence) setResultSequence(config.resultSequence);
          if (config.isAdvancedMode !== undefined) setIsAdvancedMode(config.isAdvancedMode);
        } catch (e) {
          console.error('Failed to parse saved config', e);
        }
      }

      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse saved history', e);
        }
      } else {
        setHistory(HISTORY_PRESETS);
      }
    };

    const timer = setTimeout(loadConfig, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdatePersistence = useCallback(() => {
    const config: WheelConfig = { title: wheelTitle, segmentsRaw, resultSequence, isAdvancedMode };
    localStorage.setItem('lucky_wheel_config', JSON.stringify(config));

    setHistory((prev) => {
      const exists = prev.some((item) => item.title === wheelTitle);
      if (!exists) {
        const newHistory = [config, ...prev].slice(0, 10);
        localStorage.setItem('lucky_wheel_history', JSON.stringify(newHistory));
        return newHistory;
      }
      return prev;
    });

    setIsSidebarOpen(false);
  }, [wheelTitle, segmentsRaw, resultSequence, isAdvancedMode]);

  const handleReset = useCallback(() => {
    setWheelTitle('TẶNG QUÀ GÌ CHO BẠN GÁI?');
    setSegmentsRaw(INITIAL_SEGMENTS_TEXT.join('\n'));
    setRotation(0);
    setWinner(null);
  }, []);

  const loadPreset = useCallback((preset: HistoryItem) => {
    setWheelTitle(preset.title);
    setSegmentsRaw(preset.segmentsRaw);
    setRotation(0);
    setWinner(null);
  }, []);

  const handleShuffle = useCallback(() => {
    const lines = segmentsRaw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '');
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    setSegmentsRaw(lines.join('\n'));
  }, [segmentsRaw]);

  const handleSort = useCallback(
    (order: 'asc' | 'desc') => {
      const lines = segmentsRaw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '');
      lines.sort((a, b) => {
        const labelA = a.split('|')[0].trim().toLowerCase();
        const labelB = b.split('|')[0].trim().toLowerCase();
        return order === 'asc' ? labelA.localeCompare(labelB) : labelB.localeCompare(labelA);
      });
      setSegmentsRaw(lines.join('\n'));
    },
    [segmentsRaw]
  );

  const addToSequence = useCallback(
    (label: string) => {
      const current = resultSequence
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      setResultSequence([...current, label].join(', '));
    },
    [resultSequence]
  );

  const removeFromSequence = useCallback(
    (idx: number) => {
      const current = resultSequence
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      current.splice(idx, 1);
      setResultSequence(current.join(', '));
    },
    [resultSequence]
  );

  const handleSpin = useCallback(() => {
    if (isSpinning || segments.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    let winnerIdx = -1;

    // Check if there is a rigged sequence
    if (resultSequence.trim() !== '') {
      const sequence = resultSequence
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      if (sequence.length > 0) {
        const nextTarget = sequence[0];
        // Find the index of the target label
        winnerIdx = segments.findIndex((s) => s.label.toLowerCase() === nextTarget.toLowerCase());

        // If found, update the sequence (remove the first item)
        if (winnerIdx !== -1) {
          setResultSequence(sequence.slice(1).join(', '));
        }
      }
    }

    // fallback to weighted random or if sequence item not found
    if (winnerIdx === -1) {
      const totalWeight = segments.reduce((acc, curr) => acc + curr.weight, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < segments.length; i++) {
        if (random < segments[i].weight) {
          winnerIdx = i;
          break;
        }
        random -= segments[i].weight;
      }
    }

    // Safety check
    if (winnerIdx === -1) winnerIdx = Math.floor(Math.random() * segments.length);

    const segmentAngle = 360 / segments.length;

    // Calculate how much we need to rotate to land on the winnerIdx
    // The wheel center is rotated by -segmentAngle/2, so segment 0 center is at 0 degrees (top)
    const targetAngle = 360 - winnerIdx * segmentAngle;
    const extraSpins = 5 + Math.floor(Math.random() * 5);

    // Core fix: Calculate total rotation from current position to target correctly
    const currentRotationNormalized = rotation % 360;
    const rotationDelta = (targetAngle - currentRotationNormalized + 360) % 360;
    const totalRotation = rotation + rotationDelta + 360 * extraSpins;

    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(segments[winnerIdx]);
    }, 5000);
  }, [isSpinning, segments, rotation, resultSequence]);

  const getClipPath = (count: number) => {
    if (count <= 1) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
    const angle = 360 / count;

    if (angle <= 45) {
      const x2 = 50 + 50 * Math.tan((angle * Math.PI) / 180);
      return `polygon(50% 50%, 50% 0%, ${x2}% 0%)`;
    } else if (angle <= 135) {
      const y2 = 50 - 50 * Math.tan(((90 - angle) * Math.PI) / 180);
      return `polygon(50% 50%, 50% 0%, 100% 0%, 100% ${y2}%)`;
    } else if (angle <= 225) {
      const x2 = 50 - 50 * Math.tan(((180 - angle) * Math.PI) / 180);
      return `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, ${x2}% 100%)`;
    } else {
      const y2 = 50 + 50 * Math.tan(((270 - angle) * Math.PI) / 180);
      return `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${y2}%)`;
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex items-center justify-center font-sans tracking-tight">
      <div
        className="absolute inset-0 bg-cover bg-center z-0 scale-105"
        style={{ backgroundImage: "url('/bg-new-year.png')" }}
      />
      <div className="absolute inset-0 z-1  pointer-events-none" />

      <button
        onClick={() => setIsSidebarOpen(true)}
        className="absolute top-4 left-4 md:top-8 md:left-8 z-50 p-3 md:p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gold/20 hover:border-gold/40 transition-all shadow-2xl group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white group-hover:text-gold transition-colors md:w-6 md:h-6"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-200 ease-in-out ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div
        className={`fixed top-0 left-0 h-full w-full md:w-[500px] bg-primary-blue/95 backdrop-blur-3xl border-r border-white/10 z-[70] transform transition-transform duration-200 px-6 py-10 md:px-12 md:py-16 overflow-y-auto ${isSidebarOpen ? 'translate-x-0 shadow-[40px_0_80px_rgba(0,0,0,0.4)]' : '-translate-x-full'}`}
      >
        <div className="flex flex-col items-center mb-8 md:mb-12 relative">
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gold tracking-widest uppercase mb-3">
            Cấu hình vòng quay
          </h2>
          <div className="h-1 w-20 md:h-1.5 md:w-24 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full opacity-60" />

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute -right-6 md:-right-8 -top-6 md:-top-12 p-2 cursor-pointer text-white/30 hover:text-white hover:rotate-90 transition-all duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="md:w-8 md:h-8"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2.5 cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-gold text-primary-blue shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            Cấu hình
          </button>
          <button
            onClick={() => setActiveTab('sequence')}
            className={`flex-1 py-2.5 cursor-pointer    rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sequence' ? 'bg-gold text-primary-blue shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            Kết quả
          </button>
        </div>

        <div className="space-y-8 md:space-y-10">
          {activeTab === 'config' ? (
            <>
              <div className="space-y-2 md:space-y-3 group">
                <label className="text-gold/50 text-[10px] md:text-[11px] font-black uppercase tracking-[2px] md:tracking-[3px] ml-1 group-focus-within:text-gold transition-colors">
                  Tiêu đề vòng quay
                </label>
                <input
                  type="text"
                  value={wheelTitle}
                  onChange={(e) => setWheelTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-lg md:text-xl font-black outline-none focus:border-gold/50 focus:bg-white/10 focus:ring-4 focus:ring-gold/10 transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="NHẬP TIÊU ĐỀ..."
                />
              </div>

              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <button
                    onClick={handleShuffle}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 py-3 rounded-xl text-[10px] md:text-xs font-black transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="16 3 21 3 21 8"></polyline>
                      <line x1="4" y1="20" x2="21" y2="3"></line>
                      <polyline points="21 16 21 21 16 21"></polyline>
                      <line x1="15" y1="15" x2="21" y2="21"></line>
                      <line x1="4" y1="4" x2="9" y2="9"></line>
                    </svg>
                    Random
                  </button>
                  <button
                    onClick={() => handleSort('asc')}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 py-3 rounded-xl text-[10px] md:text-xs font-black transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    A → Z
                  </button>
                  <button
                    onClick={() => handleSort('desc')}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 py-3 rounded-xl text-[10px] md:text-xs font-black transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    Z → A
                  </button>
                </div>

                <div className="space-y-2 md:space-y-3 group">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-gold/50 text-[10px] md:text-[11px] font-black uppercase tracking-[2px] md:tracking-[3px] group-focus-within:text-gold transition-colors">
                      Danh sách quà
                    </label>
                    <button
                      onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${isAdvancedMode ? 'bg-gold text-primary-blue' : 'bg-white/5 text-white/30 hover:text-white/60'}`}
                    >
                      Nâng cao {isAdvancedMode ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <textarea
                    value={segmentsRaw}
                    onChange={(e) => setSegmentsRaw(e.target.value)}
                    className="w-full h-[200px] md:h-[300px] bg-black/40 border border-white/5 text-white rounded-2xl md:rounded-3xl p-5 md:p-7 font-bold text-base md:text-lg resize-none outline-none focus:border-gold/20 focus:bg-black/60 focus:ring-4 focus:ring-gold/5 transition-all scrollbar-hide shadow-2xl leading-relaxed"
                    placeholder={
                      isAdvancedMode
                        ? 'Tên quà | Trọng số (ví dụ: iPhone | 1)...'
                        : 'Mỗi dòng một quà...'
                    }
                  />
                  {isAdvancedMode && (
                    <div className="space-y-3 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2 group/rig">
                        <label className="text-gold/50 text-[10px] min-[11px] font-black uppercase tracking-[2px] md:tracking-[3px] ml-1 group-focus-within/rig:text-gold transition-colors">
                          Thứ tự kết quả (Ngăn cách bởi dấu phẩy)
                        </label>
                        <input
                          type="text"
                          value={resultSequence}
                          onChange={(e) => setResultSequence(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-gold/30 focus:bg-white/10 transition-all placeholder:text-white/10"
                          placeholder="iPhone, Mac, iPad..."
                        />
                        <p className="text-[9px] text-white/30 italic px-1 leading-tight">
                          * Cài đặt kết quả sẽ ra theo thứ tự. Nếu để trống sẽ quay ngẫu nhiên theo
                          tỉ lệ.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <label className="text-gold/50 text-[10px] md:text-[11px] font-black uppercase tracking-[2px] md:tracking-[3px] ml-1">
                  Chọn kết quả cho vòng tiếp theo
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addToSequence(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-gold/30 focus:bg-white/10 transition-all cursor-pointer shadow-inner appearance-none"
                >
                  <option value="" className="bg-primary-blue">
                    -- CHỌN QUÀ --
                  </option>
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.label} className="bg-primary-blue text-white">
                      {seg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-gold/50 text-[10px] md:text-[11px] font-black uppercase tracking-[2px] md:tracking-[3px]">
                    Danh sách đã chọn ({resultSequence.split(',').filter(Boolean).length})
                  </label>
                  {resultSequence && (
                    <button
                      onClick={() => setResultSequence('')}
                      className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {resultSequence
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s !== '')
                    .map((label, idx) => (
                      <div
                        key={`${label}-${idx}`}
                        className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-4 py-3 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-black text-gold">
                            {idx + 1}
                          </span>
                          <span className="text-white font-bold text-sm tracking-wide">
                            {label}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromSequence(idx)}
                          className="p-1 text-white/20 hover:text-rose-400 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  {!resultSequence.trim() && (
                    <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center space-y-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <p className="text-xs font-black uppercase tracking-widest text-white">
                        Chưa có kết quả được chọn
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 md:gap-5 pt-2">
            <button
              onClick={handleUpdatePersistence}
              className="flex-[2] bg-gradient-to-br from-gold/80 to-gold text-primary-blue py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-lg font-black shadow-[0_10px_30px_rgba(243,195,77,0.2)] hover:shadow-[0_15px_40px_rgba(243,195,77,0.3)] hover:-translate-y-1 transition-all active:scale-95 cursor-pointer uppercase tracking-widest"
            >
              Lưu & Đóng
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/10 hover:border-rose-500/30 py-4 px-4 md:py-5 md:px-6 rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              Đặt lại
            </button>
          </div>

          <div className="mt-10 md:mt-16 pt-8 md:pt-12 border-t border-white/5">
            <div className="flex items-center gap-4 justify-center mb-6 md:mb-10">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
              <h3 className="text-[10px] font-black text-white/30 tracking-[3px] md:tracking-[4px] uppercase whitespace-nowrap">
                Thư viện của bạn
              </h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>

            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {history.map((item, idx) => {
                const gradients = [
                  'from-teal-500/80 to-teal-600',
                  'from-orange-400/80 to-orange-500',
                  'from-blue-500/80 to-blue-600',
                  'from-pink-500/80 to-pink-600',
                  'from-rose-400/80 to-rose-500',
                  'from-emerald-500/80 to-emerald-600',
                ];
                return (
                  <button
                    key={idx}
                    onClick={() => loadPreset(item)}
                    className={`bg-gradient-to-br ${gradients[idx % gradients.length]} text-white px-4 py-3 md:px-6 md:py-4 rounded-[15px] md:rounded-[20px] text-xs md:text-sm font-black transition-all hover:scale-110 active:scale-90 shadow-xl border border-white/20 cursor-pointer whitespace-nowrap`}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col xl:flex-row w-full max-w-[1600px] px-4 md:px-16 items-center justify-center xl:justify-between gap-8 md:gap-12 py-6 md:py-20">
        <div className="xl:hidden relative w-full max-w-[500px] aspect-square md:aspect-4/3 max-h-[300px] md:max-h-none mb-4 overflow-hidden animate-in fade-in slide-in-from-top duration-1000">
          <Image
            src="/new-year.png"
            alt="New Year 2026"
            fill
            className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-[1.02] transition-transform duration-700 select-none"
            priority
          />
        </div>

        <div className="flex-1 flex justify-center scale-100 sm:scale-100 md:scale-100 xl:scale-110 transition-transform duration-1000 ease-out origin-center">
          <div className="relative w-[380px] h-[380px] md:w-[620px] md:h-[620px] drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-[-6px] md:inset-[-10px] rounded-full bg-gradient-to-br from-[#b18d2d] via-gold to-[#b18d2d] shadow-2xl opacity-60" />

            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#d32f2f] via-[#b71c1c] to-[#8a1515] border-[10px] md:border-[16px] border-gold shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_0_40px_rgba(243,195,77,0.3)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-[-4px] rounded-full">
                <div className="absolute inset-0 rounded-full border-[10px] md:border-[16px] border-gold pointer-events-none z-30">
                  <div className="absolute inset-0">
                    {[...Array(24)].map((_, i) => (
                      <div
                        key={`bulb-${i}`}
                        className="absolute w-2.5 md:w-4 h-2.5 md:h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * (360 / 24)}deg) translateY(-145px) md:translateY(-283px)`,
                          transformOrigin: 'center',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-full z-10" />
            </div>

            <div className="absolute w-[86%] h-[86%] top-[7%] left-[7%] rounded-full shadow-[0_0_30px_rgba(0,0,0,0.3)] overflow-hidden bg-primary-blue/20">
              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)' : 'none',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{ transform: `rotate(-${360 / Math.max(1, segments.length) / 2}deg)` }}
                >
                  {segments.map((seg, i) => {
                    const count = segments.length;
                    const angle = 360 / count;
                    const rotationAngle = i * angle;

                    return (
                      <div
                        key={seg.id}
                        className="absolute inset-0 segment-clip transition-all duration-700 ease-in-out shadow-inner"
                        style={
                          {
                            transform: `rotate(${rotationAngle}deg)`,
                            background: `radial-gradient(circle at 50% 0%, ${seg.color} 0%, rgba(0,0,0,0.4) 150%)`,
                            '--clip-path': getClipPath(count),
                          } as React.CSSProperties
                        }
                      />
                    );
                  })}
                </div>

                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ transform: `rotate(-${360 / Math.max(1, segments.length) / 2}deg)` }}
                >
                  {segments.map((seg, i) => {
                    const count = segments.length;
                    const angle = 360 / count;

                    const getLabelStyles = (n: number) => {
                      if (n <= 6)
                        return {
                          fontSize: 'text-xs md:text-xl',
                          width: '120px md:w-[240px]',
                          top: 'top-16 md:top-32',
                        };
                      if (n <= 12)
                        return {
                          fontSize: 'text-[10px] md:text-lg',
                          width: '100px md:w-[200px]',
                          top: 'top-12 md:top-24',
                        };
                      if (n <= 20)
                        return {
                          fontSize: 'text-[8px] md:text-base',
                          width: '80px md:w-[160px]',
                          top: 'top-10 md:top-20',
                        };
                      return {
                        fontSize: 'text-[7px] md:text-sm',
                        width: '70px md:w-[140px]',
                        top: 'top-8 md:top-16',
                      };
                    };

                    const styles = getLabelStyles(count);

                    return (
                      <div
                        key={`label-${seg.id}`}
                        className="absolute inset-0"
                        style={{ transform: `rotate(${i * angle + angle / 2}deg)` }}
                      >
                        <div
                          className={`absolute ${styles.top} left-1/2 -translate-x-1/2 text-center flex flex-col items-center select-none`}
                          style={{
                            color: seg.textColor,
                            transform: `rotate(90deg)`,
                            width: styles.width,
                          }}
                        >
                          <div
                            className={`font-semibold ${styles.fontSize} leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-tighter`}
                          >
                            {seg.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_rgba(0,0,0,0.4)] pointer-events-none z-20" />
            </div>

            <div
              onClick={handleSpin}
              className={`absolute w-20 h-20 md:w-24 md:h-24 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 ${isSpinning ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="absolute inset-0 rounded-full border-[3px] md:border-[4px] border-gold bg-gradient-to-br from-[#b18d2d] via-gold to-[#b18d2d] shadow-2xl animate-spin-slow opacity-80" />
              {/* <div className="absolute inset-[4px] md:inset-[6px] bg-primary-blue border-[2px] md:border-[4px] border-white/20 rounded-full flex flex-col items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] scale-100 hover:scale-105 transition-transform overflow-hidden group">
                <div className="absolute inset-0 bg-gold/10 group-hover:bg-transparent transition-colors" />
                <div className="relative font-black text-xl md:text-3xl text-gold group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(243,195,77,0.5)]">
                  E
                </div>
                <div className="relative text-[7px] md:text-[10px] font-black text-white tracking-[2px] md:tracking-[4px] group-hover:tracking-[6px] transition-all opacity-80">
                  CORP
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
              </div> */}
              <Image
                src="/logo-ecorp.png"
                alt="logo-ecorp"
                fill
                className="object-cover  rounded-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-[1.02] transition-transform duration-700 select-none"
                priority
              />
            </div>

            <div className="absolute -top-6 md:-top-10 left-1/2 -translate-x-1/2 z-50 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] group/pointer">
              <svg
                width="60"
                height="80"
                viewBox="0 0 60 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-10 md:w-12 md:h-16 hover:scale-110 transition-transform duration-300 pointer-events-auto cursor-help"
              >
                <path
                  d="M30 75C30 75 55 45 55 30C55 13.4315 43.8071 0 30 0C16.1929 0 5 13.4315 5 30C5 45 30 75 30 75Z"
                  fill="url(#paint0_linear)"
                  stroke="#D4AF37"
                  strokeWidth="2"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="12"
                  fill="url(#paint1_radial)"
                  stroke="white"
                  strokeWidth="1"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear"
                    x1="30"
                    y1="0"
                    x2="30"
                    y2="75"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#F3C34D" />
                    <stop offset="0.5" stopColor="#D4AF37" />
                    <stop offset="1" stopColor="#B18D2D" />
                  </linearGradient>
                  <radialGradient
                    id="paint1_radial"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(30 30) rotate(90) scale(12)"
                  >
                    <stop stopColor="white" />
                    <stop offset="1" stopColor="#F3C34D" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center xl:pl-8 animate-in fade-in slide-in-from-bottom xl:slide-in-from-right duration-1000">
          <div className="relative w-full max-w-[500px] xl:max-w-[650px] flex flex-col items-center">
            <div className="mb-4 md:mb-8 text-center px-4">
              <h3 className="text-gold/90 font-black text-lg md:text-2xl tracking-[6px] md:tracking-[12px] uppercase opacity-50 select-none break-words">
                {wheelTitle}
              </h3>
            </div>

            <div className="hidden xl:block relative w-full aspect-square md:aspect-4/3 max-h-[300px] md:max-h-none mb-10 overflow-hidden">
              <Image
                src="/new-year.png"
                alt="New Year 2026"
                fill
                className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-[1.02] transition-transform duration-700 select-none"
                priority
              />
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`mt-4 md:mt-10 cursor-pointer group relative active:scale-95 transition-transform ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="absolute -inset-1 bg-gold rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-gold text-primary-blue px-10 py-4 md:px-14 md:py-5 rounded-full text-xl md:text-2xl font-black flex items-center gap-3 md:gap-4 shadow-[0_6px_0_#b18d2d] md:shadow-[0_10px_0_#b18d2d] group-active:translate-y-1 md:group-active:translate-y-2 group-active:shadow-none transition-all duration-200 uppercase tracking-widest whitespace-nowrap">
                <span
                  className={`font-mono bg-primary-blue/10 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-base md:text-xl pb-0.5 md:pb-1 ${isSpinning ? 'animate-spin' : 'group-hover:rotate-90'} transition-transform duration-500`}
                >
                  {'>'}
                </span>
                {isSpinning ? 'ĐANG QUAY...' : 'QUAY NGAY!'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {winner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-primary-blue border-2 border-gold rounded-[30px] md:rounded-[40px] p-8 md:p-12 max-w-lg w-full text-center shadow-[0_0_100px_rgba(243,195,77,0.3)] animate-in zoom-in-95 duration-300">
            <div className="mb-6 md:mb-8 inline-flex p-4 md:p-6 bg-gold/10 rounded-full border border-gold/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gold animate-bounce md:w-16 md:h-16"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
            </div>

            <h2 className="text-gold/50 text-[10px] md:text-sm font-black uppercase tracking-[4px] md:tracking-[6px] mb-2 md:mb-4">
              Xin chúc mừng!
            </h2>
            <div className="text-white text-3xl md:text-5xl font-black mb-6 md:mb-8 leading-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
              {winner.label}
            </div>

            <button
              onClick={() => setWinner(null)}
              className="w-full bg-gold text-primary-blue py-4 md:py-5 rounded-xl md:rounded-2xl text-lg md:text-xl font-black shadow-[0_6px_0_#b18d2d] md:shadow-[0_10px_0_#b18d2d] hover:translate-y-0.5 md:hover:translate-y-1 hover:shadow-[0_4px_0_#b18d2d] md:hover:shadow-[0_5px_0_#b18d2d] active:translate-y-1 md:active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest cursor-pointer"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyWheelView;
