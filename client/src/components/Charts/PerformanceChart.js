import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function PerformanceChart({ timeframe = '24h' }) {
  // Mock data - in production, this would come from props or API
  const generateMockData = (timeframe) => {
    const data = [];
    const now = new Date();
    let points = 24;
    let interval = 1; // hours

    switch (timeframe) {
      case '7d':
        points = 7;
        interval = 24;
        break;
      case '30d':
        points = 30;
        interval = 24;
        break;
      case '90d':
        points = 90;
        interval = 24;
        break;
    }

    let value = 10000;
    for (let i = points; i >= 0; i--) {
      const date = new Date(now.getTime() - i * interval * 60 * 60 * 1000);
      const change = (Math.random() - 0.5) * 0.1; // ±5% change
      value = value * (1 + change);
      
      data.push({
        time: date.toISOString(),
        value: Math.round(value),
        pnl: Math.round(value - 10000)
      });
    }

    return data;
  };

  const data = generateMockData(timeframe);

  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    if (timeframe === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTooltip = (value, name) => {
    if (name === 'value') {
      return [`$${value.toLocaleString()}`, 'Portfolio Value'];
    } else if (name === 'pnl') {
      const sign = value >= 0 ? '+' : '';
      return [`${sign}$${value.toLocaleString()}`, 'P&L'];
    }
    return [value, name];
  };

  return (
    <div className="performance-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#23274a" />
          <XAxis 
            dataKey="time" 
            tickFormatter={formatXAxis}
            stroke="#8a8ebc"
            fontSize={12}
          />
          <YAxis 
            stroke="#8a8ebc"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1d3a',
              border: '1px solid #23274a',
              borderRadius: '8px',
              color: '#e5e7fa'
            }}
            formatter={formatTooltip}
            labelFormatter={(label) => {
              const date = new Date(label);
              return date.toLocaleString();
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#7052ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#a281ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PerformanceChart;
