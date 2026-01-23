from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
                             QRadioButton, QLineEdit, QPushButton, QFileDialog,
                             QButtonGroup)

class SmartSelectDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Smart Select Configuration")
        self.setModal(True)
        self.init_ui()
        
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        layout.addWidget(QLabel("Select files to DELETE (keep one per group):"))
        
        self.btn_group = QButtonGroup()
        
        self.radio_oldest = QRadioButton("Keep oldest file (delete newer)")
        self.radio_newest = QRadioButton("Keep newest file (delete older)")
        self.radio_path = QRadioButton("Keep file in specific path:")
        
        self.btn_group.addButton(self.radio_oldest)
        self.btn_group.addButton(self.radio_newest)
        self.btn_group.addButton(self.radio_path)
        
        self.radio_oldest.setChecked(True)
        
        layout.addWidget(self.radio_oldest)
        layout.addWidget(self.radio_newest)
        
        path_layout = QHBoxLayout()
        path_layout.addWidget(self.radio_path)
        self.path_input = QLineEdit()
        self.path_input.setEnabled(False)
        btn_browse = QPushButton("Browse")
        btn_browse.clicked.connect(self.browse_path)
        path_layout.addWidget(self.path_input)
        path_layout.addWidget(btn_browse)
        layout.addLayout(path_layout)
        
        self.radio_path.toggled.connect(lambda: self.path_input.setEnabled(self.radio_path.isChecked()))
        
        # Buttons
        btn_layout = QHBoxLayout()
        btn_ok = QPushButton("OK")
        btn_ok.clicked.connect(self.accept)
        btn_cancel = QPushButton("Cancel")
        btn_cancel.clicked.connect(self.reject)
        btn_layout.addStretch()
        btn_layout.addWidget(btn_ok)
        btn_layout.addWidget(btn_cancel)
        layout.addLayout(btn_layout)
        
    def browse_path(self):
        path = QFileDialog.getExistingDirectory(self, "Select Priority Path")
        if path:
            self.path_input.setText(path)
            
    def get_criteria(self):
        if self.radio_oldest.isChecked():
            return {'method': 'oldest'}
        elif self.radio_newest.isChecked():
            return {'method': 'newest'}
        else:
            return {'method': 'path', 'priority_path': self.path_input.text()}
