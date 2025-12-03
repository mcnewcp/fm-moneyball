# FM Moneyball

Data-driven decision making for Football Manager 2024 gameplay.

## Overview

FM Moneyball analyzes Football Manager 2024 data exports to support data-driven team management decisions. Process and score both **squad data** (your current players) and **shortlist data** (scouting targets) using customizable role weights and team DNA.

## Quick Start

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Process squad data
python process_player_data.py --squad

# Score squad against roles
python score_player_data.py --squad

# Process shortlist data
python process_player_data.py --shortlist

# Score shortlist against roles
python score_player_data.py --shortlist
```

## Data Pipeline

### 1. Export Data from FM24

**Squad Export:**
- In FM24, select your squad → Export → HTML format
- Save as `squad YYYY-MM-DD.html` in `input/squad/`

**Shortlist Export:**
- In FM24, open shortlist → Export → HTML format
- Save as `shortlist <description> YYYY-MM-DD.html` in `input/shortlist/`

### 2. Process Data

Convert HTML exports to clean CSV files.

**Squad:**
```bash
python process_player_data.py --squad                        # Most recent file
python process_player_data.py --squad "squad 2023-08-07.html"  # Specific file
```

**Shortlist:**
```bash
python process_player_data.py --shortlist                    # Most recent file
python process_player_data.py --shortlist "shortlist loan AMLR 2023-08-29.html"
```

**Data Cleaning:**
- Converts percentages to decimals (90% → 0.90)
- Resolves attribute ranges to midpoints (7-10 → 8.5)
- Replaces dashes with empty strings
- **Shortlist-specific:**
  - Converts prices: $7M → 7000000, $250K → 250000
  - Converts wages: $423,000 p/a → 423000
  - Cleans scout grades: "- - C -" → "C", "- - C - -" → "C-"

**Output:** Clean CSV in `output/squad/` or `output/shortlist/`

### 3. Score Players

Calculate role fit scores using role weights and team DNA.

**Squad:**
```bash
python score_player_data.py --squad                          # Auto-find latest files
python score_player_data.py --squad "squad 2023-08-07.csv"  # Specify squad file
python score_player_data.py --squad "squad 2023-08-07.csv" "role-weights-1.csv" "dna-1.csv"
```

**Shortlist:**
```bash
python score_player_data.py --shortlist                      # Auto-find latest files
python score_player_data.py --shortlist "shortlist loan AMLR 2023-08-29.csv"
```

**Output:** CSV with role scores added as columns (e.g., `squad 2023-08-07 scored.csv`)

## File Structure

```
fm-moneyball/
├── input/
│   ├── squad/                  # Squad HTML exports
│   │   └── squad YYYY-MM-DD.html
│   ├── shortlist/              # Shortlist HTML exports
│   │   └── shortlist <desc> YYYY-MM-DD.html
│   ├── role-weights/           # Role attribute definitions
│   │   └── role-weights-N.csv
│   └── dna/                    # Team DNA configurations
│       └── dna-N.csv
├── output/
│   ├── squad/                  # Processed squad CSVs
│   │   ├── squad YYYY-MM-DD.csv
│   │   └── squad YYYY-MM-DD scored.csv
│   └── shortlist/              # Processed shortlist CSVs
│       ├── shortlist <desc> YYYY-MM-DD.csv
│       └── shortlist <desc> YYYY-MM-DD scored.csv
├── process_player_data.py      # Data import & cleaning
├── score_player_data.py        # Role scoring engine
└── requirements.txt
```

## Data Structure

### Squad Data (70 columns)
1. **Metadata** (5): UID, Player, Position, Best Pos, Age
2. **Stats** (18): Mins → Shot/90
3. **Attributes** (46): Aer → Tec
4. **Role Scores** (added by scoring): One column per role

### Shortlist Data (75 columns)
1. **Metadata** (11): Rec, Inf, Name, Position, Age, Transfer Value, Best Pos, Max AP, Min AP, Max WD, Min WD
2. **Stats** (18): Mins → Shot/90
3. **Attributes** (46): Acc → Aer (different order than squad)
4. **Role Scores** (added by scoring): One column per role

### Role Weights
CSV with one row per role, columns for each of the 46 attributes. Weights indicate importance (0 = not considered, 0.5 = moderate, 1 = high).

### Team DNA
Single-row CSV with sparse weights representing team philosophy. Added to role weights during scoring.

## Scoring Methodology

For each role:
1. Combine role weights + DNA weights (element-wise addition)
2. For each player, calculate weighted average:
   ```
   score = sum(attribute × weight) / sum(weights)
   ```
   (Only includes valid attributes with non-zero weights)
3. Scores typically range 1-20 (scaled by FM attribute values)

**Note:** Attributes matched by **name**, not position, allowing shortlist compatibility despite different column order.

## Version Management

- Role weights and DNA use version numbers: `role-weights-1.csv`, `dna-2.csv`
- Scripts auto-select highest version when not specified
- Preserves history while iterating on role definitions

## Legacy Scripts

Original scripts still available for backward compatibility:
- `process_squad.py` - Squad-only processing
- `process_role_scores.py` - Squad-only scoring

Use new unified scripts (`process_player_data.py`, `score_player_data.py`) for all future work.

## Requirements

- Python 3.8+
- pandas >= 2.0.0
- beautifulsoup4 >= 4.12.0
- lxml >= 4.9.0
- numpy

## License

Personal project - use freely for your own FM24 analysis.
