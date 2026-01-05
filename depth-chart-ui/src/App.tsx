import { useSquadData } from './hooks/useSquadData';
import { useDepthChart } from './hooks/useDepthChart';
import { DepthChart } from './components/DepthChart';
import './styles/globals.css';

function App() {
  const {
    players,
    filename: squadFilename,
    loading: squadLoading,
    error: squadError,
  } = useSquadData();

  const {
    depthChart,
    loading: chartLoading,
    error: chartError,
    saving,
    assignPlayer,
    save,
    getAssignedPlayerIds,
    hasUnsavedChanges,
  } = useDepthChart();

  const loading = squadLoading || chartLoading;
  const error = squadError || chartError;

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <p className="error-hint">
            Make sure you have processed and scored squad data in output/squad/
          </p>
        </div>
      </div>
    );
  }

  if (!depthChart) {
    return (
      <div className="app-container">
        <div className="error">
          <h2>No Data</h2>
          <p>Unable to initialize depth chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <DepthChart
        players={players}
        depthChart={depthChart}
        onAssignPlayer={assignPlayer}
        onSave={save}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
        getAssignedPlayerIds={getAssignedPlayerIds}
      />
      <footer className="app-footer">
        <span>Squad: {squadFilename}</span>
        <span>{players.length} players</span>
      </footer>
    </div>
  );
}

export default App;
