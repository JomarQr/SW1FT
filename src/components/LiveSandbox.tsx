import React, { useState, useEffect, useRef } from 'react';
import { Activity, MousePointer2, Keyboard } from 'lucide-react';

export default function LiveSandbox() {
  const [dwellTime, setDwellTime] = useState<number>(0);
  const [flightTime, setFlightTime] = useState<number>(0);
  const [mouseVelocity, setMouseVelocity] = useState<number>(0);
  
  const [cardValue, setCardValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [cardError, setCardError] = useState('');
  const [nameError, setNameError] = useState('');

  const [probability, setProbability] = useState({
    normal: 100,
    coerced: 0,
    aiFraud: 0
  });

  const lastKeyDownTime = useRef<number | null>(null);
  const lastKeyUpTime = useRef<number | null>(null);
  
  const lastMousePos = useRef<{ x: number, y: number, time: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentTime = performance.now();
      if (lastMousePos.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        const dt = currentTime - lastMousePos.current.time;
        
        if (dt > 0) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          const velocity = (distance / dt) * 1000; // pixels per second
          setMouseVelocity(prev => (prev * 0.8) + (velocity * 0.2)); // smooth
        }
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY, time: currentTime };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const validateNumeric = (val: string) => {
    return /^[0-9]*$/.test(val);
  };

  const validateLetters = (val: string) => {
    return /^[a-zA-Z\s]*$/.test(val);
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (validateNumeric(val)) {
      setCardValue(val);
      if (val.length > 0 && val.length < 15) {
        setCardError('Minimum 15 digits required');
      } else {
        setCardError('');
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (validateLetters(val)) {
      setNameValue(val);
      if (val.length > 0 && val.length < 3) {
        setNameError('Minimum 3 letters required');
      } else {
        setNameError('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentTime = performance.now();
    if (lastKeyUpTime.current) {
      const flight = currentTime - lastKeyUpTime.current;
      if (flight < 1000) { // ignore long pauses
        setFlightTime(prev => (prev * 0.5) + (flight * 0.5));
      }
    }
    lastKeyDownTime.current = currentTime;
    updateProbability();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    const currentTime = performance.now();
    if (lastKeyDownTime.current) {
      const dwell = currentTime - lastKeyDownTime.current;
      setDwellTime(prev => (prev * 0.5) + (dwell * 0.5));
    }
    lastKeyUpTime.current = currentTime;
    updateProbability();
  };

  const updateProbability = () => {
    // Simple heuristic for demo purposes
    let norm = 100;
    let coer = 0;
    let ai = 0;

    if (dwellTime > 200 || flightTime > 400) {
      // Slow, hesitant typing -> Coerced
      coer = Math.min(80, (dwellTime - 100) * 0.5 + (flightTime - 200) * 0.2);
      norm = 100 - coer;
    } else if (dwellTime > 0 && dwellTime < 40 && flightTime > 0 && flightTime < 60) {
      // Extremely fast, machine-like -> AI
      ai = Math.min(90, 100 - dwellTime - flightTime);
      norm = 100 - ai;
    }

    if (mouseVelocity > 3000) {
      ai += 20;
      norm -= 20;
    }

    // Normalize
    const total = Math.max(1, norm + coer + ai);
    setProbability({
      normal: Math.max(0, Math.round((norm / total) * 100)),
      coerced: Math.max(0, Math.round((coer / total) * 100)),
      aiFraud: Math.max(0, Math.round((ai / total) * 100))
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium text-zinc-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-zinc-500" />
          Live SDK Sandbox
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          Type in the fields below. The embedded SDK silently collects behavioral signals to evaluate risk.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1 uppercase tracking-wider">Credit Card / IBAN</label>
            <input 
              type="text" 
              value={cardValue}
              onChange={handleCardChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 font-mono text-sm transition-colors ${
                cardError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-zinc-300 focus:ring-zinc-500 focus:border-zinc-500'
              }`}
              placeholder="XXXX XXXX XXXX XXXX"
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            />
            {cardError && <p className="mt-1 text-[10px] text-red-500 font-medium uppercase tracking-tight">{cardError}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1 uppercase tracking-wider">Cardholder Name</label>
            <input 
              type="text" 
              value={nameValue}
              onChange={handleNameChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm transition-colors ${
                nameError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-zinc-300 focus:ring-zinc-500 focus:border-zinc-500'
              }`}
              placeholder="JOHN DOE"
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            />
            {nameError && <p className="mt-1 text-[10px] text-red-500 font-medium uppercase tracking-tight">{nameError}</p>}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-6">
          <div className="text-center">
            <div className="flex items-center justify-center text-zinc-400 mb-1">
              <Keyboard className="w-4 h-4 mr-1" />
            </div>
            <div className="text-2xl font-semibold text-zinc-800">{Math.round(dwellTime)}<span className="text-xs text-zinc-500 ml-1">ms</span></div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Dwell Time</div>
          </div>
          <div className="text-center border-l border-r border-zinc-100">
            <div className="flex items-center justify-center text-zinc-400 mb-1">
              <Keyboard className="w-4 h-4 mr-1" />
            </div>
            <div className="text-2xl font-semibold text-zinc-800">{Math.round(flightTime)}<span className="text-xs text-zinc-500 ml-1">ms</span></div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Flight Time</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center text-zinc-400 mb-1">
              <MousePointer2 className="w-4 h-4 mr-1" />
            </div>
            <div className="text-2xl font-semibold text-zinc-800">{Math.round(mouseVelocity)}<span className="text-xs text-zinc-500 ml-1">px/s</span></div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Mouse Vel</div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg p-6 text-white shadow-sm flex flex-col">
        <h3 className="text-lg font-medium mb-6 flex items-center">
          Probability Distribution
        </h3>
        
        <div className="flex-1 flex flex-col justify-center space-y-8">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400 uppercase tracking-wider text-xs font-medium">Normal</span>
              <span className="font-mono">{probability.normal}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-zinc-300 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${probability.normal}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-orange-400 uppercase tracking-wider text-xs font-medium">Coerced Victim</span>
              <span className="font-mono text-orange-400">{probability.coerced}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${probability.coerced}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-red-400 uppercase tracking-wider text-xs font-medium">AI-Fraudster</span>
              <span className="font-mono text-red-400">{probability.aiFraud}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${probability.aiFraud}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
