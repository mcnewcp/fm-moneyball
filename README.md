# FM Moneyball

Data-driven decision making for Football Manager 2024.

## Quick Start

### Python Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Process & Score Data
```bash
# Export squad/shortlist from FM24 as HTML to input/squad/ or input/shortlist/

# Process and score squad
python process_player_data.py --squad
python score_player_data.py --squad

# Process and score shortlist
python process_player_data.py --shortlist
python score_player_data.py --shortlist
```

### Depth Chart UI
```bash
cd depth-chart-ui
npm install
npm run dev
```
Open http://localhost:5173 - requires scored squad data in `output/squad/`.

## File Structure

```
fm-moneyball/
├── input/
│   ├── squad/           # Squad HTML exports
│   ├── shortlist/       # Shortlist HTML exports
│   ├── role-weights/    # Role attribute weights
│   └── dna/             # Team DNA configs
├── output/
│   ├── squad/           # Processed & scored CSVs
│   ├── shortlist/       # Processed & scored CSVs
│   └── depth-chart/     # Saved depth charts (JSON)
├── depth-chart-ui/      # React UI for depth chart
├── process_player_data.py
├── score_player_data.py
└── requirements.txt
```

## Scoring

Role scores = weighted average of player attributes using role weights + team DNA.
Scores range ~1-20 based on FM attribute scale.
