from PyQt5.QtCore import QThread, pyqtSignal
from scanner.duplicate_scanner import DuplicateScanner
import traceback

class FileScannerThread(QThread):
    progress = pyqtSignal(str)
    finished_signal = pyqtSignal(list)
    error = pyqtSignal(str)
    
    def __init__(self, target_paths, exclusion_paths, allowed_extensions, 
                 excluded_extensions, detection_method):
        super().__init__()
        self.target_paths = target_paths
        self.exclusion_paths = exclusion_paths
        self.allowed_extensions = allowed_extensions
        self.excluded_extensions = excluded_extensions
        self.detection_method = detection_method
        
    def run(self):
        try:
            scanner = DuplicateScanner(
                self.target_paths,
                self.exclusion_paths,
                self.allowed_extensions,
                self.excluded_extensions,
                self.detection_method
            )
            
            scanner.progress_callback = self.progress.emit
            duplicates = scanner.find_duplicates()
            self.finished_signal.emit(duplicates)
            
        except Exception as e:
            error_msg = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
            self.error.emit(error_msg)
