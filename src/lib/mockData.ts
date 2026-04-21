export const activeInterventions = [
  {
    id: 'TXN-8923-A',
    timestamp: '2026-04-13T13:42:10Z',
    amount: 4500.00,
    currency: 'EUR',
    merchant: 'CryptoExchange EU',
    status: '30s Delay Active',
    riskScore: 88,
    anomalies: [
      'Abnormal typing cadence detected (Dwell time > 300ms)',
      'Mouse trajectory indicates remote desktop / AI automation'
    ],
    probability: {
      normal: 12,
      coerced: 15,
      aiFraud: 73
    }
  },
  {
    id: 'TXN-8924-B',
    timestamp: '2026-04-13T13:44:05Z',
    amount: 1250.50,
    currency: 'EUR',
    merchant: 'Luxury Goods Ltd',
    status: 'Pending SMS Challenge',
    riskScore: 75,
    anomalies: [
      'Flight time variance extremely low (Machine-like precision)',
      'No mouse movement detected prior to form submission'
    ],
    probability: {
      normal: 20,
      coerced: 5,
      aiFraud: 75
    }
  },
  {
    id: 'TXN-8925-C',
    timestamp: '2026-04-13T13:45:22Z',
    amount: 8900.00,
    currency: 'EUR',
    merchant: 'High-Risk Brokerage',
    status: 'Awaiting Manual Review',
    riskScore: 92,
    anomalies: [
      'Hesitation patterns detected (Coercion signature)',
      'Multiple corrections on IBAN input'
    ],
    probability: {
      normal: 8,
      coerced: 82,
      aiFraud: 10
    }
  }
];

export const merchantRiskData = [
  { day: 'Day 1', riskScore: 12, volume: 100 },
  { day: 'Day 15', riskScore: 15, volume: 120 },
  { day: 'Day 30', riskScore: 25, volume: 150 },
  { day: 'Day 45', riskScore: 35, volume: 200 },
  { day: 'Day 60', riskScore: 55, volume: 350 },
  { day: 'Day 75', riskScore: 75, volume: 600 },
  { day: 'Day 90', riskScore: 88, volume: 850 },
];
