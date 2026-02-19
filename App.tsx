
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, ReferenceLine
} from 'recharts';
import { parseRawData } from './services/geminiService';
import { RawTransaction, BuildingData, DebtSummary } from './types';
import { getNeonColor } from './utils/colors';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseRawData(inputText);
      setTransactions(result.transactions);
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process data for the Skyscraper Chart
  const chartData = useMemo(() => {
    const buildingsMap = new Map<string, BuildingData>();

    transactions.forEach(tx => {
      const existing = buildingsMap.get(tx.item) || {
        category: tx.item,
        total: 0,
        floors: [],
        color: getNeonColor(tx.item)
      };

      existing.total += tx.value;
      existing.floors.push({
        value: tx.value,
        description: tx.originalText,
        type: tx.type
      });

      buildingsMap.set(tx.item, existing);
    });

    const data = Array.from(buildingsMap.values()).sort((a, b) => b.total - a.total);
    const maxFloors = Math.max(...data.map(d => d.floors.length), 0);
    const flattened = data.map(building => {
      const result: any = { 
        name: building.category, 
        color: building.color,
        total: building.total 
      };
      building.floors.forEach((f, idx) => {
        result[`floor_${idx}`] = f.value;
        result[`desc_${idx}`] = f.description;
      });
      return result;
    });

    return { flattened, maxFloors, originalData: data };
  }, [transactions]);

  // Aggregate Debt/Loan information
  const debtManifest = useMemo(() => {
    const debtMap = new Map<string, number>();
    transactions.forEach(tx => {
      if (tx.isOwed && tx.involvedPerson) {
        const current = debtMap.get(tx.involvedPerson) || 0;
        // If we lent money (debit), they owe it (+). If they paid it back (credit), they owe less (-).
        const impact = tx.type === 'debit' ? tx.value : -tx.value;
        debtMap.set(tx.involvedPerson, current + impact);
      }
    });

    return Array.from(debtMap.entries())
      .filter(([_, amount]) => amount !== 0)
      .map(([person, amount]): DebtSummary => ({
        person,
        amount,
        color: '#facc15' // Yellow/Hazard color
      })).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const timelineData = useMemo(() => {
    let currentBalance = 0;
    return transactions.map((tx, idx) => {
      const change = tx.type === 'credit' ? tx.value : -tx.value;
      currentBalance += change;
      return {
        time: `TX-${idx + 1}`,
        balance: currentBalance,
        change,
        label: tx.item
      };
    });
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl backdrop-blur-md">
          <p className="font-bold text-cyan-400 mb-1">{label}</p>
          <p className="text-sm text-gray-300">Total: <span className="text-white font-mono">${data.total.toLocaleString()}</span></p>
          <div className="mt-2 space-y-1">
            {Object.keys(data).filter(k => k.startsWith('floor_')).map(k => {
              const idx = k.split('_')[1];
              return (
                <p key={k} className="text-xs text-gray-400 truncate max-w-[200px]">
                  • {data[`desc_${idx}`]}
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const TimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl backdrop-blur-md">
          <p className="font-bold text-indigo-400 mb-1">{data.label}</p>
          <p className="text-sm text-gray-300">Balance: <span className="text-white font-mono">${data.balance.toLocaleString()}</span></p>
          <p className={`text-xs font-bold ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.change >= 0 ? '+' : ''}{data.change.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent uppercase">
            Skyline Categorizer <span className="text-white font-thin">Pro</span>
          </h1>
          <p className="text-gray-400 text-sm">Automated Financial Forensics & Debt Analysis</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Total Inflow</p>
            <p className="text-xl font-mono text-green-400">
              ${transactions.filter(t => t.type === 'credit').reduce((a, b) => a + b.value, 0).toLocaleString()}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-800" />
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Total Outflow</p>
            <p className="text-xl font-mono text-red-400">
              ${transactions.filter(t => t.type === 'debit').reduce((a, b) => a + b.value, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-8">
          {/* Feed Intake */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <i className="fas fa-terminal"></i> Data Feed Intake
            </label>
            <textarea
              className="w-full h-[200px] bg-black text-green-400 font-mono text-sm p-4 rounded-lg border border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none transition-all"
              placeholder="Example:&#10;Lent 50 to Sarah&#10;Sarah paid back 20&#10;Milk 500&#10;Gas 45..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={handleProcess}
              disabled={isProcessing || !inputText.trim()}
              className={`py-4 rounded-lg font-black uppercase tracking-widest transition-all ${
                isProcessing 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
            >
              {isProcessing ? 'Analyzing...' : 'Generate Skyline'}
            </button>
          </div>

          {/* Debt Manifest - "Who took money" */}
          <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-4 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#facc15,#facc15_10px,#000_10px,#000_20px)] opacity-50" />
            <h3 className="text-xs font-black text-yellow-500 uppercase flex items-center justify-between mb-4 mt-1">
              <span><i className="fas fa-user-secret mr-2"></i> Debt Manifest</span>
              <span className="text-[10px] text-yellow-500/50 italic font-mono">Unsettled Liquidity</span>
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {debtManifest.length > 0 ? (
                debtManifest.map((debt, idx) => (
                  <div key={idx} className="bg-black/80 border border-gray-800 p-3 rounded-lg flex items-center justify-between group hover:border-yellow-500/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-500">
                        <i className="fas fa-hand-holding-usd text-xs"></i>
                      </div>
                      <span className="text-sm font-bold text-gray-200">{debt.person}</span>
                    </div>
                    <span className={`text-sm font-mono font-bold ${debt.amount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {debt.amount > 0 ? 'OWES' : 'OVERPAID'} ${Math.abs(debt.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-600 text-xs py-4 italic">No active debts detected.</p>
              )}
            </div>
          </div>

          {/* Ledger */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-xl flex flex-col gap-3 max-h-[400px] overflow-hidden">
            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              <span><i className="fas fa-list-ul mr-2"></i> Cyber Ledger</span>
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {transactions.map((tx, idx) => (
                <div key={idx} className={`bg-black/50 border ${tx.isOwed ? 'border-yellow-500/30' : 'border-gray-800'} p-3 rounded-lg mb-2 flex items-center justify-between group hover:border-gray-700 transition-colors`}>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-300 truncate">{tx.item}</span>
                      {tx.isOwed && <i className="fas fa-clock text-[10px] text-yellow-500" title="Unsettled Debt"></i>}
                    </div>
                    <span className="text-[10px] text-gray-500 truncate italic">{tx.originalText}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-4">
                    <span className={`text-sm font-mono font-bold ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      ${tx.value.toLocaleString()}
                    </span>
                    <span className="text-[8px] text-gray-600 uppercase tracking-tighter">{tx.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Skyscraper Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl overflow-hidden">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-6 flex items-center justify-between">
              <span><i className="fas fa-city mr-2"></i> Skyscraper Distribution</span>
              <span className="text-cyan-500">Categorical Stacking</span>
            </h3>
            <div className="h-[450px] w-full">
              {transactions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.flattened} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tick={{ fill: '#9ca3af' }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis stroke="#4b5563" fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#111827' }} />
                    {Array.from({ length: chartData.maxFloors }).map((_, i) => (
                      <Bar 
                        key={`floor_${i}`} 
                        dataKey={`floor_${i}`} 
                        stackId="a" 
                      >
                        {chartData.flattened.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8 - (i * 0.1)} />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-lg">
                  Awaiting analysis...
                </div>
              )}
            </div>
          </div>

          {/* Liquidity Flow */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl overflow-hidden">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-6 flex items-center justify-between">
              <span><i className="fas fa-wave-square mr-2"></i> Liquidity Flow</span>
              <span className="text-indigo-500">Wallet Price Action</span>
            </h3>
            <div className="h-[450px] w-full">
              {transactions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <YAxis stroke="#4b5563" fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <Tooltip content={<TimelineTooltip />} />
                    <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorBalance)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-lg">
                  Awaiting balance calculation...
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-auto pt-8 border-t border-gray-800 text-center text-gray-600 text-[10px] uppercase tracking-[0.2em] font-bold">
        Automated Item Extraction System v2.1 • Debt Surveillance Module Active
      </footer>
    </div>
  );
};

export default App;
