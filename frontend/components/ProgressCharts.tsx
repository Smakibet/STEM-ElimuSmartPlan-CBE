import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export default function ProgressCharts({ session }: { session: any }) {
    const data = session.standards.map((s: any) => ({
        standard: `Std ${s.id}`,
        Teacher: s.selfRating || 0,
        Supervisor: s.supervisorRating || 0
    }));

    return (
        <div className="h-80">
            <h3 className="text-sm font-bold mb-3">
                Teacher vs Supervisor Performance Comparison
            </h3>

            <ResponsiveContainer>
                <BarChart data={data}>
                    <XAxis dataKey="standard" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Teacher" />
                    <Bar dataKey="Supervisor" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
