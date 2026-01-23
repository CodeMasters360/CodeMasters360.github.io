# Duplicate Finder

A Python-based duplicate file finder with PyQt5 GUI.

## Installation

1. Install Python 3.8 or higher
2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

Run the application:
```bash
python main.py
```

## Features

- Multiple target path scanning
- Path exclusion (blacklist)
- Extension filtering
- Multiple detection methods (checksum, name+size, size only, size+date)
- Smart selection for bulk deletion
- Safe deletion to Recycle Bin
- Full Unicode support for file paths
- Sortable results table
- Context menu operations
- Error handling with copyable messages

## Structure

- `main.py` - Application entry point
- `ui/` - User interface components
- `scanner/` - File scanning and duplicate detection logic
- `utils/` - Utility functions
