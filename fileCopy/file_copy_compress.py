import sys
import os
import shutil
from pathlib import Path
from datetime import datetime
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QLineEdit, QPushButton, 
                             QCheckBox, QComboBox, QSpinBox, QProgressBar,
                             QFileDialog, QMessageBox, QDialog, QRadioButton,
                             QButtonGroup, QTextEdit, QGroupBox)
from PyQt5.QtCore import QThread, pyqtSignal, Qt
from PIL import Image
import subprocess


class ConflictDialog(QDialog):
    def __init__(self, filename, parent=None):
        super().__init__(parent)
        self.setWindowTitle("File Conflict")
        self.setModal(True)
        self.result_action = None
        self.apply_to_all = False
        
        layout = QVBoxLayout()
        
        # Message
        msg_label = QLabel(f"File already exists:\n{filename}\n\nWhat would you like to do?")
        layout.addWidget(msg_label)
        
        # Radio buttons
        self.button_group = QButtonGroup()
        self.replace_radio = QRadioButton("Replace")
        self.rename_radio = QRadioButton("Rename")
        self.ignore_radio = QRadioButton("Ignore")
        
        self.button_group.addButton(self.replace_radio)
        self.button_group.addButton(self.rename_radio)
        self.button_group.addButton(self.ignore_radio)
        
        self.replace_radio.setChecked(True)
        
        layout.addWidget(self.replace_radio)
        layout.addWidget(self.rename_radio)
        layout.addWidget(self.ignore_radio)
        
        # Apply to all checkbox
        self.apply_all_checkbox = QCheckBox("Apply to all conflicts")
        layout.addWidget(self.apply_all_checkbox)
        
        # OK button
        ok_button = QPushButton("OK")
        ok_button.clicked.connect(self.accept)
        layout.addWidget(ok_button)
        
        self.setLayout(layout)
    
    def get_result(self):
        if self.replace_radio.isChecked():
            action = "replace"
        elif self.rename_radio.isChecked():
            action = "rename"
        else:
            action = "ignore"
        
        return action, self.apply_all_checkbox.isChecked()


class ErrorDialog(QDialog):
    def __init__(self, error_message, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Error")
        self.setModal(True)
        self.resize(500, 300)
        
        layout = QVBoxLayout()
        
        label = QLabel("An error occurred:")
        layout.addWidget(label)
        
        # Text edit for selectable/copyable error text
        self.text_edit = QTextEdit()
        self.text_edit.setPlainText(error_message)
        self.text_edit.setReadOnly(True)
        layout.addWidget(self.text_edit)
        
        # OK button
        ok_button = QPushButton("OK")
        ok_button.clicked.connect(self.accept)
        layout.addWidget(ok_button)
        
        self.setLayout(layout)


class WorkerThread(QThread):
    progress_update = pyqtSignal(int)
    status_update = pyqtSignal(str)
    conflict_signal = pyqtSignal(str, str)
    error_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(list)
    
    def __init__(self, source, destination, filter_mode, extensions, 
                 compress_images, image_formats, image_quality,
                 compress_videos, video_formats, video_crf, video_codec):
        super().__init__()
        self.source = source
        self.destination = destination
        self.filter_mode = filter_mode
        self.extensions = extensions
        self.compress_images = compress_images
        self.image_formats = image_formats
        self.image_quality = image_quality
        self.compress_videos = compress_videos
        self.video_formats = video_formats
        self.video_crf = video_crf
        self.video_codec = video_codec
        
        self.conflict_action = None
        self.apply_to_all = False
        self.log_entries = []
        self.conflict_response = None
        
    def run(self):
        try:
            # Collect all files
            all_files = []
            for root, dirs, files in os.walk(self.source):
                for file in files:
                    all_files.append(os.path.join(root, file))
            
            total_files = len(all_files)
            if total_files == 0:
                self.log_entries.append("No files found in source directory.")
                self.finished_signal.emit(self.log_entries)
                return
            
            processed = 0
            
            for file_path in all_files:
                try:
                    # Check if file should be processed based on filter
                    if not self.should_process_file(file_path):
                        processed += 1
                        self.progress_update.emit(int((processed / total_files) * 100))
                        continue
                    
                    # Calculate destination path
                    rel_path = os.path.relpath(file_path, self.source)
                    dest_path = os.path.join(self.destination, rel_path)
                    dest_dir = os.path.dirname(dest_path)
                    
                    # Create destination directory
                    os.makedirs(dest_dir, exist_ok=True)
                    
                    # Handle file conflict
                    if os.path.exists(dest_path):
                        action = self.handle_conflict(dest_path)
                        if action == "ignore":
                            self.log_entries.append(f"Ignored: {file_path}")
                            processed += 1
                            self.progress_update.emit(int((processed / total_files) * 100))
                            continue
                        elif action == "rename":
                            dest_path = self.get_unique_filename(dest_path)
                            self.log_entries.append(f"Renamed: {file_path} -> {dest_path}")
                    
                    # Process file
                    file_ext = os.path.splitext(file_path)[1].lower()
                    
                    if self.compress_images and file_ext in self.image_formats:
                        self.status_update.emit(f"Compressing image: {os.path.basename(file_path)}...")
                        self.compress_image(file_path, dest_path)
                        self.log_entries.append(f"Compressed (image): {file_path}")
                    elif self.compress_videos and file_ext in self.video_formats:
                        self.status_update.emit(f"Compressing video: {os.path.basename(file_path)}...")
                        self.compress_video(file_path, dest_path)
                        self.log_entries.append(f"Compressed (video): {file_path}")
                    else:
                        self.status_update.emit(f"Copying file: {os.path.basename(file_path)}...")
                        shutil.copy2(file_path, dest_path)
                        self.log_entries.append(f"Copied: {file_path}")
                    
                except Exception as e:
                    error_msg = f"Error processing {file_path}: {str(e)}"
                    self.log_entries.append(f"ERROR: {error_msg}")
                    self.error_signal.emit(error_msg)
                
                processed += 1
                self.progress_update.emit(int((processed / total_files) * 100))
            
            self.finished_signal.emit(self.log_entries)
            
        except Exception as e:
            self.error_signal.emit(f"Critical error: {str(e)}")
            self.finished_signal.emit(self.log_entries)
    
    def should_process_file(self, file_path):
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if self.filter_mode == "none":
            return True
        elif self.filter_mode == "allowed_all":
            return True
        elif self.filter_mode == "allowed_specific":
            return file_ext in self.extensions
        elif self.filter_mode == "excluded_all":
            return False
        elif self.filter_mode == "excluded_specific":
            return file_ext not in self.extensions
        
        return True
    
    def handle_conflict(self, dest_path):
        if self.apply_to_all and self.conflict_action:
            return self.conflict_action
        
        # Signal main thread to show dialog
        self.conflict_response = None
        self.conflict_signal.emit(dest_path, "waiting")
        
        # Wait for response
        while self.conflict_response is None:
            self.msleep(100)
        
        action, apply_all = self.conflict_response
        if apply_all:
            self.conflict_action = action
            self.apply_to_all = True
        
        return action
    
    def get_unique_filename(self, filepath):
        directory = os.path.dirname(filepath)
        filename = os.path.basename(filepath)
        name, ext = os.path.splitext(filename)
        
        counter = 1
        new_path = filepath
        while os.path.exists(new_path):
            new_filename = f"{name} ({counter}){ext}"
            new_path = os.path.join(directory, new_filename)
            counter += 1
        
        return new_path
    
    def compress_image(self, source, destination):
        img = Image.open(source)
        # Convert RGBA to RGB if saving as JPEG
        if img.mode == 'RGBA' and os.path.splitext(destination)[1].lower() in ['.jpg', '.jpeg']:
            img = img.convert('RGB')
        img.save(destination, quality=self.image_quality, optimize=True)
    
    def compress_video(self, source, destination):
        codec_map = {
            "H.264": "libx264",
            "H.265": "libx265"
        }
        codec = codec_map.get(self.video_codec, "libx264")
        
        cmd = [
            'ffmpeg', '-i', source,
            '-c:v', codec,
            '-crf', str(self.video_crf),
            '-c:a', 'aac',
            '-y',  # Overwrite output file
            destination
        ]
        
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("File Copy & Compression Tool")
        self.setGeometry(100, 100, 800, 700)
        
        self.worker = None
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Source path
        source_layout = QHBoxLayout()
        source_layout.addWidget(QLabel("Source Path:"))
        self.source_input = QLineEdit()
        source_layout.addWidget(self.source_input)
        self.source_browse_btn = QPushButton("Browse")
        self.source_browse_btn.clicked.connect(self.browse_source)
        source_layout.addWidget(self.source_browse_btn)
        self.source_open_btn = QPushButton("Open")
        self.source_open_btn.clicked.connect(self.open_source)
        source_layout.addWidget(self.source_open_btn)
        main_layout.addLayout(source_layout)
        
        # Destination path
        dest_layout = QHBoxLayout()
        dest_layout.addWidget(QLabel("Destination Path:"))
        self.dest_input = QLineEdit()
        dest_layout.addWidget(self.dest_input)
        self.dest_browse_btn = QPushButton("Browse")
        self.dest_browse_btn.clicked.connect(self.browse_destination)
        dest_layout.addWidget(self.dest_browse_btn)
        self.dest_open_btn = QPushButton("Open")
        self.dest_open_btn.clicked.connect(self.open_destination)
        dest_layout.addWidget(self.dest_open_btn)
        main_layout.addLayout(dest_layout)
        
        # Filter group
        filter_group = QGroupBox("File Filtering")
        filter_layout = QVBoxLayout()
        
        filter_type_layout = QHBoxLayout()
        filter_type_layout.addWidget(QLabel("Filter Mode:"))
        self.filter_combo = QComboBox()
        self.filter_combo.addItems(["No Filter", "Allowed Extensions", "Excluded Extensions"])
        self.filter_combo.currentIndexChanged.connect(self.filter_mode_changed)
        filter_type_layout.addWidget(self.filter_combo)
        filter_layout.addLayout(filter_type_layout)
        
        ext_type_layout = QHBoxLayout()
        ext_type_layout.addWidget(QLabel("Extension Mode:"))
        self.ext_mode_combo = QComboBox()
        self.ext_mode_combo.addItems(["All Extensions", "Specific Extensions"])
        self.ext_mode_combo.currentIndexChanged.connect(self.ext_mode_changed)
        ext_type_layout.addWidget(self.ext_mode_combo)
        filter_layout.addLayout(ext_type_layout)
        
        ext_input_layout = QHBoxLayout()
        ext_input_layout.addWidget(QLabel("Extensions (comma-separated):"))
        self.ext_input = QLineEdit()
        self.ext_input.setPlaceholderText("e.g., .jpg,.png,.txt")
        self.ext_input.setEnabled(False)
        ext_input_layout.addWidget(self.ext_input)
        filter_layout.addLayout(ext_input_layout)
        
        filter_group.setLayout(filter_layout)
        main_layout.addWidget(filter_group)
        
        # Image compression group
        image_group = QGroupBox()
        image_group_layout = QVBoxLayout()
        
        self.compress_images_check = QCheckBox("Enable Image Compression")
        self.compress_images_check.stateChanged.connect(self.image_compress_changed)
        image_group_layout.addWidget(self.compress_images_check)
        
        img_formats_layout = QHBoxLayout()
        img_formats_layout.addWidget(QLabel("Image Formats:"))
        self.img_formats_input = QLineEdit()
        self.img_formats_input.setText(".jpg,.jpeg,.png,.bmp")
        self.img_formats_input.setEnabled(False)
        img_formats_layout.addWidget(self.img_formats_input)
        image_group_layout.addLayout(img_formats_layout)
        
        img_quality_layout = QHBoxLayout()
        img_quality_layout.addWidget(QLabel("Quality (%):"))
        self.img_quality_spin = QSpinBox()
        self.img_quality_spin.setRange(1, 100)
        self.img_quality_spin.setValue(85)
        self.img_quality_spin.setEnabled(False)
        img_quality_layout.addWidget(self.img_quality_spin)
        img_quality_layout.addStretch()
        image_group_layout.addLayout(img_quality_layout)
        
        image_group.setLayout(image_group_layout)
        main_layout.addWidget(image_group)
        
        # Video compression group
        video_group = QGroupBox()
        video_group_layout = QVBoxLayout()
        
        self.compress_videos_check = QCheckBox("Enable Video Compression")
        self.compress_videos_check.stateChanged.connect(self.video_compress_changed)
        video_group_layout.addWidget(self.compress_videos_check)
        
        vid_formats_layout = QHBoxLayout()
        vid_formats_layout.addWidget(QLabel("Video Formats:"))
        self.vid_formats_input = QLineEdit()
        self.vid_formats_input.setText(".mp4,.mov,.avi,.mkv")
        self.vid_formats_input.setEnabled(False)
        vid_formats_layout.addWidget(self.vid_formats_input)
        video_group_layout.addLayout(vid_formats_layout)
        
        vid_crf_layout = QHBoxLayout()
        vid_crf_layout.addWidget(QLabel("CRF (0-51):"))
        self.vid_crf_spin = QSpinBox()
        self.vid_crf_spin.setRange(0, 51)
        self.vid_crf_spin.setValue(23)
        self.vid_crf_spin.setEnabled(False)
        vid_crf_layout.addWidget(self.vid_crf_spin)
        vid_crf_layout.addStretch()
        video_group_layout.addLayout(vid_crf_layout)
        
        vid_codec_layout = QHBoxLayout()
        vid_codec_layout.addWidget(QLabel("Codec:"))
        self.vid_codec_combo = QComboBox()
        self.vid_codec_combo.addItems(["H.264", "H.265"])
        self.vid_codec_combo.setEnabled(False)
        vid_codec_layout.addWidget(self.vid_codec_combo)
        vid_codec_layout.addStretch()
        video_group_layout.addLayout(vid_codec_layout)
        
        video_group.setLayout(video_group_layout)
        main_layout.addWidget(video_group)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        main_layout.addWidget(self.progress_bar)
        
        # Status label
        self.status_label = QLabel("Ready")
        main_layout.addWidget(self.status_label)
        
        # Start button
        self.start_btn = QPushButton("Start")
        self.start_btn.clicked.connect(self.start_operation)
        main_layout.addWidget(self.start_btn)
        
        self.filter_mode_changed()
        self.ext_mode_changed()
    
    def browse_source(self):
        path = QFileDialog.getExistingDirectory(self, "Select Source Directory")
        if path:
            self.source_input.setText(path)
    
    def browse_destination(self):
        path = QFileDialog.getExistingDirectory(self, "Select Destination Directory")
        if path:
            self.dest_input.setText(path)
    
    def open_source(self):
        path = self.source_input.text()
        if path and os.path.exists(path):
            os.startfile(os.path.normpath(path))
    
    def open_destination(self):
        path = self.dest_input.text()
        if path and os.path.exists(path):
            os.startfile(os.path.normpath(path))
    
    def filter_mode_changed(self):
        mode = self.filter_combo.currentText()
        enabled = mode != "No Filter"
        self.ext_mode_combo.setEnabled(enabled)
        if enabled:
            self.ext_mode_changed()
    
    def ext_mode_changed(self):
        if self.filter_combo.currentText() == "No Filter":
            self.ext_input.setEnabled(False)
            return
        
        mode = self.ext_mode_combo.currentText()
        self.ext_input.setEnabled(mode == "Specific Extensions")
    
    def image_compress_changed(self):
        enabled = self.compress_images_check.isChecked()
        self.img_formats_input.setEnabled(enabled)
        self.img_quality_spin.setEnabled(enabled)
    
    def video_compress_changed(self):
        enabled = self.compress_videos_check.isChecked()
        self.vid_formats_input.setEnabled(enabled)
        self.vid_crf_spin.setEnabled(enabled)
        self.vid_codec_combo.setEnabled(enabled)
    
    def start_operation(self):
        source = self.source_input.text()
        destination = self.dest_input.text()
        
        # Normalize paths to use consistent separators
        source = os.path.normpath(source) if source else ""
        destination = os.path.normpath(destination) if destination else ""
        
        if not source or not os.path.exists(source):
            QMessageBox.warning(self, "Error", "Invalid source path")
            return
        
        if not destination:
            QMessageBox.warning(self, "Error", "Invalid destination path")
            return
        
        # Parse filter settings
        filter_mode = "none"
        extensions = []
        
        filter_type = self.filter_combo.currentText()
        ext_mode = self.ext_mode_combo.currentText()
        
        if filter_type == "Allowed Extensions":
            if ext_mode == "All Extensions":
                filter_mode = "allowed_all"
            else:
                filter_mode = "allowed_specific"
                extensions = [ext.strip().lower() for ext in self.ext_input.text().split(',') if ext.strip()]
        elif filter_type == "Excluded Extensions":
            if ext_mode == "All Extensions":
                filter_mode = "excluded_all"
            else:
                filter_mode = "excluded_specific"
                extensions = [ext.strip().lower() for ext in self.ext_input.text().split(',') if ext.strip()]
        
        # Parse compression settings
        compress_images = self.compress_images_check.isChecked()
        image_formats = [fmt.strip().lower() for fmt in self.img_formats_input.text().split(',') if fmt.strip()]
        image_quality = self.img_quality_spin.value()
        
        compress_videos = self.compress_videos_check.isChecked()
        video_formats = [fmt.strip().lower() for fmt in self.vid_formats_input.text().split(',') if fmt.strip()]
        video_crf = self.vid_crf_spin.value()
        video_codec = self.vid_codec_combo.currentText()
        
        # Disable UI during operation
        self.start_btn.setEnabled(False)
        self.progress_bar.setValue(0)
        
        # Create worker thread
        self.worker = WorkerThread(
            source, destination, filter_mode, extensions,
            compress_images, image_formats, image_quality,
            compress_videos, video_formats, video_crf, video_codec
        )
        
        self.worker.progress_update.connect(self.update_progress)
        self.worker.status_update.connect(self.update_status)
        self.worker.conflict_signal.connect(self.handle_conflict)
        self.worker.error_signal.connect(self.show_error)
        self.worker.finished_signal.connect(self.operation_finished)
        
        self.worker.start()
    
    def update_progress(self, value):
        self.progress_bar.setValue(value)
    
    def update_status(self, text):
        self.status_label.setText(text)
    
    def handle_conflict(self, filepath, status):
        dialog = ConflictDialog(filepath, self)
        dialog.exec_()
        action, apply_all = dialog.get_result()
        self.worker.conflict_response = (action, apply_all)
    
    def show_error(self, error_msg):
        dialog = ErrorDialog(error_msg, self)
        dialog.exec_()
    
    def operation_finished(self, log_entries):
        self.status_label.setText("Operation completed!")
        self.start_btn.setEnabled(True)
        
        # Ask to save log
        reply = QMessageBox.question(self, "Save Log", 
                                     "Operation completed. Do you want to save the log?",
                                     QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            log_path, _ = QFileDialog.getSaveFileName(self, "Save Log", 
                                                      f"log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                                                      "Text Files (*.txt)")
            if log_path:
                with open(log_path, 'w', encoding='utf-8') as f:
                    f.write(f"File Copy & Compression Log\n")
                    f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("=" * 80 + "\n\n")
                    for entry in log_entries:
                        f.write(entry + "\n")
                
                QMessageBox.information(self, "Success", f"Log saved to:\n{log_path}")


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
