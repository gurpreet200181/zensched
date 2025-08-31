
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ChartData {
  day: string;
  meetings: number;
  busyness: number;
}

interface AnalyticsChartProps {
  data: ChartData[];
  type: 'bar' | 'line';
  className?: string;
}

const AnalyticsChart = ({ data, type, className = "" }: AnalyticsChartProps) => {
  return (
    <div className={`wellness-card p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-700 mb-4">
        {type === 'bar' ? 'Meetings per Day' : 'Busyness Trend'}
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar 
                dataKey="meetings" 
                fill="url(#meetingGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="meetingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(134, 30%, 55%)" />
                  <stop offset="100%" stopColor="hsl(154, 35%, 50%)" />
                </linearGradient>
              </defs>
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="busyness" 
                stroke="hsl(210, 60%, 55%)"
                strokeWidth={3}
                dot={{ fill: 'hsl(210, 60%, 55%)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(210, 60%, 55%)', strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;
