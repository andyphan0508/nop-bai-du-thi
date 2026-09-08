import { useState } from "react";
import { MdAdminPanelSettings, MdBarChart, MdErrorOutline, MdRefresh } from "react-icons/md";
import { submissionApi } from "../../../api/submissionApi";
import type { VoteResult } from "../../../types";

const AdminResultsPanel = () => {
  const [adminKey, setAdminKey] = useState<string>(() => sessionStorage.getItem("adminKey") || "");
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeyChange = (key: string) => {
    setAdminKey(key);
    sessionStorage.setItem("adminKey", key);
  };

  const fetchResults = async () => {
    if (!adminKey.trim()) {
      setError("Nhập mã quản trị để xem kết quả.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await submissionApi.getVoteResults(adminKey.trim());
      if (!response.ok) throw new Error(response.error || "Không tải được kết quả.");
      setResults(response.results || []);
      setTotalVotes(response.totalVotes || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const maxVotes = results && results.length > 0 ? Math.max(1, ...results.map((r) => r.votes)) : 1;

  return (
    <div className="panel admin-results">
      <div className="panel-head">
        <h2>
          <MdBarChart size={22} />
          Kết quả bình chọn
        </h2>
        <button className={isLoading ? "refresh spin" : "refresh"} type="button" title="Tải kết quả" onClick={fetchResults}>
          <MdRefresh size={20} />
        </button>
      </div>

      <div className="admin-box">
        <MdAdminPanelSettings size={18} />
        <input
          className="input admin-input"
          type="password"
          value={adminKey}
          placeholder="Mã quản trị"
          onChange={(event) => handleKeyChange(event.target.value)}
        />
      </div>

      {error && (
        <div className="list-note">
          <MdErrorOutline size={16} />
          {error}
        </div>
      )}

      {results && (
        <>
          <div className="counter-box">
            <div className="counter">{totalVotes}</div>
            <div className="counter-label">tổng số phiếu bầu</div>
          </div>
          <ul className="result-list">
            {results.map((result, index) => (
              <li key={result.id} className="result-row">
                <span className="result-rank">{index + 1}</span>
                <div className="result-info">
                  <div className="result-title">{result.title}</div>
                  <div className="result-sub">
                    {result.name} · {result.group}
                  </div>
                  <div className="result-bar-track">
                    <div className="result-bar" style={{ width: `${(result.votes / maxVotes) * 100}%` }} />
                  </div>
                </div>
                <span className="result-votes">{result.votes}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default AdminResultsPanel;
