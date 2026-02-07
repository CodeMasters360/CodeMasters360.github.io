# QR Code Reader Application

A simple and elegant QR code reader application built with PyQt5.

## Features
- Browse and select image files containing QR codes
- Paste images directly from Windows clipboard
- Decode QR codes and display content
- Copy decoded content to clipboard
- Support for multiple image formats (PNG, JPG, JPEG, BMP, GIF)

## Installation

1. Install Python 3.8 or higher
2. Install required packages:
```bash
pip install -r requirements.txt
```

## Running the Application

```bash
python qr_reader.py
```

## Converting to EXE File

### Method 1: Simple EXE (one file)
```bash
pyinstaller --onefile --windowed --name="QRCodeReader" qr_reader.py
```

### Method 2: EXE with icon (if you have an icon file)
```bash
pyinstaller --onefile --windowed --name="QRCodeReader" --icon=icon.ico qr_reader.py
```

### Method 3: Folder with all dependencies
```bash
pyinstaller --windowed --name="QRCodeReader" qr_reader.py
```

### Important Notes for EXE Creation:

1. **Install zbar for pyzbar**: 
   - Download and install from: http://zbar.sourceforge.net/
   - Or on Windows, pyzbar may need additional DLL files
   - Add `--add-binary` flag if needed:
   ```bash
   pyinstaller --onefile --windowed --add-binary "C:\path\to\zbar\libiconv.dll;." --add-binary "C:\path\to\zbar\libzbar-64.dll;." qr_reader.py
   ```

2. After running PyInstaller:
   - Find your EXE in the `dist` folder
   - For `--onefile`: Single EXE file
   - For folder mode: Folder with EXE and dependencies

3. **Testing**: Always test the EXE on a clean system to ensure all dependencies are included.

## Usage

1. **Browse Image**: Click "Browse Image" button to select an image file from your computer
2. **Paste from Clipboard**: Copy an image to clipboard (Ctrl+C on an image), then click "Paste from Clipboard"
3. **View Results**: Decoded QR code content will appear in the text area
4. **Copy Content**: Click "Copy Content" to copy the decoded text to clipboard

## Troubleshooting

If the EXE doesn't work:
- Make sure Visual C++ Redistributable is installed on target system
- Try using folder mode instead of `--onefile`
- Check if antivirus is blocking the EXE
