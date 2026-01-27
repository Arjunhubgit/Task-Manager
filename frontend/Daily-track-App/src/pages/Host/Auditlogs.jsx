import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { Activity, Shield, Clock, User, FileText } from "lucide-react";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.REPORTS.GET_AUDIT_LOGS);
        setLogs(res.data);
      } catch (error) {
        console.error("Audit Log Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionColor = (action) => {
    if (action.includes("CREATE")) return "bg-green-500/10 text-green-400 border-green-500/20";
    if (action.includes("UPDATE")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (action.includes("DELETE")) return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  };

  const getActionIcon = (action) => {
    if (action.includes("CREATE")) return "✨";
    if (action.includes("UPDATE")) return "📝";
    if (action.includes("DELETE")) return "🗑️";
    return "⚙️";
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#EA8D23]"></div>
          <p className="text-gray-400">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
          <Activity className="w-6 h-6 text-[#EA8D23]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">System Activity Log</h2>
          <p className="text-gray-400 text-sm">Recent admin actions and changes</p>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">No activity logs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Admin</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Action</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Target</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.slice(0, 8).map((log) => (
                  <tr 
                    key={log._id} 
                    className="hover:bg-white/5 transition-colors duration-200 group"
                  >
                    {/* Admin Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#EA8D23]/20 border border-[#EA8D23]/40 flex items-center justify-center">
                          <User className="w-4 h-4 text-[#EA8D23]" />
                        </div>
                        <span className="font-medium text-white group-hover:text-[#EA8D23] transition-colors">
                          {log.adminId?.name || "System"}
                        </span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${getActionColor(log.action)} hover:shadow-lg hover:shadow-current/20`}>
                        <span>{getActionIcon(log.action)}</span>
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300 truncate max-w-xs">{log.target}</span>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Clock className="w-4 h-4 opacity-60" />
                        <span title={new Date(log.createdAt).toLocaleString()}>
                          {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View All Link */}
      {logs.length > 8 && (
        <div className="mt-4 text-center">
          <a 
            href="/host/audit-logs"
            className="inline-flex items-center gap-2 text-[#EA8D23] hover:text-[#ff9d3d] font-semibold transition-colors text-sm"
          >
            View all activity logs
            <span>→</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;