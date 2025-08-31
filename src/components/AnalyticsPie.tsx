
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type PieDatum = { name: string; value: number };

const COLORS = [
  "hsl(210 60% 55%)",
  "hsl(134 35% 50%)",
  "hsl(37 90% 55%)",
  "hsl(260 55% 60%)",
  "hsl(0 70% 55%)",
  "hsl(180 50% 45%)",
];

const AnalyticsPie = ({ data }: { data: PieDatum[] }) => {
  return (
    <div className="wellness-card p-6">
      <h3 className="text-lg font-medium text-gray-700 mb-4">
        Event Types Distribution
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              innerRadius={45}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsPie;

