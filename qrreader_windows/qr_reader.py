import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QPushButton, QLabel, 
                             QVBoxLayout, QHBoxLayout, QWidget, QFileDialog, 
                             QTextEdit, QMessageBox)
from PyQt5.QtGui import QPixmap, QImage
from PyQt5.QtCore import Qt
import cv2
from pyzbar import pyzbar
from PIL import ImageGrab
import numpy as np


class QRCodeReader(QMainWindow):
    def __init__(self):
        super().__init__()
        self.initUI()
        
    def initUI(self):
        self.setWindowTitle('QR Code Reader')
        self.setGeometry(100, 100, 800, 600)
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QVBoxLayout()
        
        # Title
        title = QLabel('QR Code Scanner')
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet('font-size: 24px; font-weight: bold; margin: 10px;')
        main_layout.addWidget(title)
        
        # Button layout
        button_layout = QHBoxLayout()
        
        # Browse button
        self.browse_btn = QPushButton('Browse Image')
        self.browse_btn.setStyleSheet('padding: 10px; font-size: 14px;')
        self.browse_btn.clicked.connect(self.browse_image)
        button_layout.addWidget(self.browse_btn)
        
        # Paste from clipboard button
        self.paste_btn = QPushButton('Paste from Clipboard')
        self.paste_btn.setStyleSheet('padding: 10px; font-size: 14px;')
        self.paste_btn.clicked.connect(self.paste_from_clipboard)
        button_layout.addWidget(self.paste_btn)
        
        main_layout.addLayout(button_layout)
        
        # Image display label
        self.image_label = QLabel('No image loaded')
        self.image_label.setAlignment(Qt.AlignCenter)
        self.image_label.setMinimumHeight(300)
        self.image_label.setStyleSheet('border: 2px dashed #ccc; margin: 10px;')
        main_layout.addWidget(self.image_label)
        
        # Result label
        result_title = QLabel('Decoded Content:')
        result_title.setStyleSheet('font-size: 16px; font-weight: bold; margin-top: 10px;')
        main_layout.addWidget(result_title)
        
        # Text area for decoded content
        self.result_text = QTextEdit()
        self.result_text.setReadOnly(True)
        self.result_text.setPlaceholderText('QR code content will appear here...')
        self.result_text.setStyleSheet('font-size: 14px; padding: 10px;')
        main_layout.addWidget(self.result_text)
        
        # Copy button
        self.copy_btn = QPushButton('Copy Content')
        self.copy_btn.setStyleSheet('padding: 10px; font-size: 14px; background-color: #4CAF50; color: white;')
        self.copy_btn.clicked.connect(self.copy_content)
        self.copy_btn.setEnabled(False)
        main_layout.addWidget(self.copy_btn)
        
        central_widget.setLayout(main_layout)
        
    def browse_image(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, 
            'Select Image', 
            '', 
            'Image Files (*.png *.jpg *.jpeg *.bmp *.gif)'
        )
        
        if file_path:
            self.process_image(file_path)
    
    def paste_from_clipboard(self):
        try:
            # Get image from clipboard
            image = ImageGrab.grabclipboard()
            
            if image is None:
                QMessageBox.warning(self, 'No Image', 'No image found in clipboard!')
                return
            
            # Convert PIL image to numpy array
            image_np = np.array(image)
            
            # Convert RGB to BGR for OpenCV
            if len(image_np.shape) == 3:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            # Process the image
            self.process_image_array(image_np)
            
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Error pasting from clipboard: {str(e)}')
    
    def process_image(self, image_path):
        try:
            # Read image with OpenCV
            image = cv2.imread(image_path)
            
            if image is None:
                QMessageBox.critical(self, 'Error', 'Failed to load image!')
                return
            
            self.process_image_array(image, image_path)
            
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Error processing image: {str(e)}')
    
    def process_image_array(self, image, image_path=None):
        # Display image
        self.display_image(image)
        
        # Decode QR code
        decoded_objects = pyzbar.decode(image)
        
        if not decoded_objects:
            self.result_text.setPlainText('No QR code found in the image!')
            self.copy_btn.setEnabled(False)
            QMessageBox.information(self, 'No QR Code', 'No QR code detected in the image.')
            return
        
        # Display all decoded content
        content = ''
        for obj in decoded_objects:
            decoded_data = obj.data.decode('utf-8')
            content += f'Type: {obj.type}\n'
            content += f'Data: {decoded_data}\n'
            content += '-' * 50 + '\n'
        
        self.result_text.setPlainText(content.strip())
        self.copy_btn.setEnabled(True)
        
        QMessageBox.information(self, 'Success', f'Found {len(decoded_objects)} QR code(s)!')
    
    def display_image(self, cv_image):
        # Convert OpenCV image to QPixmap
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_image.shape
        bytes_per_line = ch * w
        qt_image = QImage(rgb_image.data, w, h, bytes_per_line, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(qt_image)
        
        # Scale image to fit label
        scaled_pixmap = pixmap.scaled(
            self.image_label.width() - 20, 
            self.image_label.height() - 20, 
            Qt.KeepAspectRatio, 
            Qt.SmoothTransformation
        )
        
        self.image_label.setPixmap(scaled_pixmap)
    
    def copy_content(self):
        content = self.result_text.toPlainText()
        if content:
            clipboard = QApplication.clipboard()
            clipboard.setText(content)
            QMessageBox.information(self, 'Copied', 'Content copied to clipboard!')


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    window = QRCodeReader()
    window.show()
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
