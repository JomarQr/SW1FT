import React, { useState } from 'react';
import { activeInterventions } from '../lib/mockData';
import { AlertTriangle, Clock, ShieldAlert, ChevronRight, Activity } from 'lucide-react';
import MerchantRiskChart from './MerchantRiskChart';

export default function AnalystDashboard() {
  const [selectedTxn, setSelectedTxn] = useState(activeInterventions[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interventions Queue */}
      <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider">Active Interventions</h3>
          <span className="bg-zinc-200 text-zinc-700 text-xs px-2 py-1 rounded-full font-medium">{activeInterventions.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeInterventions.map((txn) => (
            <div 
              key={txn.id}
              onClick={() => setSelectedTxn(txn)}
              className={`p-4 border-b border-zinc-100 cursor-pointer transition-colors ${selectedTxn.id === txn.id ? 'bg-zinc-50 border-l-4 border-l-zinc-800' : 'hover:bg-zinc-50 border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-zinc-500">{txn.id}</span>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${
                  txn.riskScore > 90 ? 'bg-red-100 text-red-700' : 
                  txn.riskScore > 70 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-700'
                }`}>
                  Risk: {txn.riskScore}
                </span>
              </div>
              <div className="font-medium text-zinc-900 mb-1">{txn.currency} {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-sm text-zinc-500 mb-3">{txn.merchant}</div>
              <div className="flex items-center text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded w-fit">
                {txn.status.includes('Delay') ? <Clock className="w-3 h-3 mr-1.5" /> : <ShieldAlert className="w-3 h-3 mr-1.5" />}
                {txn.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-zinc-100">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-1">Transaction {selectedTxn.id}</h2>
              <p className="text-sm text-zinc-500">{new Date(selectedTxn.timestamp).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-900">{selectedTxn.currency} {selectedTxn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-sm text-zinc-500">{selectedTxn.merchant}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Behavioral Anomalies</h4>
              <ul className="space-y-3">
                {selectedTxn.anomalies.map((anomaly, idx) => (
                  <li key={idx} className="flex items-start text-sm text-zinc-700">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    {anomaly}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Trigger Probability</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-600">Normal</span>
                    <span className="font-mono text-zinc-500">{selectedTxn.probability.normal}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1.5">
                    <div className="bg-zinc-400 h-1.5 rounded-full" style={{ width: `${selectedTxn.probability.normal}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-orange-600 font-medium">Coerced Victim</span>
                    <span className="font-mono text-orange-600">{selectedTxn.probability.coerced}%</span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${selectedTxn.probability.coerced}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-600 font-medium">AI-Fraudster</span>
                    <span className="font-mono text-red-600">{selectedTxn.probability.aiFraud}%</span>
                  </div>
                  <div className="w-full bg-red-100 rounded-full h-1.5">
                    <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${selectedTxn.probability.aiFraud}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-zinc-500" />
              Merchant Risk Accumulator
            </h4>
            <span className="text-xs text-zinc-500">90-Day Trajectory</span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Behavioral abuse patterns detected across all transactions for {selectedTxn.merchant}</p>
          <MerchantRiskChart />
        </div>
      </div>
    </div>
  );
}
