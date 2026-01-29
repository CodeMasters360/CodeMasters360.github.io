import os
from send2trash import send2trash

def move_to_recycle_bin(file_paths):
    """Move files to Windows Recycle Bin."""
    success = []
    failed = []
    
    for file_path in file_paths:
        try:
            # Normalize path to use Windows backslashes
            normalized_path = os.path.normpath(file_path)
            
            if os.path.exists(normalized_path):
                send2trash(normalized_path)
                success.append(file_path)
            else:
                failed.append(f"{file_path} (File not found)")
        except Exception as e:
            failed.append(f"{file_path} ({str(e)})")
            
    return success, failed
