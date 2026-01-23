from PyQt5.QtWidgets import QDialog, QVBoxLayout, QTextEdit, QPushButton, QHBoxLayout

class ErrorDialog(QDialog):
    def __init__(self, parent=None, title="Error", message=""):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setModal(True)
        self.setMinimumWidth(500)
        self.setMinimumHeight(300)
        
        layout = QVBoxLayout(self)
        
        self.text_edit = QTextEdit()
        self.text_edit.setPlainText(message)
        self.text_edit.setReadOnly(True)
        layout.addWidget(self.text_edit)
        
        btn_layout = QHBoxLayout()
        btn_copy = QPushButton("Copy to Clipboard")
        btn_copy.clicked.connect(self.copy_to_clipboard)
        btn_ok = QPushButton("OK")
        btn_ok.clicked.connect(self.accept)
        btn_layout.addWidget(btn_copy)
        btn_layout.addStretch()
        btn_layout.addWidget(btn_ok)
        layout.addLayout(btn_layout)
        
    def copy_to_clipboard(self):
        from PyQt5.QtWidgets import QApplication
        QApplication.clipboard().setText(self.text_edit.toPlainText())
        
    @staticmethod
    def show_error(parent, title, message):
        dialog = ErrorDialog(parent, title, message)
        dialog.exec_()
