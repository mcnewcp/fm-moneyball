#!/usr/bin/env python3
"""
Football Manager Role Scoring Pipeline

Scores each player (squad or shortlist) against defined roles using weighted attributes.
Combines role-specific weights with team DNA to calculate role fit scores.

Usage:
    python score_player_data.py --squad
        # Process most recent squad, role-weights, and DNA files

    python score_player_data.py --squad "squad 2023-08-07.csv"
        # Process specific squad file, auto-find role-weights and DNA

    python score_player_data.py --squad "squad 2023-08-07.csv" "role-weights-1.csv" "dna-1.csv"
        # Process specific files for all inputs

    python score_player_data.py --shortlist
        # Process most recent shortlist file

    python score_player_data.py --shortlist "shortlist loan AMLR 2023-08-29.csv"
        # Process specific shortlist file
"""

import sys
import re
import argparse
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np


ROLE_WEIGHTS_DIR = Path("input/role-weights")
DNA_DIR = Path("input/dna")


def get_directories(data_type):
    """Get input and output directories based on data type."""
    if data_type == "squad":
        return Path("output/squad"), Path("output/squad")
    elif data_type == "shortlist":
        return Path("output/shortlist"), Path("output/shortlist")
    else:
        raise ValueError(f"Invalid data type: {data_type}")


def find_most_recent_file(directory, pattern, file_type):
    """Find the most recent file based on version number or date in filename."""
    files = list(directory.glob(pattern))

    if not files:
        raise FileNotFoundError(f"No {file_type} files found in {directory}")

    # For files with version numbers (e.g., role-weights-1.csv, dna-2.csv)
    if "role-weights" in pattern or "dna" in pattern:
        file_versions = []
        for file in files:
            # Extract version number from filename
            match = re.search(r'-(\d+)\.csv', file.name)
            if match:
                version = int(match.group(1))
                file_versions.append((version, file))

        if not file_versions:
            raise ValueError(f"No valid {file_type} files with version numbers found")

        file_versions.sort(reverse=True)
        most_recent = file_versions[0][1]
        print(f"Using most recent {file_type}: {most_recent.name}")
        return most_recent

    # For player files with dates (squad or shortlist)
    else:
        file_dates = []
        for file in files:
            # Try to extract date from filename (works for both squad and shortlist)
            match = re.search(r'(\d{4}-\d{2}-\d{2})\.csv', file.name)
            if match:
                date_str = match.group(1)
                try:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    file_dates.append((date_obj, file))
                except ValueError:
                    print(f"Warning: Could not parse date from filename: {file.name}")
                    continue

        if not file_dates:
            raise ValueError(f"No valid {file_type} files with proper date format found")

        file_dates.sort(reverse=True)
        most_recent = file_dates[0][1]
        print(f"Using most recent {file_type}: {most_recent.name}")
        return most_recent


def extract_date_from_filename(filename):
    """Extract date string from filename (e.g., 'squad 2023-08-07.csv' -> '2023-08-07')."""
    match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1)
    raise ValueError(f"Could not extract date from filename: {filename}")


def calculate_role_scores(player_df, role_weights_df, dna_df):
    """
    Calculate role fit scores for each player.

    Args:
        player_df: DataFrame with player data including attributes
        role_weights_df: DataFrame with role names and attribute weights
        dna_df: DataFrame with team DNA attribute weights (single row)

    Returns:
        DataFrame with original player data plus role score columns

    Note:
        Attributes are matched by NAME, not position, to handle different
        column orders in squad vs shortlist data.
    """
    # Get attribute columns (all columns that exist in role_weights except 'Role')
    attribute_cols = [col for col in role_weights_df.columns if col != 'Role']

    # Verify these columns exist in player data
    missing_cols = [col for col in attribute_cols if col not in player_df.columns]
    if missing_cols:
        raise ValueError(f"Player data missing attribute columns: {missing_cols}")

    # Extract DNA weights (single row) and convert to numeric
    dna_weights = dna_df[attribute_cols].iloc[0]
    dna_weights = pd.to_numeric(dna_weights, errors='coerce').fillna(0)

    # Convert player attributes to numeric, replacing empty strings with NaN
    player_attrs = player_df[attribute_cols].copy()
    for col in attribute_cols:
        player_attrs[col] = pd.to_numeric(player_attrs[col], errors='coerce')

    # Create a copy of player data for output
    result_df = player_df.copy()

    # Calculate score for each role
    for idx, role_row in role_weights_df.iterrows():
        role_name = role_row['Role']
        role_weights = role_row[attribute_cols]

        # Combine role weights with DNA weights
        # Convert role weights to numeric and replace NaN with 0
        role_weights = pd.to_numeric(role_weights, errors='coerce').fillna(0)
        combined_weights = role_weights + dna_weights

        # Calculate weighted scores for each player
        role_scores = []
        for player_idx, player_attrs_row in player_attrs.iterrows():
            # Fill missing (NaN) values with 0
            player_attrs_filled = player_attrs_row.fillna(0)

            # Only include attributes that have a non-zero weight
            weight_mask = combined_weights != 0

            if weight_mask.sum() == 0:
                # No weighted attributes for this role
                role_scores.append(np.nan)
            else:
                # Calculate weighted average with missing attributes as zeros
                weighted_sum = (player_attrs_filled[weight_mask] * combined_weights[weight_mask]).sum()
                total_weight = combined_weights[weight_mask].sum()
                score = weighted_sum / total_weight
                role_scores.append(score)

        # Add role score column to result
        result_df[role_name] = role_scores

    return result_df


def generate_output_filename(input_filename, data_type):
    """Generate output filename based on input filename and data type."""
    # Extract date from filename
    in_game_date = extract_date_from_filename(input_filename)

    if data_type == "squad":
        return f"squad {in_game_date} scored.csv"
    else:  # shortlist
        # For shortlist, preserve the descriptive part of the filename
        # e.g., "shortlist loan AMLR 2023-08-29.csv" -> "shortlist loan AMLR 2023-08-29 scored.csv"
        stem = Path(input_filename).stem
        return f"{stem} scored.csv"


def main():
    """Main pipeline execution."""
    parser = argparse.ArgumentParser(description="Score Football Manager player data against roles")

    # Require either --squad or --shortlist
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--squad", action="store_true", help="Score squad data")
    group.add_argument("--shortlist", action="store_true", help="Score shortlist data")

    # Optional arguments
    parser.add_argument("player_file", nargs="?", default=None,
                       help="Player CSV file to process (optional, defaults to most recent)")
    parser.add_argument("role_weights_file", nargs="?", default=None,
                       help="Role weights CSV file (optional, defaults to most recent)")
    parser.add_argument("dna_file", nargs="?", default=None,
                       help="DNA CSV file (optional, defaults to most recent)")

    args = parser.parse_args()

    # Determine data type
    data_type = "squad" if args.squad else "shortlist"

    # Get directories
    player_input_dir, output_dir = get_directories(data_type)

    # Parse arguments
    player_file = None
    role_weights_file = None
    dna_file = None

    if args.player_file:
        player_file = player_input_dir / args.player_file
        if not player_file.exists():
            print(f"Error: Player file '{player_file}' not found")
            sys.exit(1)
        print(f"Using specified player file: {args.player_file}")

    if args.role_weights_file:
        role_weights_file = ROLE_WEIGHTS_DIR / args.role_weights_file
        if not role_weights_file.exists():
            print(f"Error: Role weights file '{role_weights_file}' not found")
            sys.exit(1)
        print(f"Using specified role weights file: {args.role_weights_file}")

    if args.dna_file:
        dna_file = DNA_DIR / args.dna_file
        if not dna_file.exists():
            print(f"Error: DNA file '{dna_file}' not found")
            sys.exit(1)
        print(f"Using specified DNA file: {args.dna_file}")

    # Find most recent files if not specified
    if player_file is None:
        if data_type == "squad":
            pattern = "squad *.csv"
        else:
            pattern = "shortlist *.csv"

        player_file = find_most_recent_file(player_input_dir, pattern, data_type)

    if role_weights_file is None:
        role_weights_file = find_most_recent_file(ROLE_WEIGHTS_DIR, "role-weights-*.csv", "role weights")

    if dna_file is None:
        dna_file = find_most_recent_file(DNA_DIR, "dna-*.csv", "DNA")

    # Load data
    print("\nLoading data...")
    player_df = pd.read_csv(player_file)
    print(f"  Loaded {len(player_df)} players from {data_type} file")

    role_weights_df = pd.read_csv(role_weights_file)
    # Convert attribute columns to numeric to avoid dtype warnings
    attribute_cols = [col for col in role_weights_df.columns if col != 'Role']
    for col in attribute_cols:
        role_weights_df[col] = pd.to_numeric(role_weights_df[col], errors='coerce')
    print(f"  Loaded {len(role_weights_df)} roles from role weights file")

    dna_df = pd.read_csv(dna_file)
    # Convert attribute columns to numeric to avoid dtype warnings
    for col in attribute_cols:
        dna_df[col] = pd.to_numeric(dna_df[col], errors='coerce')
    print(f"  Loaded team DNA configuration")

    # Calculate role scores
    print("\nCalculating role scores...")
    scored_df = calculate_role_scores(player_df, role_weights_df, dna_df)

    role_cols = role_weights_df['Role'].tolist()
    print(f"  Calculated scores for {len(role_cols)} roles")

    # Generate output filename
    output_filename = generate_output_filename(player_file.name, data_type)
    output_file = output_dir / output_filename

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write to CSV
    print(f"\nWriting to {output_file}...")
    scored_df.to_csv(output_file, index=False, encoding='utf-8')

    print(f"\n✓ Successfully calculated role scores for {data_type} data")
    print(f"  Player input:       {player_file}")
    print(f"  Role weights input: {role_weights_file}")
    print(f"  DNA input:          {dna_file}")
    print(f"  Output:             {output_file}")
    print(f"  Players:            {len(scored_df)}")
    print(f"  Roles scored:       {len(role_cols)}")


if __name__ == "__main__":
    main()
