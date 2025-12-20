import React, { useState, useEffect } from 'react';
import { AttendanceRecord, User } from '../../types';

interface AttendanceTrackerProps {
  user: User;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ user }) => {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [currentSession, setCurrentSession] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const storedLogs = localStorage.getItem('attendance_logs');
    if (storedLogs) setLogs(JSON.parse(storedLogs));

    const active = localStorage.getItem('active_session');
    if (active) setCurrentSession(JSON.parse(active));

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const simulateSMS = (action: string, time: string) => {
    const msg = `[SMS SIMULATION] To: Supervisor & ${user.name}\nMessage: Teacher clocked ${action} at ${time}.`;
    console.log(msg);
    alert(msg);
  };

  const handleClockIn = () => {
    const now = new Date();
    const newSession: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      date: now.toLocaleDateString(),
      clockIn: now.toISOString(),
    };
    setCurrentSession(newSession);
    localStorage.setItem('active_session', JSON.stringify(newSession));

    simulateSMS("IN", now.toLocaleTimeString());
  };

  const handleClockOut = () => {
    if (!currentSession) return;

    const now = new Date();
    const start = new Date(currentSession.clockIn);
    const diffMs = now.getTime() - start.getTime();
    const durationMins = Math.round(diffMs / 60000);

    const completedSession: AttendanceRecord = {
      ...currentSession,
      clockOut: now.toISOString(),
      duration: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
    };

    const updatedLogs = [completedSession, ...logs];
    setLogs(updatedLogs);
    setCurrentSession(null);
    localStorage.removeItem('active_session');
    localStorage.setItem('attendance_logs', JSON.stringify(updatedLogs));

    simulateSMS("OUT", now.toLocaleTimeString());
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Teacher Attendance</h2>
        <p className="text-slate-500 mb-8">Record your lesson delivery time. SMS notifications are sent automatically.</p>

        <div className="text-5xl font-mono text-slate-900 mb-8">
          {currentTime.toLocaleTimeString()}
        </div>

        <div className="flex justify-center space-x-4">
          {!currentSession ? (
            <button onClick={handleClockIn} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-all">Clock In</button>
          ) : (
            <button onClick={handleClockOut} className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-all">Clock Out</button>
          )}
        </div>

        {currentSession && (
          <div className="mt-6 text-emerald-600 font-medium animate-pulse">
            Active Session • Started at {new Date(currentSession.clockIn).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Recent Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Clock In</th>
                <th className="px-6 py-3 font-medium">Clock Out</th>
                <th className="px-6 py-3 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">{log.date}</td>
                  <td className="px-6 py-4">{new Date(log.clockIn).toLocaleTimeString()}</td>
                  <td className="px-6 py-4">{log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-4 text-emerald-600">{log.duration || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;