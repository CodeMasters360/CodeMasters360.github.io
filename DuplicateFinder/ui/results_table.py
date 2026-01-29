from PyQt5.QtWidgets import (QTableWidget, QTableWidgetItem, QHeaderView, 
                             QMenu, QApplication, QCheckBox, QWidget, QHBoxLayout,
                             QPushButton)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QColor
import os
import subprocess

class ResultsTable(QTableWidget):
    def __init__(self):
        super().__init__()
        self.setup_table()
        
    def setup_table(self):
        self.setColumnCount(8)
        self.setHorizontalHeaderLabels([
            "☑", "Group", "File Name", "Extension", "Size", "Modified", "Path", "Actions"
        ])
        
        header = self.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(1, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(2, QHeaderView.Interactive)
        header.setSectionResizeMode(3, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(4, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(5, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(6, QHeaderView.Stretch)
        header.setSectionResizeMode(7, QHeaderView.ResizeToContents)
        
        self.setSortingEnabled(True)
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)
        
        # Select all checkbox in header
        self.select_all_cb = QCheckBox()
        self.select_all_cb.stateChanged.connect(self.toggle_select_all)
        header_widget = QWidget()
        header_layout = QHBoxLayout(header_widget)
        header_layout.addWidget(self.select_all_cb)
        header_layout.setContentsMargins(0, 0, 0, 0)
        header_layout.setAlignment(Qt.AlignCenter)
        
    def populate_data(self, duplicates):
        self.setRowCount(0)
        self.setSortingEnabled(False)
        
        colors = [QColor(255, 240, 240), QColor(240, 255, 240), QColor(240, 240, 255),
                  QColor(255, 255, 240), QColor(255, 240, 255), QColor(240, 255, 255)]
        
        for group_idx, group in enumerate(duplicates):
            color = colors[group_idx % len(colors)]
            
            for file_info in group:
                row = self.rowCount()
                self.insertRow(row)
                
                # Checkbox
                cb = QCheckBox()
                cb_widget = QWidget()
                cb_layout = QHBoxLayout(cb_widget)
                cb_layout.addWidget(cb)
                cb_layout.setAlignment(Qt.AlignCenter)
                cb_layout.setContentsMargins(0, 0, 0, 0)
                self.setCellWidget(row, 0, cb_widget)
                
                # Group number
                self.setItem(row, 1, QTableWidgetItem(str(group_idx + 1)))
                
                # File name
                self.setItem(row, 2, QTableWidgetItem(file_info['name']))
                
                # Extension
                self.setItem(row, 3, QTableWidgetItem(file_info['extension']))
                
                # Size
                size_item = QTableWidgetItem(self.format_size(file_info['size']))
                size_item.setData(Qt.UserRole, file_info['size'])
                self.setItem(row, 4, size_item)
                
                # Modified date
                self.setItem(row, 5, QTableWidgetItem(file_info['modified']))
                
                # Path
                path_item = QTableWidgetItem(file_info['path'])
                path_item.setData(Qt.UserRole, file_info['full_path'])
                self.setItem(row, 6, path_item)
                
                # Action buttons
                btn_widget = QWidget()
                btn_layout = QHBoxLayout(btn_widget)
                btn_layout.setContentsMargins(2, 2, 2, 2)
                
                btn_open = QPushButton("📂")
                btn_open.setToolTip("Open File Location")
                btn_open.clicked.connect(lambda checked, p=file_info['full_path']: self.open_location(p))
                
                btn_delete = QPushButton("🗑")
                btn_delete.setToolTip("Delete File")
                btn_delete.clicked.connect(lambda checked, r=row: self.delete_single_file(r))
                
                btn_layout.addWidget(btn_open)
                btn_layout.addWidget(btn_delete)
                self.setCellWidget(row, 7, btn_widget)
                
                # Set row color
                for col in range(self.columnCount()):
                    item = self.item(row, col)
                    if item:
                        item.setBackground(color)
                        
        self.setSortingEnabled(True)
        
    def format_size(self, size):
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} PB"
        
    def toggle_select_all(self, state):
        for row in range(self.rowCount()):
            cb_widget = self.cellWidget(row, 0)
            if cb_widget:
                cb = cb_widget.findChild(QCheckBox)
                if cb:
                    cb.setChecked(state == Qt.Checked)
                    
    def show_context_menu(self, position):
        menu = QMenu()
        
        select_path_action = menu.addAction("Select all files in this path")
        copy_name_action = menu.addAction("Copy File Name")
        copy_path_action = menu.addAction("Copy File Path")
        
        action = menu.exec_(self.viewport().mapToGlobal(position))
        
        row = self.rowAt(position.y())
        if row < 0:
            return
            
        if action == select_path_action:
            current_path = self.item(row, 6).text()
            for r in range(self.rowCount()):
                if self.item(r, 6).text() == current_path:
                    cb_widget = self.cellWidget(r, 0)
                    cb = cb_widget.findChild(QCheckBox)
                    cb.setChecked(True)
                    
        elif action == copy_name_action:
            file_name = self.item(row, 2).text()
            QApplication.clipboard().setText(file_name)
            
        elif action == copy_path_action:
            full_path = self.item(row, 6).data(Qt.UserRole)
            QApplication.clipboard().setText(full_path)
            
    def open_location(self, file_path):
        normalized_path = os.path.normpath(file_path)
        if os.path.exists(normalized_path):
            subprocess.run(['explorer', '/select,', normalized_path])
            
    def delete_single_file(self, row):
        from PyQt5.QtWidgets import QMessageBox
        from utils.file_operations import move_to_recycle_bin
        
        file_path = self.item(row, 6).data(Qt.UserRole)
        success, failed = move_to_recycle_bin([file_path])
        
        if success:
            self.removeRow(row)
            QMessageBox.information(self, "Success", "File moved to Recycle Bin.")
        else:
            from ui.error_dialog import ErrorDialog
            ErrorDialog.show_error(self, "Error", f"Failed to delete: {failed[0]}")
            
    def get_selected_files(self):
        selected = []
        for row in range(self.rowCount()):
            cb_widget = self.cellWidget(row, 0)
            cb = cb_widget.findChild(QCheckBox)
            if cb and cb.isChecked():
                selected.append(self.item(row, 6).data(Qt.UserRole))
        return selected
        
    def invert_selection(self):
        for row in range(self.rowCount()):
            cb_widget = self.cellWidget(row, 0)
            cb = cb_widget.findChild(QCheckBox)
            if cb:
                cb.setChecked(not cb.isChecked())
                
    def smart_select(self, criteria, duplicates):
        # Clear all selections first
        for row in range(self.rowCount()):
            cb_widget = self.cellWidget(row, 0)
            cb = cb_widget.findChild(QCheckBox)
            if cb:
                cb.setChecked(False)
                
        # Apply smart selection logic per group
        for group_idx, group in enumerate(duplicates):
            if len(group) <= 1:
                continue
                
            keep_file = self.determine_keep_file(group, criteria)
            
            # Select all except the one to keep
            for row in range(self.rowCount()):
                if int(self.item(row, 1).text()) == group_idx + 1:
                    file_path = self.item(row, 6).data(Qt.UserRole)
                    if file_path != keep_file:
                        cb_widget = self.cellWidget(row, 0)
                        cb = cb_widget.findChild(QCheckBox)
                        cb.setChecked(True)
                        
    def determine_keep_file(self, group, criteria):
        if criteria['method'] == 'oldest':
            return min(group, key=lambda x: x['modified_timestamp'])['full_path']
        elif criteria['method'] == 'newest':
            return max(group, key=lambda x: x['modified_timestamp'])['full_path']
        elif criteria['method'] == 'path':
            priority_path = criteria['priority_path']
            for file_info in group:
                if file_info['full_path'].startswith(priority_path):
                    return file_info['full_path']
            return group[0]['full_path']
        return group[0]['full_path']
