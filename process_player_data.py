#!/usr/bin/env python3
"""
Football Manager Player Data Import Pipeline

Processes HTML player exports (squad or shortlist) from Football Manager 2024,
cleans the data, and outputs to CSV format.

Usage:
    python process_player_data.py --squad                      # Process most recent squad file
    python process_player_data.py --squad "squad 2023-08-07.html"  # Process specific squad file
    python process_player_data.py --shortlist                  # Process most recent shortlist file
    python process_player_data.py --shortlist "shortlist loan AMLR 2023-08-29.html"  # Process specific shortlist file
"""

import sys
import re
import argparse
from pathlib import Path
from datetime import datetime
import pandas as pd
from bs4 import BeautifulSoup


def get_directories(data_type):
    """Get input and output directories based on data type."""
    if data_type == "squad":
        return Path("input/squad"), Path("output/squad")
    elif data_type == "shortlist":
        return Path("input/shortlist"), Path("output/shortlist")
    else:
        raise ValueError(f"Invalid data type: {data_type}")


def find_most_recent_file(data_type):
    """Find the most recent file based on date in filename."""
    input_dir, _ = get_directories(data_type)

    if data_type == "squad":
        pattern = "squad *.html"
        regex_pattern = r'squad (\d{4}-\d{2}-\d{2})\.html'
    else:  # shortlist
        pattern = "shortlist *.html"
        regex_pattern = r'shortlist .* (\d{4}-\d{2}-\d{2})\.html'

    files = list(input_dir.glob(pattern))

    if not files:
        raise FileNotFoundError(f"No {data_type} HTML files found in {input_dir}")

    # Extract dates from filenames and find the most recent
    file_dates = []
    for file in files:
        match = re.search(regex_pattern, file.name)
        if match:
            date_str = match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                file_dates.append((date_obj, file))
            except ValueError:
                print(f"Warning: Could not parse date from filename: {file.name}")
                continue

    if not file_dates:
        raise ValueError(f"No valid {data_type} files with proper date format found")

    # Sort by date and return the most recent
    file_dates.sort(reverse=True)
    most_recent = file_dates[0][1]
    print(f"Processing most recent file: {most_recent.name}")
    return most_recent


def parse_html_table(html_file):
    """Parse HTML table and return pandas DataFrame."""
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table')

    if not table:
        raise ValueError(f"No table found in {html_file}")

    # Extract headers
    headers = []
    header_row = table.find('tr')
    for th in header_row.find_all('th'):
        headers.append(th.get_text(strip=True))

    # Extract data rows
    data = []
    for row in table.find_all('tr')[1:]:  # Skip header row
        cells = row.find_all('td')
        if cells:
            row_data = [cell.get_text(strip=True) for cell in cells]
            data.append(row_data)

    df = pd.DataFrame(data, columns=headers)
    return df


def clean_player_name(name):
    """Remove ' - Pick Player' suffix from player names."""
    if pd.isna(name) or name == "":
        return name
    return name.replace(" - Pick Player", "")


def clean_missing_value(value):
    """Replace dashes with empty strings."""
    if value == "-":
        return ""
    return value


def convert_percentage(value):
    """Convert percentage strings to decimal (e.g., '90%' -> 0.90)."""
    if pd.isna(value) or value == "" or value == "-":
        return ""

    if isinstance(value, str) and "%" in value:
        try:
            numeric = float(value.replace("%", ""))
            return numeric / 100.0
        except ValueError:
            return value
    return value


def convert_range_to_midpoint(value):
    """Convert range values to midpoint (e.g., '1-4' -> 2.5)."""
    if pd.isna(value) or value == "" or value == "-":
        return ""

    if isinstance(value, str) and "-" in value and not value.startswith("-"):
        # Check if it's a range (e.g., "1-4") and not a negative number
        parts = value.split("-")
        if len(parts) == 2:
            try:
                start = float(parts[0])
                end = float(parts[1])
                return (start + end) / 2.0
            except ValueError:
                return value
    return value


def clean_rec_grade(value):
    """Clean recommendation grade (e.g., '- - C - ' -> 'C', '- - C - -' -> 'C-')."""
    if pd.isna(value) or value == "" or value == "-":
        return ""

    if not isinstance(value, str):
        return value

    # Remove leading and trailing dashes and spaces
    cleaned = value.strip()

    # Replace multiple spaces with single space
    cleaned = re.sub(r'\s+', ' ', cleaned)

    # Remove dashes that are separated by spaces (decorative dashes)
    # Pattern: "- - C -" or "- - C - -"
    # Keep dashes that are part of the grade (like "C-" or "B+")
    parts = cleaned.split()

    # Filter out standalone dashes
    grade_parts = [part for part in parts if part != "-"]

    # Join remaining parts (should be the grade with its modifier if any)
    if grade_parts:
        return ''.join(grade_parts)

    return ""


def clean_price_value(value):
    """Convert price string to numeric (e.g., '$7M' -> 7000000, '$250K' -> 250000)."""
    if pd.isna(value) or value == "" or value == "-":
        return ""

    if not isinstance(value, str):
        return value

    # Remove dollar sign, spaces, and commas
    cleaned = value.replace("$", "").replace(",", "").strip()

    # Handle K (thousands) and M (millions)
    multiplier = 1
    if cleaned.endswith("M"):
        multiplier = 1_000_000
        cleaned = cleaned[:-1]
    elif cleaned.endswith("K"):
        multiplier = 1_000
        cleaned = cleaned[:-1]

    try:
        numeric = float(cleaned)
        return numeric * multiplier
    except ValueError:
        return value


def clean_wage_value(value):
    """Convert wage string to numeric (e.g., '$423,000 p/a' -> 423000)."""
    if pd.isna(value) or value == "" or value == "-":
        return ""

    if not isinstance(value, str):
        return value

    # Remove dollar sign, commas, and "p/a"
    cleaned = value.replace("$", "").replace(",", "").replace("p/a", "").strip()

    try:
        return float(cleaned)
    except ValueError:
        return value


def clean_player_data(df, data_type):
    """Apply all data cleaning transformations based on data type."""
    df_clean = df.copy()

    # Squad-specific cleaning
    if data_type == "squad":
        if "Player" in df_clean.columns:
            df_clean["Player"] = df_clean["Player"].apply(clean_player_name)

    # Shortlist-specific cleaning
    elif data_type == "shortlist":
        # Clean recommendation grades
        if "Rec" in df_clean.columns:
            df_clean["Rec"] = df_clean["Rec"].apply(clean_rec_grade)

        # Clean price columns
        if "Max AP" in df_clean.columns:
            df_clean["Max AP"] = df_clean["Max AP"].apply(clean_price_value)
            df_clean.rename(columns={"Max AP": "Max AP (USD)"}, inplace=True)

        if "Min AP" in df_clean.columns:
            df_clean["Min AP"] = df_clean["Min AP"].apply(clean_price_value)
            df_clean.rename(columns={"Min AP": "Min AP (USD)"}, inplace=True)

        # Clean wage columns
        if "Max WD" in df_clean.columns:
            df_clean["Max WD"] = df_clean["Max WD"].apply(clean_wage_value)
            df_clean.rename(columns={"Max WD": "Max WD (USD p/a)"}, inplace=True)

        if "Min WD" in df_clean.columns:
            df_clean["Min WD"] = df_clean["Min WD"].apply(clean_wage_value)
            df_clean.rename(columns={"Min WD": "Min WD (USD p/a)"}, inplace=True)

    # Replace all dashes with empty strings (applies to both types)
    df_clean = df_clean.map(clean_missing_value)

    # Identify percentage columns (columns that contain "%" in their values)
    for col in df_clean.columns:
        # Check if column contains percentage values
        sample_values = df_clean[col].dropna().head(10)
        if any("%" in str(val) for val in sample_values):
            df_clean[col] = df_clean[col].apply(convert_percentage)

    # Convert range values to midpoints (for all columns except metadata columns)
    if data_type == "squad":
        metadata_cols = ["UID", "Player", "Position", "Best Pos", "Age"]
    else:  # shortlist
        metadata_cols = ["Rec", "Inf", "Name", "Position", "Age", "Transfer Value", "Best Pos",
                        "Max AP (USD)", "Min AP (USD)", "Max WD (USD p/a)", "Min WD (USD p/a)"]

    for col in df_clean.columns:
        if col not in metadata_cols:
            df_clean[col] = df_clean[col].apply(convert_range_to_midpoint)

    return df_clean


def main():
    """Main pipeline execution."""
    parser = argparse.ArgumentParser(description="Process Football Manager player data (squad or shortlist)")

    # Require either --squad or --shortlist
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--squad", action="store_true", help="Process squad data")
    group.add_argument("--shortlist", action="store_true", help="Process shortlist data")

    # Optional filename argument
    parser.add_argument("filename", nargs="?", default=None,
                       help="Specific HTML file to process (optional, defaults to most recent)")

    args = parser.parse_args()

    # Determine data type
    data_type = "squad" if args.squad else "shortlist"

    # Get directories
    input_dir, output_dir = get_directories(data_type)

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Determine which file to process
    if args.filename:
        input_file = input_dir / args.filename
        if not input_file.exists():
            print(f"Error: File '{input_file}' not found")
            sys.exit(1)
        print(f"Processing specified file: {args.filename}")
    else:
        input_file = find_most_recent_file(data_type)

    # Parse HTML
    print("Parsing HTML table...")
    df = parse_html_table(input_file)
    print(f"Loaded {len(df)} players with {len(df.columns)} columns")

    # Clean data
    print("Cleaning data...")
    df_clean = clean_player_data(df, data_type)

    # Generate output filename
    output_filename = input_file.stem + ".csv"
    output_file = output_dir / output_filename

    # Write to CSV
    print(f"Writing to {output_file}...")
    df_clean.to_csv(output_file, index=False, encoding='utf-8')

    print(f"✓ Successfully processed {data_type} data")
    print(f"  Input:  {input_file}")
    print(f"  Output: {output_file}")
    print(f"  Rows:   {len(df_clean)}")


if __name__ == "__main__":
    main()
