import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const app = express();
const PORT = 3001;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Paths relative to the monorepo root
const ROOT_DIR = path.resolve(__dirname, '../..');
const SQUAD_DIR = path.join(ROOT_DIR, 'output/squad');
const DEPTH_CHART_DIR = path.join(ROOT_DIR, 'output/depth-chart');

// Role score column names
const POSITION_COLUMNS = [
  'SK-At',
  'BPD-De',
  'CD-Co',
  'IWB-Su',
  'IWB-De',
  'DM-Su',
  'CM-At',
  'MEZ-Su',
  'IW-Su',
  'W-At',
  'P-At',
];

interface RawPlayerRow {
  UID: string;
  Player: string;
  Position: string;
  'Best Pos': string;
  Age: string;
  Type: string;
  [key: string]: string;
}

interface Player {
  uid: string;
  name: string;
  position: string;
  bestPos: string;
  age: number;
  type: string;
  scores: Record<string, number>;
}

/**
 * Find the most recent file matching a pattern in a directory
 */
function findMostRecentFile(dir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir).filter((f) => pattern.test(f));

  if (files.length === 0) {
    return null;
  }

  // Sort by modification time (most recent first)
  files.sort((a, b) => {
    const statA = fs.statSync(path.join(dir, a));
    const statB = fs.statSync(path.join(dir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });

  return files[0];
}

/**
 * Parse squad CSV and extract player data with scores
 */
function parseSquadCSV(filePath: string): Player[] {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse<RawPlayerRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row) => {
    const scores: Record<string, number> = {};

    for (const pos of POSITION_COLUMNS) {
      const value = row[pos];
      if (value && value !== '-' && value !== '') {
        scores[pos] = parseFloat(value);
      }
    }

    return {
      uid: row.UID,
      name: row.Player,
      position: row.Position,
      bestPos: row['Best Pos'],
      age: parseInt(row.Age, 10) || 0,
      type: row.Type || 'Full Contract',
      scores,
    };
  });
}

// GET /api/squad - Load most recent scored squad CSV
app.get('/api/squad', (req: Request, res: Response) => {
  try {
    const filename = findMostRecentFile(SQUAD_DIR, /scored\.csv$/i);

    if (!filename) {
      res.status(404).json({
        error: 'No scored squad file found',
        message: 'Please run the scoring script first',
      });
      return;
    }

    const filePath = path.join(SQUAD_DIR, filename);
    const players = parseSquadCSV(filePath);

    res.json({
      players,
      filename,
      count: players.length,
    });
  } catch (error) {
    console.error('Error loading squad:', error);
    res.status(500).json({
      error: 'Failed to load squad data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/depth-chart - Load most recent depth chart
app.get('/api/depth-chart', (req: Request, res: Response) => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(DEPTH_CHART_DIR)) {
      fs.mkdirSync(DEPTH_CHART_DIR, { recursive: true });
    }

    const filename = findMostRecentFile(DEPTH_CHART_DIR, /\.json$/i);

    if (!filename) {
      // Return empty depth chart structure
      const emptyChart = {
        version: 1,
        createdAt: null,
        squadFile: null,
        positions: Object.fromEntries(
          POSITION_COLUMNS.map((pos) => [
            pos,
            {
              first: { playerId: null },
              second: { playerId: null },
              third: { playerId: null },
            },
          ])
        ),
      };

      res.json({
        depthChart: emptyChart,
        filename: null,
        isNew: true,
      });
      return;
    }

    const filePath = path.join(DEPTH_CHART_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const depthChart = JSON.parse(content);

    res.json({
      depthChart,
      filename,
      isNew: false,
    });
  } catch (error) {
    console.error('Error loading depth chart:', error);
    res.status(500).json({
      error: 'Failed to load depth chart',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/depth-chart - Save depth chart
app.post('/api/depth-chart', (req: Request, res: Response) => {
  try {
    const { depthChart } = req.body;

    if (!depthChart) {
      res.status(400).json({
        error: 'Missing depth chart data',
      });
      return;
    }

    // Ensure directory exists
    if (!fs.existsSync(DEPTH_CHART_DIR)) {
      fs.mkdirSync(DEPTH_CHART_DIR, { recursive: true });
    }

    // Generate timestamped filename
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `depth-chart-${timestamp}.json`;
    const filePath = path.join(DEPTH_CHART_DIR, filename);

    // Update metadata
    depthChart.createdAt = now.toISOString();
    depthChart.version = depthChart.version || 1;

    // Write file
    fs.writeFileSync(filePath, JSON.stringify(depthChart, null, 2));

    console.log(`Saved depth chart to: ${filePath}`);

    res.json({
      success: true,
      filename,
      path: filePath,
    });
  } catch (error) {
    console.error('Error saving depth chart:', error);
    res.status(500).json({
      error: 'Failed to save depth chart',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler - catches any unhandled errors
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Squad directory: ${SQUAD_DIR}`);
  console.log(`Depth chart directory: ${DEPTH_CHART_DIR}`);
});
