import os
import hashlib
from datetime import datetime
from collections import defaultdict

class DuplicateScanner:
    def __init__(self, target_paths, exclusion_paths, allowed_extensions, 
                 excluded_extensions, detection_method):
        self.target_paths = target_paths
        self.exclusion_paths = exclusion_paths
        self.allowed_extensions = allowed_extensions
        self.excluded_extensions = excluded_extensions
        self.detection_method = detection_method
        self.progress_callback = None
        
    def find_duplicates(self):
        self.emit_progress("Scanning files...")
        files = self.scan_files()
        
        self.emit_progress(f"Found {len(files)} files. Analyzing...")
        
        if "Checksum (MD5)" in self.detection_method:
            return self.find_by_checksum(files, 'md5')
        elif "Checksum (SHA256)" in self.detection_method:
            return self.find_by_checksum(files, 'sha256')
        elif "Name + File Size" in self.detection_method:
            return self.find_by_name_size(files)
        elif "File Size Only" in self.detection_method:
            return self.find_by_size(files)
        elif "File Size + Modification Date" in self.detection_method:
            return self.find_by_size_date(files)
            
        return []
        
    def scan_files(self):
        files = []
        
        for target_path in self.target_paths:
            for root, dirs, filenames in os.walk(target_path):
                # Check if current directory should be excluded
                if self.is_excluded(root):
                    dirs.clear()  # Don't traverse subdirectories
                    continue
                    
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    
                    # Check extension filters
                    if not self.is_allowed_extension(filename):
                        continue
                        
                    try:
                        stat = os.stat(file_path)
                        files.append({
                            'full_path': file_path,
                            'name': filename,
                            'size': stat.st_size,
                            'modified': stat.st_mtime
                        })
                    except Exception:
                        continue
                        
        return files
        
    def is_excluded(self, path):
        for exclusion in self.exclusion_paths:
            if path.startswith(exclusion):
                return True
        return False
        
    def is_allowed_extension(self, filename):
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        
        # Check excluded extensions
        if self.excluded_extensions and ext in self.excluded_extensions:
            return False
            
        # Check allowed extensions
        if self.allowed_extensions is not None:
            return ext in self.allowed_extensions
            
        return True
        
    def find_by_checksum(self, files, algorithm):
        hash_map = defaultdict(list)
        
        for idx, file_info in enumerate(files):
            if idx % 100 == 0:
                self.emit_progress(f"Computing checksums... {idx}/{len(files)}")
                
            try:
                file_hash = self.compute_hash(file_info['full_path'], algorithm)
                hash_map[file_hash].append(file_info)
            except Exception:
                continue
                
        return self.format_duplicates(hash_map)
        
    def find_by_name_size(self, files):
        key_map = defaultdict(list)
        
        for file_info in files:
            key = (file_info['name'], file_info['size'])
            key_map[key].append(file_info)
            
        return self.format_duplicates(key_map)
        
    def find_by_size(self, files):
        size_map = defaultdict(list)
        
        for file_info in files:
            size_map[file_info['size']].append(file_info)
            
        return self.format_duplicates(size_map)
        
    def find_by_size_date(self, files):
        key_map = defaultdict(list)
        
        for file_info in files:
            key = (file_info['size'], int(file_info['modified']))
            key_map[key].append(file_info)
            
        return self.format_duplicates(key_map)
        
    def format_duplicates(self, grouped):
        duplicates = []
        
        for key, file_list in grouped.items():
            if len(file_list) > 1:
                formatted_group = []
                for file_info in file_list:
                    _, ext = os.path.splitext(file_info['name'])
                    formatted_group.append({
                        'full_path': file_info['full_path'],
                        'name': file_info['name'],
                        'extension': ext,
                        'size': file_info['size'],
                        'modified': datetime.fromtimestamp(file_info['modified']).strftime('%Y-%m-%d %H:%M:%S'),
                        'modified_timestamp': file_info['modified'],
                        'path': os.path.dirname(file_info['full_path'])
                    })
                duplicates.append(formatted_group)
                
        return duplicates
        
    def compute_hash(self, file_path, algorithm='md5'):
        hash_func = hashlib.md5() if algorithm == 'md5' else hashlib.sha256()
        
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                hash_func.update(chunk)
                
        return hash_func.hexdigest()
        
    def emit_progress(self, message):
        if self.progress_callback:
            self.progress_callback(message)
