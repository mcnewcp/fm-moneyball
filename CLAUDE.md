# FM Moneyball - Football Manager 2024 Data Analysis

Data-driven decision making for Football Manager 2024 gameplay.

## Project Overview

This codebase analyzes Football Manager 2024 data exports to support data-driven team management decisions. Process and score both squad data (current players) and shortlist data (scouting targets) using role weights and team DNA.

## Data Structure

### Squad Data
Squad exports are HTML tables with one row per player and 70 columns in three categories:

1. **Metadata** (5 columns): UID, Player, Position, Best Pos, Age
2. **Stats** (18 columns): Performance metrics from current season (Mins → Shot/90)
3. **Attributes** (46 columns): Player skills and abilities (Aer → Tec)
   - Values range 1-20 (higher is better)
   - Young/scouted players may have ranges (e.g., "7-10") indicating uncertainty

### Shortlist Data
Shortlist exports are HTML tables with 75 columns:

1. **Metadata** (11 columns): Rec (scout grade), Inf (info/status), Name, Position, Age, Transfer Value, Best Pos, Max AP, Min AP, Max WD, Min WD
2. **Stats** (18 columns): Same as squad (Mins → Shot/90)
3. **Attributes** (46 columns): Same attributes as squad but different order (Acc → Aer)

### Role Weights
Role weight files define attribute importance for each playing role (e.g., GK, CD BPD, WB A). Structure:
- One row per role, columns for each of the 46 attributes
- Weights indicate attribute importance (e.g., 0.5 = moderate, 1 = high, empty = not considered)
- Used to calculate role fit scores for players

### Team DNA
DNA files define team-wide attribute preferences applied to all roles. Structure:
- Single row with columns for each of the 46 attributes
- Sparse weights representing team philosophy (e.g., prioritizing Determination, Work Rate, Technique)
- Added to role weights to create team-specific role scoring

## File Organization

```
fm-moneyball/
├── input/
│   ├── squad/                  # Squad HTML exports
│   │   └── squad YYYY-MM-DD.html
│   ├── shortlist/              # Shortlist HTML exports
│   │   └── shortlist <desc> YYYY-MM-DD.html
│   ├── role-weights/           # Role attribute weight definitions
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
├── process_player_data.py      # Data import & cleaning (squad/shortlist)
├── score_player_data.py        # Role scoring (squad/shortlist)
├── process_squad.py            # Legacy: Squad-only processing
├── process_role_scores.py      # Legacy: Squad-only scoring
└── requirements.txt            # Python dependencies
```

## Data Pipeline

### Data Processing (`process_player_data.py`)

**Usage:**
```bash
python process_player_data.py --squad                        # Process most recent squad
python process_player_data.py --squad "squad 2023-08-07.html"
python process_player_data.py --shortlist                    # Process most recent shortlist
python process_player_data.py --shortlist "shortlist loan AMLR 2023-08-29.html"
```

**Data Cleaning:**
- Missing data: Replace "-" with empty strings
- Percentages: Convert "90%" to 0.90 (decimal)
- Range values: Convert "7-10" to 8.5 (midpoint)
- **Squad-specific:** Remove " - Pick Player" from player names
- **Shortlist-specific:**
  - Prices: "$7M" → 7000000, "$250K" → 250000
  - Wages: "$423,000 p/a" → 423000
  - Scout grades: "- - C -" → "C", "- - C - -" → "C-"

**Output:** Clean CSV in `output/squad/` or `output/shortlist/`

### Role Scoring (`score_player_data.py`)

**Usage:**
```bash
python score_player_data.py --squad                          # Auto-find latest files
python score_player_data.py --squad "squad 2023-08-07.csv"  # Specify squad
python score_player_data.py --squad "squad 2023-08-07.csv" "role-weights-1.csv" "dna-1.csv"
python score_player_data.py --shortlist                      # Auto-find latest
python score_player_data.py --shortlist "shortlist loan AMLR 2023-08-29.csv"
```

**Calculation:**
- Combines role weights + DNA weights (element-wise addition)
- Calculates weighted average: `sum(attribute × weight) / sum(weights)`
- Attributes matched by name (not position) for shortlist compatibility
- Scores typically range ~1-20

**Output:** CSV with original columns + one role score column per role

**Version Management:**
- Role weights/DNA use version numbers (`-1.csv`, `-2.csv`)
- Auto-selects highest version when not specified

## Development Notes

- Virtual environment: `.venv`
- HTML exports maintain consistent column order and naming within each type (squad/shortlist)
- Shortlist attributes in different order than squad; scripts match by name
- Player attributes change over time (development/decline)
- Some players may have incomplete data (no game time → stats are dashes)
- Legacy scripts (`process_squad.py`, `process_role_scores.py`) maintained for backward compatibility
