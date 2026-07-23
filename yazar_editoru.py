import sys
import random
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                             QHBoxLayout, QPushButton, QLabel, QLineEdit,
                             QTextEdit, QListWidget, QStackedWidget, QFormLayout, 
                             QFileDialog, QComboBox, QFrame)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont, QPixmap

class WriterStudio(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("AI Yazar Editörü - V1.0")
        self.setGeometry(100, 100, 1200, 800)

        # Ana Tasarım (Main Layout)
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget)

        # Sol Menü (Sidebar)
        self.sidebar = QListWidget()
        self.sidebar.setFixedWidth(220)
        self.sidebar.addItems(["📚 Yeni Kitap / Editör", "👤 Karakter Dosyası", "✍️ Yazma Egzersizleri", "🖼️ Mekanlar & Fotoğraflar"])
        self.sidebar.currentRowChanged.connect(self.switch_page)
        main_layout.addWidget(self.sidebar)

        # Sağ Taraftaki Sayfalar (Stacked Widget)
        self.pages = QStackedWidget()
        main_layout.addWidget(self.pages)

        # Sayfaları Başlat
        self.init_editor_page()
        self.init_character_page()
        self.init_exercise_page()
        self.init_location_page()

        # Uygulama Renkleri ve Tasarımı (CSS benzeri)
        self.setStyleSheet("""
            QMainWindow { background-color: #f4f4f9; }
            QListWidget { background-color: #2c3e50; color: white; font-size: 16px; padding: 10px; border: none; }
            QListWidget::item { padding: 15px; margin-bottom: 5px; }
            QListWidget::item:selected { background-color: #e67e22; border-radius: 5px; }
            QLabel { color: #2c3e50; font-size: 14px; }
            QPushButton { background-color: #3498db; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; font-size: 13px; }
            QPushButton:hover { background-color: #2980b9; }
            QLineEdit, QTextEdit, QComboBox { background-color: white; border: 1px solid #bdc3c7; padding: 8px; border-radius: 5px; font-size: 14px; }
            QTextEdit { font-family: 'Georgia'; font-size: 16px; line-height: 1.5; }
        """)

    def switch_page(self, index):
        self.pages.setCurrentIndex(index)

    # 1. SAYFA: ANA EDİTÖR VE KİTAP OLUŞTURMA
    def init_editor_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)

        # Üst Butonlar
        top_bar = QHBoxLayout()
        btn_load_file = QPushButton("📁 Bilgisayardan Dosya Yükle")
        btn_cover = QPushButton("🖼️ Kitap Kapağı Yükle")
        top_bar.addWidget(btn_load_file)
        top_bar.addWidget(btn_cover)
        top_bar.addStretch()
        layout.addLayout(top_bar)

        # Kitap Başlığı
        self.book_title = QLineEdit()
        self.book_title.setPlaceholderText("Kitabın Başlığı...")
        self.book_title.setFont(QFont("Arial", 20, QFont.Weight.Bold))
        self.book_title.setStyleSheet("border: none; background: transparent; padding-bottom: 10px;")
        layout.addWidget(self.book_title)

        # Ana Metin Editörü (Yapay Zeka buraya entegre edilecek)
        self.text_editor = QTextEdit()
        self.text_editor.setPlaceholderText("Hikayeni yazmaya başla...\nİleride geliştireceğimiz yapay zeka algoritması burada senin tarzını öğrenip cümlelerini tamamlayacak.")
        layout.addWidget(self.text_editor)

        self.pages.addWidget(page)

    # 2. SAYFA: KARAKTER DOSYASI
    def init_character_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)

        title = QLabel("Karakter Dosyası Yarat")
        title.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        layout.addWidget(title)

        form_layout = QFormLayout()
        
        # Karakter Özellikleri
        self.char_name = QLineEdit()
        self.char_age = QLineEdit()
        self.char_gender = QLineEdit()
        self.char_demo = QLineEdit()
        self.char_flaws = QLineEdit()
        self.char_desires = QLineEdit()
        
        # Kitaba Bağlama (Tag)
        self.char_book_tag = QComboBox()
        self.char_book_tag.addItems(["Bağımsız Karakter", "Yeni Kitap Projesi", "Taslak 1"])

        form_layout.addRow("İsim:", self.char_name)
        form_layout.addRow("Yaş:", self.char_age)
        form_layout.addRow("Cinsiyet:", self.char_gender)
        form_layout.addRow("Demografik Yapı:", self.char_demo)
        form_layout.addRow("Kusurlar (Flaws):", self.char_flaws)
        form_layout.addRow("İstekler (Desires):", self.char_desires)
        form_layout.addRow("Hangi Kitaba Ait (Tag):", self.char_book_tag)

        layout.addLayout(form_layout)

        layout.addWidget(QLabel("Karakterin Arka Plan Hikayesi ve Açıklaması:"))
        self.char_desc = QTextEdit()
        layout.addWidget(self.char_desc)

        btn_save_char = QPushButton("💾 Karakteri Kaydet")
        btn_save_char.setStyleSheet("background-color: #27ae60;")
        layout.addWidget(btn_save_char)

        self.pages.addWidget(page)

    # 3. SAYFA: YAZMA EGZERSİZLERİ (PROMPT)
    def init_exercise_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)

        title = QLabel("Yaratıcı Yazma Egzersizleri")
        title.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        layout.addWidget(title)
        
        btn_generate_prompt = QPushButton("🎲 Rastgele Modern Egzersiz Getir")
        btn_generate_prompt.clicked.connect(self.generate_prompt)
        layout.addWidget(btn_generate_prompt)

        self.prompt_display = QLabel("Egzersiz: İzmarit yemeyi iştah kabartan bir şekilde anlat.")
        self.prompt_display.setWordWrap(True)
        self.prompt_display.setStyleSheet("font-size: 18px; color: #8e44ad; font-weight: bold; padding: 20px; background-color: #f3e5f5; border-radius: 8px;")
        layout.addWidget(self.prompt_display)

        self.exercise_editor = QTextEdit()
        self.exercise_editor.setPlaceholderText("Egzersizi burada serbestçe yazabilirsin. Burası ana kitabından bağımsız bir kum havuzudur...")
        layout.addWidget(self.exercise_editor)

        self.pages.addWidget(page)

    def generate_prompt(self):
        prompts = [
            "İzmarit yemeyi iştah kabartan bir şekilde anlat.",
            "Çok neşeli bir karakterin, cenazede gülme krizine girmesini iç monolog ile yaz.",
            "Yağmuru ıslak kelimesini hiç kullanmadan tasvir et.",
            "Karakterinin en büyük korkusunu, sıradan bir kahvaltı masasında hissetmesini sağla."
        ]
        self.prompt_display.setText(f"Egzersiz: {random.choice(prompts)}")

    # 4. SAYFA: MEKANLAR VE FOTOĞRAF YÜKLEME
    def init_location_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)

        title = QLabel("Mekanlar ve Fotoğraf Referansları")
        title.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        layout.addWidget(title)

        btn_upload_photo = QPushButton("📸 Bilgisayardan Fotoğraf Yükle")
        btn_upload_photo.clicked.connect(self.upload_image)
        layout.addWidget(btn_upload_photo)

        # Fotoğraf Alanı
        self.photo_label = QLabel("Fotoğraf burada görüntülenecek.")
        self.photo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.photo_label.setMinimumHeight(300)
        self.photo_label.setStyleSheet("border: 2px dashed #bdc3c7; color: #7f8c8d; font-size: 16px;")
        layout.addWidget(self.photo_label)

        self.location_desc = QTextEdit()
        self.location_desc.setPlaceholderText("Bu mekanın kokusu, sesi veya atmosferi nasıl? Buraya not al...")
        layout.addWidget(self.location_desc)

        self.pages.addWidget(page)

    def upload_image(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Fotoğraf Seç", "", "Resim Dosyaları (*.png *.jpg *.jpeg)")
        if file_name:
            pixmap = QPixmap(file_name)
            self.photo_label.setPixmap(pixmap.scaled(self.photo_label.width(), self.photo_label.height(), Qt.AspectRatioMode.KeepAspectRatio))
            self.photo_label.setText("") # Metni temizle

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = WriterStudio()
    window.show()
    sys.exit(app.exec())