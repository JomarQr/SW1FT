/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import LiveSandbox from './components/LiveSandbox';
import AnalystDashboard from './components/AnalystDashboard';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-zinc-900 p-1.5 rounded-md mr-3">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Aegis<span className="text-zinc-400 font-normal">AML</span></h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
              System Operational
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-sm font-medium text-zinc-600">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Live SDK Sandbox</h2>
            <p className="text-sm text-zinc-500 mt-1">Real-time behavioral signal extraction and probability modeling.</p>
          </div>
          <LiveSandbox />
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Analyst Dashboard</h2>
            <p className="text-sm text-zinc-500 mt-1">Active interventions and merchant risk analysis.</p>
          </div>
          <AnalystDashboard />
        </section>
      </main>
    </div>
  );
}
