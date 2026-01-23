from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QPushButton, QListWidget, QGroupBox, QLabel,
                             QComboBox, QLineEdit, QRadioButton, QButtonGroup,
                             QProgressBar, QMessageBox, QFileDialog, QSplitter)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from ui.results_table import ResultsTable
from ui.error_dialog import ErrorDialog
from scanner.duplicate_scanner import DuplicateScanner
from scanner.file_scanner import FileScannerThread
import os

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Duplicate Finder")
        self.setGeometry(100, 100, 1400, 800)
        
        self.scanner_thread = None
        self.duplicates = []
        
        self.init_ui()
        
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Splitter for configuration and results
        splitter = QSplitter(Qt.Vertical)
        
        # Configuration section
        config_widget = QWidget()
        config_layout = QVBoxLayout(config_widget)
        
        # Target paths
        target_group = QGroupBox("Target Paths")
        target_layout = QVBoxLayout()
        self.target_list = QListWidget()
        target_layout.addWidget(self.target_list)
        target_buttons = QHBoxLayout()
        btn_add_target = QPushButton("Add Path")
        btn_add_target.clicked.connect(self.add_target_path)
        btn_remove_target = QPushButton("Remove Selected")
        btn_remove_target.clicked.connect(lambda: self.remove_selected_item(self.target_list))
        target_buttons.addWidget(btn_add_target)
        target_buttons.addWidget(btn_remove_target)
        target_buttons.addStretch()
        target_layout.addLayout(target_buttons)
        target_group.setLayout(target_layout)
        config_layout.addWidget(target_group)
        
        # Exclusion paths
        exclusion_group = QGroupBox("Exclusion List (Blacklist)")
        exclusion_layout = QVBoxLayout()
        self.exclusion_list = QListWidget()
        exclusion_layout.addWidget(self.exclusion_list)
        exclusion_buttons = QHBoxLayout()
        btn_add_exclusion = QPushButton("Add Path")
        btn_add_exclusion.clicked.connect(self.add_exclusion_path)
        btn_remove_exclusion = QPushButton("Remove Selected")
        btn_remove_exclusion.clicked.connect(lambda: self.remove_selected_item(self.exclusion_list))
        exclusion_buttons.addWidget(btn_add_exclusion)
        exclusion_buttons.addWidget(btn_remove_exclusion)
        exclusion_buttons.addStretch()
        exclusion_layout.addLayout(exclusion_buttons)
        exclusion_group.setLayout(exclusion_layout)
        config_layout.addWidget(exclusion_group)
        
        # Extensions filter
        extensions_group = QGroupBox("Extension Filters")
        extensions_layout = QVBoxLayout()
        
        # Allowed extensions
        allowed_layout = QHBoxLayout()
        allowed_layout.addWidget(QLabel("Allowed:"))
        self.allowed_radio_all = QRadioButton("All Extensions")
        self.allowed_radio_all.setChecked(True)
        self.allowed_radio_specific = QRadioButton("Specific:")
        self.allowed_extensions_input = QLineEdit()
        self.allowed_extensions_input.setPlaceholderText("e.g., .jpg,.png,.pdf")
        self.allowed_extensions_input.setEnabled(False)
        self.allowed_radio_specific.toggled.connect(
            lambda: self.allowed_extensions_input.setEnabled(self.allowed_radio_specific.isChecked())
        )
        allowed_layout.addWidget(self.allowed_radio_all)
        allowed_layout.addWidget(self.allowed_radio_specific)
        allowed_layout.addWidget(self.allowed_extensions_input)
        extensions_layout.addLayout(allowed_layout)
        
        # Excluded extensions
        excluded_layout = QHBoxLayout()
        excluded_layout.addWidget(QLabel("Excluded:"))
        self.excluded_radio_none = QRadioButton("None")
        self.excluded_radio_none.setChecked(True)
        self.excluded_radio_specific = QRadioButton("Specific:")
        self.excluded_extensions_input = QLineEdit()
        self.excluded_extensions_input.setPlaceholderText("e.g., .tmp,.log")
        self.excluded_extensions_input.setEnabled(False)
        self.excluded_radio_specific.toggled.connect(
            lambda: self.excluded_extensions_input.setEnabled(self.excluded_radio_specific.isChecked())
        )
        excluded_layout.addWidget(self.excluded_radio_none)
        excluded_layout.addWidget(self.excluded_radio_specific)
        excluded_layout.addWidget(self.excluded_extensions_input)
        extensions_layout.addLayout(excluded_layout)
        
        extensions_group.setLayout(extensions_layout)
        config_layout.addWidget(extensions_group)
        
        # Detection method
        detection_group = QGroupBox("Detection Method")
        detection_layout = QHBoxLayout()
        self.detection_combo = QComboBox()
        self.detection_combo.addItems([
            "Checksum (MD5)",
            "Checksum (SHA256)",
            "Name + File Size",
            "File Size Only",
            "File Size + Modification Date"
        ])
        detection_layout.addWidget(QLabel("Method:"))
        detection_layout.addWidget(self.detection_combo)
        detection_layout.addStretch()
        detection_group.setLayout(detection_layout)
        config_layout.addWidget(detection_group)
        
        # Scan button and progress
        scan_layout = QHBoxLayout()
        self.btn_scan = QPushButton("Start Scan")
        self.btn_scan.clicked.connect(self.start_scan)
        self.btn_scan.setMinimumHeight(40)
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        scan_layout.addWidget(self.btn_scan)
        scan_layout.addWidget(self.progress_bar)
        config_layout.addLayout(scan_layout)
        
        splitter.addWidget(config_widget)
        
        # Results section
        results_widget = QWidget()
        results_layout = QVBoxLayout(results_widget)
        
        # Results controls
        results_controls = QHBoxLayout()
        self.btn_smart_select = QPushButton("Smart Select")
        self.btn_smart_select.clicked.connect(self.smart_select)
        self.btn_invert = QPushButton("Invert Selection")
        self.btn_invert.clicked.connect(self.invert_selection)
        self.btn_delete = QPushButton("Delete Selected")
        self.btn_delete.clicked.connect(self.delete_selected)
        self.btn_delete.setStyleSheet("background-color: #d9534f; color: white;")
        results_controls.addWidget(self.btn_smart_select)
        results_controls.addWidget(self.btn_invert)
        results_controls.addStretch()
        results_controls.addWidget(self.btn_delete)
        results_layout.addLayout(results_controls)
        
        # Results table
        self.results_table = ResultsTable()
        results_layout.addWidget(self.results_table)
        
        splitter.addWidget(results_widget)
        splitter.setSizes([300, 500])
        
        main_layout.addWidget(splitter)
        
    def add_target_path(self):
        path = QFileDialog.getExistingDirectory(self, "Select Target Directory")
        if path:
            self.target_list.addItem(path)
            
    def add_exclusion_path(self):
        path = QFileDialog.getExistingDirectory(self, "Select Exclusion Directory")
        if path:
            self.exclusion_list.addItem(path)
            
    def remove_selected_item(self, list_widget):
        for item in list_widget.selectedItems():
            list_widget.takeItem(list_widget.row(item))
            
    def start_scan(self):
        if self.target_list.count() == 0:
            QMessageBox.warning(self, "Warning", "Please add at least one target path.")
            return
            
        # Get configuration
        target_paths = [self.target_list.item(i).text() for i in range(self.target_list.count())]
        exclusion_paths = [self.exclusion_list.item(i).text() for i in range(self.exclusion_list.count())]
        
        allowed_extensions = None
        if self.allowed_radio_specific.isChecked():
            allowed_extensions = [ext.strip() for ext in self.allowed_extensions_input.text().split(',') if ext.strip()]
            
        excluded_extensions = []
        if self.excluded_radio_specific.isChecked():
            excluded_extensions = [ext.strip() for ext in self.excluded_extensions_input.text().split(',') if ext.strip()]
            
        detection_method = self.detection_combo.currentText()
        
        # Start scanning
        self.btn_scan.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Indeterminate
        
        self.scanner_thread = FileScannerThread(
            target_paths, exclusion_paths, allowed_extensions, excluded_extensions, detection_method
        )
        self.scanner_thread.progress.connect(self.update_progress)
        self.scanner_thread.finished_signal.connect(self.scan_finished)
        self.scanner_thread.error.connect(self.show_error)
        self.scanner_thread.start()
        
    def update_progress(self, message):
        self.statusBar().showMessage(message)
        
    def scan_finished(self, duplicates):
        self.btn_scan.setEnabled(True)
        self.progress_bar.setVisible(False)
        self.duplicates = duplicates
        self.results_table.populate_data(duplicates)
        self.statusBar().showMessage(f"Scan completed. Found {len(duplicates)} duplicate groups.")
        
    def show_error(self, error_message):
        self.btn_scan.setEnabled(True)
        self.progress_bar.setVisible(False)
        ErrorDialog.show_error(self, "Error", error_message)
        
    def smart_select(self):
        from ui.smart_select_dialog import SmartSelectDialog
        dialog = SmartSelectDialog(self)
        if dialog.exec_():
            criteria = dialog.get_criteria()
            self.results_table.smart_select(criteria, self.duplicates)
            
    def invert_selection(self):
        self.results_table.invert_selection()
        
    def delete_selected(self):
        selected_files = self.results_table.get_selected_files()
        if not selected_files:
            QMessageBox.warning(self, "Warning", "No files selected.")
            return
            
        reply = QMessageBox.question(
            self, "Confirm Deletion",
            f"Are you sure you want to move {len(selected_files)} file(s) to Recycle Bin?",
            QMessageBox.Yes | QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            from utils.file_operations import move_to_recycle_bin
            success, failed = move_to_recycle_bin(selected_files)
            
            if failed:
                error_msg = "Failed to delete:\n" + "\n".join(failed)
                ErrorDialog.show_error(self, "Deletion Errors", error_msg)
            
            if success:
                QMessageBox.information(self, "Success", f"{len(success)} file(s) moved to Recycle Bin.")
                # Refresh the table
                self.start_scan()
