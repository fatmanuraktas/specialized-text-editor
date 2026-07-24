import sys
import math
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                             QHBoxLayout, QPushButton, QLabel, QLineEdit,
                             QTextEdit, QStackedWidget, QFrame, QGridLayout, 
                             QSpacerItem, QSizePolicy, QScrollArea, QGraphicsView,
                             QGraphicsScene, QGraphicsEllipseItem, QGraphicsTextItem, 
                             QGraphicsLineItem, QGraphicsItemGroup, QGraphicsPathItem,
                             QListWidget, QFileDialog, QMenu, QComboBox, QDialog, 
                             QDialogButtonBox, QMessageBox, QCheckBox)
from PyQt6.QtCore import Qt, QSize, QRectF, QPointF
from PyQt6.QtGui import QFont, QCursor, QColor, QPen, QBrush, QPixmap, QAction, QIntValidator

# ===================================================
# DETECTIVE SUSPECT BOARD GRAPHICS NODE (POLİSİYE PANO)
# ===================================================
class PersonNodeItem(QGraphicsItemGroup):
    def __init__(self, person_data, app_reference, book_title):
        super().__init__()
        self.person_data = person_data
        self.app_ref = app_reference
        self.book_title = book_title
        
        # Make items interactively movable on the detective corkboard!
        self.setFlag(QGraphicsItemGroup.GraphicsItemFlag.ItemIsMovable, True)
        self.setFlag(QGraphicsItemGroup.GraphicsItemFlag.ItemIsSelectable, True)
        self.setFlag(QGraphicsItemGroup.GraphicsItemFlag.ItemSendsGeometryChanges, True)
        self.setCursor(QCursor(Qt.CursorShape.OpenHandCursor))

        radius = 32
        circle_color = QColor(person_data.get("color", "#3498DB"))
        
        # Red Detective Pushpin Icon (📌)
        pin_text = QGraphicsTextItem("📌")
        pin_text.setFont(QFont("Segoe UI", 16))
        pin_text.setPos(-14, -radius - 22)
        self.addToGroup(pin_text)

        # Outer Avatar Circle
        ellipse = QGraphicsEllipseItem(-radius, -radius, radius * 2, radius * 2)
        ellipse.setBrush(QBrush(circle_color))
        ellipse.setPen(QPen(QColor("#F5EEF8"), 2.5))
        self.addToGroup(ellipse)

        # Initial Letter
        initial = person_data["name"][0].upper() if person_data.get("name") else "K"
        init_text = QGraphicsTextItem(initial)
        init_text.setDefaultTextColor(QColor("white"))
        init_text.setFont(QFont("Segoe UI", 15, QFont.Weight.Bold))
        init_text.setPos(-10, -18)
        self.addToGroup(init_text)

        # Person Name Underneath
        name_text = QGraphicsTextItem(person_data["name"])
        name_text.setDefaultTextColor(QColor("#F5EEF8"))
        name_text.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        bounds = name_text.boundingRect()
        name_text.setPos(-bounds.width() / 2, radius + 4)
        self.addToGroup(name_text)

        # Trait subtitle
        if person_data.get("trait"):
            trait_text = QGraphicsTextItem(f"({person_data['trait']})")
            trait_text.setDefaultTextColor(QColor("#BDC3C7"))
            trait_text.setFont(QFont("Segoe UI", 8))
            t_bounds = trait_text.boundingRect()
            trait_text.setPos(-t_bounds.width() / 2, radius + 22)
            self.addToGroup(trait_text)

    def mouseDoubleClickEvent(self, event):
        self.app_ref.open_edit_person_dialog(self.person_data, self.book_title)
        super().mouseDoubleClickEvent(event)

    def itemChange(self, change, value):
        if change == QGraphicsItemGroup.GraphicsItemChange.ItemPositionHasChanged:
            if self.scene() and hasattr(self.scene(), "update_connecting_lines"):
                self.scene().update_connecting_lines()
        return super().itemChange(change, value)


# Custom Graphics View to handle Right Click on Corkboard Scene
class DetectiveBoardGraphicsView(QGraphicsView):
    def __init__(self, scene, app_ref, book_title):
        super().__init__(scene)
        self.app_ref = app_ref
        self.book_title = book_title

    def contextMenuEvent(self, event):
        menu = QMenu(self)
        
        act_from_template = QAction("📋 Dosyadan Kişi Yarat (Taslak Kullan)", self)
        act_from_scratch = QAction("✨ Sıfırdan Kişi Yarat", self)
        act_add_relation = QAction("🔗 İki Kişi Arasında İlişki Bağla", self)

        act_from_template.triggered.connect(lambda: self.app_ref.open_create_person_flow(self.book_title, mode="from_template"))
        act_from_scratch.triggered.connect(lambda: self.app_ref.open_create_person_flow(self.book_title, mode="from_scratch"))
        act_add_relation.triggered.connect(lambda: self.app_ref.open_book_relation_dialog(self.book_title))

        menu.addAction(act_from_template)
        menu.addAction(act_from_scratch)
        menu.addSeparator()
        menu.addAction(act_add_relation)
        
        menu.exec(event.globalPos())


class TextinationApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Textination - Yazar Editörü")
        self.setGeometry(100, 100, 1280, 850)
        self.is_dark_mode = False

        # User Profile State
        self.user_profile = {
            "name": "Antigravity Yazar",
            "email": "yazar@texination.com",
            "bio": "Textination üzerinde hikayeler kaleme alan tutkulu bir yazar.",
            "avatar_path": ""
        }

        # Saved Books List State
        self.saved_books = [
            {
                "title": "Zamanın Ötesinde",
                "subject": "Gelecek ile geçmiş arasında sıkışan bir dedektifin öyküsü.",
                "cover": "",
                "author": "Antigravity Yazar",
                "content": "Gecenin karanlığı şehri kapladığında, eski saatin tiktakları yankılanıyordu..."
            },
            {
                "title": "Sisli Şehir",
                "subject": "Gizemli olayların yaşandığı kasabada geçen macera.",
                "cover": "",
                "author": "Antigravity Yazar",
                "content": "Kasabaya ilk kar düştüğünde, herkes kütüphanenin ışıklarının söndüğünü fark etti..."
            }
        ]

        # Karakter Dosyası Templates (İlham Bankası & Kişi Taslakları)
        self.character_templates = [
            {
                "id": "tpl_1",
                "trait": "İçine kapanık memur",
                "age": "32",
                "gender": "Erkek",
                "job": "Kütüphaneci",
                "demographics": "Kentli orta sınıf",
                "politics": "Apolitik",
                "bio": "Kurallara bağlı, sessiz, eski haritalar konusunda uzman bir kamu çalışanı.",
                "color": "#3498DB"
            },
            {
                "id": "tpl_2",
                "trait": "Hırslı akademisyen",
                "age": "29",
                "gender": "Kadın",
                "job": "Biyokimya Araştırmacısı",
                "demographics": "Üst orta sınıf",
                "politics": "Sosyal Demokrat",
                "bio": "Kendi laboratuvarını kurmak isteyen idealist bilim insanı.",
                "color": "#E74C3C"
            },
            {
                "id": "tpl_3",
                "trait": "Eski tüfek dedektif",
                "age": "55",
                "gender": "Erkek",
                "job": "Emekli Polis",
                "demographics": "Geleneksel mahalle sakini",
                "politics": "Muhafazakar",
                "bio": "Yılların birikimiyle insanları ilk bakışta çözen tecrübeli gözlemci.",
                "color": "#27AE60"
            }
        ]

        # Book Bound Persons State (Kitaplara Atanmış Kişiler)
        self.book_persons = [
            # Zamanın Ötesinde Kişileri
            {
                "id": "p1",
                "name": "Ahmet Yılmaz",
                "book_title": "Zamanın Ötesinde",
                "trait": "İçine kapanık memur",
                "age": "32",
                "gender": "Erkek",
                "job": "Araştırmacı Dedektif",
                "demographics": "Kentli",
                "politics": "Apolitik",
                "bio": "Geceleri saha araştırması yapan eski memur.",
                "color": "#3498DB"
            },
            {
                "id": "p2",
                "name": "Zeynep Kaya",
                "book_title": "Zamanın Ötesinde",
                "trait": "Hırslı akademisyen",
                "age": "29",
                "gender": "Kadın",
                "job": "Biyokimyager",
                "demographics": "Üst orta sınıf",
                "politics": "Sosyal Demokrat",
                "bio": "Vakadaki anahtar delilleri inceleyen uzman.",
                "color": "#E74C3C"
            },
            {
                "id": "p3",
                "name": "Mehmet Demir",
                "book_title": "Zamanın Ötesinde",
                "trait": "Eski tüfek dedektif",
                "age": "55",
                "gender": "Erkek",
                "job": "Kütüphaneci",
                "demographics": "Mahalle sakini",
                "politics": "Muhafazakar",
                "bio": "Ahmet'in amcası ve danışmanı.",
                "color": "#27AE60"
            },
            {
                "id": "p4",
                "name": "Elif Demir",
                "book_title": "Zamanın Ötesinde",
                "trait": "Genç gazeteci",
                "age": "24",
                "gender": "Kadın",
                "job": "Muhabir",
                "demographics": "Öğrenci / Genç",
                "politics": "Liberal",
                "bio": "Mehmet'in kızı ve olayın izini süren muhabir.",
                "color": "#F39C12"
            },
            # Sisli Şehir Kişileri
            {
                "id": "p5",
                "name": "Canan Şahin",
                "book_title": "Sisli Şehir",
                "trait": "Gizemli kasaba doktoru",
                "age": "34",
                "gender": "Kadın",
                "job": "Doktor",
                "demographics": "Kasaba sakini",
                "politics": "Seçiniz",
                "bio": "Kasabadaki sırları çözen hekim.",
                "color": "#9B59B6"
            },
            {
                "id": "p6",
                "name": "Burak Şahin",
                "book_title": "Sisli Şehir",
                "trait": "Canan'ın kardeşi",
                "age": "28",
                "gender": "Erkek",
                "job": "Eczacı",
                "demographics": "Kasaba sakini",
                "politics": "Seçiniz",
                "bio": "Canan'ın öz kardeşi.",
                "color": "#1ABC9C"
            },
            {
                "id": "p7",
                "name": "Deniz Arslan",
                "book_title": "Sisli Şehir",
                "trait": "Araştırmacı gazeteci",
                "age": "31",
                "gender": "Erkek",
                "job": "Gazeteci",
                "demographics": "Kentli",
                "politics": "Seçiniz",
                "bio": "Canan ile ortak hareket eden gazeteci.",
                "color": "#E67E22"
            }
        ]

        # Book Bound Relations State (Kitaplara Atanmış İlişkiler)
        self.book_relations = [
            # Zamanın Ötesinde İlişkileri
            {"id": "r1", "from_id": "p1", "to_id": "p2", "type": "Aşk", "book_title": "Zamanın Ötesinde"},
            {"id": "r2", "from_id": "p1", "to_id": "p3", "type": "Aile", "book_title": "Zamanın Ötesinde"},
            {"id": "r3", "from_id": "p3", "to_id": "p4", "type": "Aile", "book_title": "Zamanın Ötesinde"},
            {"id": "r4", "from_id": "p1", "to_id": "p4", "type": "Aile", "book_title": "Zamanın Ötesinde"},
            {"id": "r5", "from_id": "p2", "to_id": "p4", "type": "Arkadaşlık", "book_title": "Zamanın Ötesinde"},
            # Sisli Şehir İlişkileri
            {"id": "r6", "from_id": "p5", "to_id": "p6", "type": "Aile", "book_title": "Sisli Şehir"},
            {"id": "r7", "from_id": "p5", "to_id": "p7", "type": "Aşk", "book_title": "Sisli Şehir"}
        ]

        # Active Filter state for book board
        self.active_schematic_filters = {
            "Aile": True,
            "Arkadaşlık": True,
            "Aşk": True
        }

        # Main Central Widget and Layout setup
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)

        # Screen Manager for Startup, Login, Main App
        self.screen_manager = QStackedWidget()
        self.main_layout.addWidget(self.screen_manager)

        # Initialize primary screens
        self.init_startup_screen()
        self.init_login_screen()
        self.init_main_app_screen()

        # Apply initial theme palette
        self.apply_theme()

    def set_active_content_page(self, page):
        """Cleanly replaces the active content view without memory stacking or blank screens."""
        while self.content_pages.count() > 0:
            widget = self.content_pages.widget(0)
            self.content_pages.removeWidget(widget)
            widget.deleteLater()
        self.content_pages.addWidget(page)
        self.content_pages.setCurrentWidget(page)

    # ==========================================
    # 1. STARTUP SCREEN
    # ==========================================
    def init_startup_screen(self):
        self.startup_widget = QWidget()
        layout = QVBoxLayout(self.startup_widget)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        title = QLabel("Textination")
        title_font = QFont("Old English Text MT", 64, QFont.Weight.Normal)
        title_font.setStyleHint(QFont.StyleHint.Serif) 
        title.setFont(title_font)
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setObjectName("app_title")

        subtitle = QLabel("Dijital Yazarlık ve Kitap Oluşturma Platformu")
        subtitle.setObjectName("secondary_text")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)

        start_btn = QPushButton("Başla")
        start_btn.setFixedSize(220, 50)
        start_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        start_btn.setObjectName("oval_primary_btn")
        start_btn.clicked.connect(lambda: self.screen_manager.setCurrentWidget(self.login_widget))

        layout.addWidget(title)
        layout.addWidget(subtitle)
        layout.addSpacing(40)
        layout.addWidget(start_btn, alignment=Qt.AlignmentFlag.AlignCenter)

        self.screen_manager.addWidget(self.startup_widget)

    # ==========================================
    # 2. LOGIN SCREEN
    # ==========================================
    def init_login_screen(self):
        self.login_widget = QWidget()
        layout = QVBoxLayout(self.login_widget)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        login_box = QFrame()
        login_box.setFixedSize(420, 470)
        login_box.setObjectName("card_box")
        box_layout = QVBoxLayout(login_box)
        box_layout.setContentsMargins(40, 40, 40, 40)
        box_layout.setSpacing(18)

        login_title = QLabel("Giriş Yap")
        login_title.setFont(QFont("Segoe UI", 24, QFont.Weight.Bold))
        login_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        google_btn = QPushButton("Google ile Devam Et")
        google_btn.setFixedHeight(45)
        google_btn.setObjectName("google_btn")
        google_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        google_btn.clicked.connect(self.handle_google_login)

        email_input = QLineEdit()
        email_input.setPlaceholderText("E-posta")
        email_input.setFixedHeight(40)

        pass_input = QLineEdit()
        pass_input.setPlaceholderText("Şifre")
        pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        pass_input.setFixedHeight(40)

        login_btn = QPushButton("Giriş Yap")
        login_btn.setFixedHeight(45)
        login_btn.setObjectName("primary_btn")
        login_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        login_btn.clicked.connect(lambda: self.screen_manager.setCurrentWidget(self.main_app_widget))

        signup_layout = QHBoxLayout()
        signup_text = QLabel("Hesabın yok mu?")
        signup_text.setObjectName("secondary_text")
        signup_btn = QPushButton("Textination'a kaydol")
        signup_btn.setObjectName("link_btn")
        signup_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        signup_layout.addWidget(signup_text)
        signup_layout.addWidget(signup_btn)
        signup_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        box_layout.addWidget(login_title)
        box_layout.addWidget(google_btn)
        box_layout.addWidget(QLabel("veya", alignment=Qt.AlignmentFlag.AlignCenter))
        box_layout.addWidget(email_input)
        box_layout.addWidget(pass_input)
        box_layout.addWidget(login_btn)
        box_layout.addLayout(signup_layout)

        layout.addWidget(login_box, alignment=Qt.AlignmentFlag.AlignCenter)
        self.screen_manager.addWidget(self.login_widget)

    def handle_google_login(self):
        print("[AUTH] Google login successful.")
        self.screen_manager.setCurrentWidget(self.main_app_widget)

    # ==========================================
    # 3. MAIN APP SCREEN (Sidebar + Content Pages)
    # ==========================================
    def init_main_app_screen(self):
        self.main_app_widget = QWidget()
        layout = QHBoxLayout(self.main_app_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Sidebar creation
        self.sidebar = QFrame()
        self.sidebar.setFixedWidth(260)
        self.sidebar.setObjectName("sidebar")
        sidebar_layout = QVBoxLayout(self.sidebar)
        sidebar_layout.setContentsMargins(12, 20, 12, 20)
        sidebar_layout.setSpacing(10)

        brand_font = QFont("Old English Text MT", 24, QFont.Weight.Normal)
        brand_font.setStyleHint(QFont.StyleHint.Serif)
        brand = QLabel("Textination")
        brand.setFont(brand_font)
        brand.setAlignment(Qt.AlignmentFlag.AlignCenter)
        brand.setObjectName("app_title")
        sidebar_layout.addWidget(brand)
        sidebar_layout.addSpacing(25)

        self.segments = [
            "Kitaplarım", 
            "Profil", 
            "Karakter Dosyası", 
            "Yazma Egzersizi", 
            "Mekan Fotoğrafları", 
            "Asistan Yazar", 
            "İlham Alıntıları"
        ]
        
        self.sidebar_buttons = {}
        for segment in self.segments:
            btn = QPushButton(segment)
            btn.setObjectName("sidebar_btn")
            btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
            
            def make_slot(seg):
                return lambda: self.load_folder_view(seg)

            btn.clicked.connect(make_slot(segment))
            sidebar_layout.addWidget(btn)
            self.sidebar_buttons[segment] = btn
            
        sidebar_layout.addStretch()

        self.theme_btn = QPushButton("Karanlık/Aydınlık Mod")
        self.theme_btn.setObjectName("theme_btn")
        self.theme_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.theme_btn.clicked.connect(self.toggle_theme)
        sidebar_layout.addWidget(self.theme_btn)

        # Content Area setup
        content_wrapper = QWidget()
        content_wrapper.setObjectName("main_content_wrapper")
        content_layout = QVBoxLayout(content_wrapper)
        content_layout.setContentsMargins(0, 0, 0, 0)
        
        top_nav = QFrame()
        top_nav.setFixedHeight(50)
        top_nav.setObjectName("top_nav")
        top_nav_layout = QHBoxLayout(top_nav)
        
        self.toggle_bar_btn = QPushButton("☰")
        self.toggle_bar_btn.setObjectName("icon_btn")
        self.toggle_bar_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.toggle_bar_btn.clicked.connect(self.toggle_sidebar)
        top_nav_layout.addWidget(self.toggle_bar_btn)

        self.user_badge = QLabel(f"👤 {self.user_profile['name']}")
        self.user_badge.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        self.user_badge.setObjectName("secondary_text")
        
        top_nav_layout.addStretch()
        top_nav_layout.addWidget(self.user_badge)
        top_nav_layout.addSpacing(15)
        
        content_layout.addWidget(top_nav)

        self.content_pages = QStackedWidget()
        content_layout.addWidget(self.content_pages)

        # Initialize Default View
        self.load_folder_view("Kitaplarım")

        layout.addWidget(self.sidebar)
        layout.addWidget(content_wrapper)
        self.screen_manager.addWidget(self.main_app_widget)

    # ==========================================
    # DYNAMIC FOLDER VIEW ROUTER
    # ==========================================
    def load_folder_view(self, segment_name):
        print(f"[NAV] Loading segment: {segment_name}")
        
        if segment_name == "Profil":
            self.load_profile_view()
            return
        elif segment_name == "Karakter Dosyası":
            self.load_character_templates_dashboard()
            return

        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(40, 40, 40, 40)
        
        header = QLabel(segment_name)
        header.setFont(QFont("Segoe UI", 28, QFont.Weight.Bold))
        header.setObjectName("header_text")
        layout.addWidget(header)

        if segment_name == "Kitaplarım":
            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            scroll.setStyleSheet("QScrollArea, QScrollArea > QWidget > QWidget { border: none; background: transparent; }")

            scroll_content = QWidget()
            grid = QGridLayout(scroll_content)
            grid.setSpacing(25)
            grid.setContentsMargins(10, 10, 10, 10)

            # 1. "Yeni Kitap Oluştur" Card
            creator_card = QFrame()
            creator_card.setFixedSize(200, 270)
            creator_card.setObjectName("card_box")
            c_layout = QVBoxLayout(creator_card)
            c_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

            create_btn = QPushButton("+")
            create_btn.setFixedSize(80, 80)
            create_btn.setObjectName("create_btn")
            create_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
            create_btn.clicked.connect(self.open_new_book_creation_form)
            
            create_label = QLabel("Yeni Kitap Oluştur")
            create_label.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
            create_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            create_label.setObjectName("secondary_text")
            
            c_layout.addWidget(create_btn, alignment=Qt.AlignmentFlag.AlignCenter)
            c_layout.addSpacing(10)
            c_layout.addWidget(create_label, alignment=Qt.AlignmentFlag.AlignCenter)
            
            grid.addWidget(creator_card, 0, 0)

            # 2. Display existing saved books
            col = 1
            row = 0
            for index, book in enumerate(self.saved_books):
                book_card = QFrame()
                book_card.setFixedSize(200, 270)
                book_card.setObjectName("book_card_item")
                
                has_cover = bool(book.get("cover") and QPixmap(book["cover"]).isNull() is False)

                if has_cover:
                    cover_path_clean = book['cover'].replace('\\', '/')
                    book_card.setStyleSheet(f"""
                        QFrame#book_card_item {{
                            border-radius: 12px;
                            border: 1px solid rgba(0,0,0,0.15);
                            background-image: url('{cover_path_clean}');
                            background-position: center;
                            background-repeat: no-repeat;
                        }}
                    """)
                else:
                    book_card.setStyleSheet("""
                        QFrame#book_card_item {
                            background-color: #FAF4DF;
                            border-radius: 12px;
                            border: 1px solid #E2D7A7;
                        }
                    """)

                b_layout = QVBoxLayout(book_card)
                b_layout.setContentsMargins(10, 10, 10, 10)
                b_layout.setSpacing(6)

                top_row = QHBoxLayout()
                top_row.addStretch()

                menu_btn = QPushButton("⋮")
                menu_btn.setFixedSize(30, 30)
                menu_btn.setStyleSheet("background-color: rgba(255,255,255,0.85); color: #2C3E50; font-weight: bold; border-radius: 15px; border: 1px solid rgba(0,0,0,0.1);")
                menu_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
                
                menu_btn.clicked.connect(lambda checked, b=book, idx=index, btn=menu_btn: self.show_book_context_menu(btn, b, idx))
                top_row.addWidget(menu_btn)

                b_layout.addLayout(top_row)
                b_layout.addStretch()

                text_overlay = QFrame()
                text_overlay.setStyleSheet("background-color: rgba(255, 255, 255, 0.92); border-radius: 8px; padding: 6px;")
                overlay_layout = QVBoxLayout(text_overlay)
                overlay_layout.setContentsMargins(8, 8, 8, 8)
                overlay_layout.setSpacing(4)

                b_title = QLabel(book["title"])
                b_title.setFont(QFont("Georgia", 11, QFont.Weight.Bold))
                b_title.setStyleSheet("color: #1A1A1A;")
                b_title.setWordWrap(True)

                author_name = book.get("author", self.user_profile["name"])
                b_author = QLabel(f"Yazar: {author_name}")
                b_author.setFont(QFont("Segoe UI", 8, QFont.Weight.Normal))
                b_author.setStyleSheet("color: #555555;")

                open_btn = QPushButton("Oku / Düzenle")
                open_btn.setObjectName("primary_btn")
                open_btn.setFixedHeight(32)
                open_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
                open_btn.clicked.connect(lambda checked, b=book: self.open_book_editor_from_item(b))

                overlay_layout.addWidget(b_title)
                overlay_layout.addWidget(b_author)
                overlay_layout.addSpacing(4)
                overlay_layout.addWidget(open_btn)

                b_layout.addWidget(text_overlay)

                grid.addWidget(book_card, row, col)
                col += 1
                if col > 3:
                    col = 0
                    row += 1

            scroll.setWidget(scroll_content)
            layout.addWidget(scroll)

        else:
            grid = QGridLayout()
            grid.setSpacing(20)
            
            create_btn = QPushButton("+")
            create_btn.setFixedSize(120, 120)
            create_btn.setObjectName("create_btn")
            create_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
            create_btn.clicked.connect(lambda: self.route_to_creator(segment_name))
            
            create_label = QLabel("Yeni Oluştur")
            create_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            create_label.setObjectName("secondary_text")
            
            creator_layout = QVBoxLayout()
            creator_layout.addWidget(create_btn, alignment=Qt.AlignmentFlag.AlignCenter)
            creator_layout.addWidget(create_label, alignment=Qt.AlignmentFlag.AlignCenter)
            
            creator_widget = QWidget()
            creator_widget.setLayout(creator_layout)
            grid.addWidget(creator_widget, 0, 0)
            
            layout.addLayout(grid)
            layout.addStretch()

        self.set_active_content_page(page)

    def open_book_editor_from_item(self, book):
        self.open_book_editor(
            title=book["title"],
            subject=book.get("subject", ""),
            cover_path=book.get("cover", ""),
            author=book.get("author", self.user_profile["name"]),
            initial_content=book.get("content", "")
        )

    # ==========================================
    # BOOK CARD CONTEXT MENU (İlİŞKİLERİ YÖNET DAHİL)
    # ==========================================
    def show_book_context_menu(self, button_widget, book, book_index):
        menu = QMenu(self)
        
        edit_action = QAction("✏️ Düzenle (Kapak, Başlık, Yazar)", self)
        rel_action = QAction("🕸️ İlişkileri Yönet (Şüpheliler Panosu)", self)
        delete_action = QAction("🗑️ Sil", self)
        
        edit_action.triggered.connect(lambda: self.open_edit_book_dialog(book, book_index))
        rel_action.triggered.connect(lambda: self.show_book_relationships_board(book["title"]))
        delete_action.triggered.connect(lambda: self.confirm_delete_book(book, book_index))
        
        menu.addAction(edit_action)
        menu.addAction(rel_action)
        menu.addSeparator()
        menu.addAction(delete_action)
        
        menu.exec(button_widget.mapToGlobal(QPointF(0, button_widget.height()).toPoint()))

    def open_edit_book_dialog(self, book, book_index):
        dialog = QDialog(self)
        dialog.setWindowTitle(f"Kitap Bilgilerini Düzenle: {book['title']}")
        dialog.setFixedWidth(450)
        
        layout = QVBoxLayout(dialog)
        layout.setSpacing(15)
        layout.setContentsMargins(25, 25, 25, 25)

        title_label = QLabel("Kitap Başlığı:")
        title_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        title_input = QLineEdit(book["title"])

        author_label = QLabel("Yazar Adı (Bu kitaba özel):")
        author_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        author_input = QLineEdit(book.get("author", self.user_profile["name"]))

        subject_label = QLabel("Kitap Konusu:")
        subject_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        subject_input = QTextEdit()
        subject_input.setPlainText(book.get("subject", ""))
        subject_input.setFixedHeight(70)

        manage_rel_btn = QPushButton("🕸️ Bu Kitabın İlişkilerini Yönet (Şematik Pano)")
        manage_rel_btn.setStyleSheet("background-color: #E8F8F5; color: #16A085; font-weight: bold; border-radius: 8px; padding: 8px; border: 1px solid #A3E4D7;")
        manage_rel_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        
        def open_board_and_accept():
            dialog.accept()
            self.show_book_relationships_board(book["title"])

        manage_rel_btn.clicked.connect(open_board_and_accept)

        cover_label = QLabel("Kitap Kapağı:")
        cover_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        
        cover_layout = QHBoxLayout()
        cover_path_val = [book.get("cover", "")]
        cover_info = QLabel("Görsel seçildi" if cover_path_val[0] else "Görsel yok")
        cover_info.setObjectName("secondary_text")
        
        def choose_img():
            f, _ = QFileDialog.getOpenFileName(dialog, "Kapak Resmi Seç", "", "Resimler (*.png *.jpg *.jpeg *.bmp)")
            if f:
                cover_path_val[0] = f
                cover_info.setText(f.split("/")[-1])

        choose_btn = QPushButton("📁 Görsel Seç")
        choose_btn.setObjectName("theme_btn")
        choose_btn.clicked.connect(choose_img)
        cover_layout.addWidget(choose_btn)
        cover_layout.addWidget(cover_info)
        cover_layout.addStretch()

        btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btn_box.accepted.connect(dialog.accept)
        btn_box.rejected.connect(dialog.reject)

        layout.addWidget(title_label)
        layout.addWidget(title_input)
        layout.addWidget(author_label)
        layout.addWidget(author_input)
        layout.addWidget(subject_label)
        layout.addWidget(subject_input)
        layout.addWidget(cover_label)
        layout.addLayout(cover_layout)
        layout.addSpacing(5)
        layout.addWidget(manage_rel_btn)
        layout.addSpacing(10)
        layout.addWidget(btn_box)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            new_title = title_input.text().strip() or "İsimsiz Kitap"
            new_author = author_input.text().strip() or self.user_profile["name"]
            
            old_title = book["title"]
            book["title"] = new_title
            book["author"] = new_author
            book["subject"] = subject_input.toPlainText().strip()
            book["cover"] = cover_path_val[0]

            # Update book title reference in book_persons & book_relations if changed
            if old_title != new_title:
                for p in self.book_persons:
                    if p.get("book_title") == old_title:
                        p["book_title"] = new_title
                for r in self.book_relations:
                    if r.get("book_title") == old_title:
                        r["book_title"] = new_title

            self.load_folder_view("Kitaplarım")

    def confirm_delete_book(self, book, book_index):
        reply = QMessageBox.question(
            self, 
            "Kitabı Sil", 
            f"'{book['title']}' isimli kitabı silmek istediğinize emin misiniz?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            deleted_title = book["title"]
            self.saved_books.pop(book_index)
            # Remove associated persons & relations
            self.book_persons = [p for p in self.book_persons if p.get("book_title") != deleted_title]
            self.book_relations = [r for r in self.book_relations if r.get("book_title") != deleted_title]
            self.load_folder_view("Kitaplarım")

    # ==========================================
    # 4. KARAKTER DOSYASI SEGMENTİ (İLKAM BANKASI & TASLAK VERİSİ)
    # ==========================================
    def load_character_templates_dashboard(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(40, 30, 40, 40)

        header_layout = QHBoxLayout()
        header = QLabel("Karakter Dosyası (İlham & Taslak Bankası)")
        header.setFont(QFont("Segoe UI", 24, QFont.Weight.Bold))
        header.setObjectName("header_text")

        sub_info = QLabel("Yazarlık sürecinizde karakter yaratırken ilham alabileceğiniz veya hikayelerinize aktarabileceğiniz taslaklar.")
        sub_info.setObjectName("secondary_text")

        header_layout.addWidget(header)
        header_layout.addStretch()

        layout.addLayout(header_layout)
        layout.addWidget(sub_info)
        layout.addSpacing(20)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea, QScrollArea > QWidget > QWidget { border: none; background: transparent; }")

        scroll_content = QWidget()
        grid = QGridLayout(scroll_content)
        grid.setSpacing(25)
        grid.setContentsMargins(10, 10, 10, 10)

        # 1. "Yeni Karakter Taslağı Oluştur" Card at position (0,0)
        creator_card = QFrame()
        creator_card.setFixedSize(250, 290)
        creator_card.setObjectName("card_box")
        c_layout = QVBoxLayout(creator_card)
        c_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        create_btn = QPushButton("+")
        create_btn.setFixedSize(80, 80)
        create_btn.setObjectName("create_btn")
        create_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        create_btn.clicked.connect(lambda: self.open_character_template_form(None))
        
        create_label = QLabel("Yeni Karakter Taslağı Oluştur")
        create_label.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        create_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        create_label.setObjectName("secondary_text")
        
        c_layout.addWidget(create_btn, alignment=Qt.AlignmentFlag.AlignCenter)
        c_layout.addSpacing(10)
        c_layout.addWidget(create_label, alignment=Qt.AlignmentFlag.AlignCenter)
        
        grid.addWidget(creator_card, 0, 0)

        # 2. Existing Character Archetype Templates
        col = 1
        row = 0
        for tpl in self.character_templates:
            char_card = QFrame()
            char_card.setFixedSize(250, 290)
            char_card.setObjectName("card_box")
            c_layout = QVBoxLayout(char_card)
            c_layout.setContentsMargins(14, 14, 14, 14)
            c_layout.setSpacing(6)

            top_box = QHBoxLayout()
            avatar_circle = QLabel("💡")
            avatar_circle.setFixedSize(42, 42)
            avatar_circle.setAlignment(Qt.AlignmentFlag.AlignCenter)
            avatar_circle.setFont(QFont("Segoe UI", 18))
            avatar_circle.setStyleSheet(f"background-color: {tpl.get('color', '#3498DB')}; border-radius: 21px;")
            
            info_box = QVBoxLayout()
            c_trait = QLabel(tpl.get("trait", "İsimsiz Taslak"))
            c_trait.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
            c_sub = QLabel(f"{tpl.get('job', '-')} | {tpl.get('gender', '-')}")
            c_sub.setObjectName("secondary_text")
            info_box.addWidget(c_trait)
            info_box.addWidget(c_sub)

            top_box.addWidget(avatar_circle)
            top_box.addSpacing(6)
            top_box.addLayout(info_box)
            top_box.addStretch()

            c_details = QLabel(f"Yaş: {tpl.get('age', '-')}\nSiyasi: {tpl.get('politics', '-')}\nDemografi: {tpl.get('demographics', '-')}")
            c_details.setFont(QFont("Segoe UI", 9))
            c_details.setObjectName("secondary_text")

            c_bio = QLabel(tpl.get("bio", "Açıklama yok."))
            c_bio.setWordWrap(True)
            c_bio.setFont(QFont("Segoe UI", 9))
            c_bio.setObjectName("secondary_text")

            btn_row = QHBoxLayout()
            edit_btn = QPushButton("Düzenle")
            edit_btn.setObjectName("theme_btn")
            edit_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
            edit_btn.clicked.connect(lambda checked, t=tpl: self.open_character_template_form(t))

            instantiate_btn = QPushButton("✨ Kişi Oluştur")
            instantiate_btn.setStyleSheet("background-color: #E8F8F5; color: #16A085; font-weight: bold; border-radius: 6px; padding: 6px 10px; font-size: 11px; border: 1px solid #A3E4D7;")
            instantiate_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
            instantiate_btn.clicked.connect(lambda checked, t=tpl: self.instantiate_person_from_template(t))

            btn_row.addWidget(edit_btn)
            btn_row.addWidget(instantiate_btn)

            c_layout.addLayout(top_box)
            c_layout.addWidget(c_details)
            c_layout.addWidget(c_bio)
            c_layout.addStretch()
            c_layout.addLayout(btn_row)

            grid.addWidget(char_card, row, col)
            col += 1
            if col > 3:
                col = 0
                row += 1

        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)

        self.set_active_content_page(page)

    # ==========================================
    # REUSABLE CHARACTER TEMPLATE FORM (KARAKTER DOSYASI İÇİN)
    # ==========================================
    def open_character_template_form(self, template_to_edit=None):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(40, 25, 40, 40)

        is_edit = template_to_edit is not None
        tpl_data = template_to_edit if is_edit else {
            "id": f"tpl_{len(self.character_templates)+1}",
            "trait": "",
            "age": "",
            "gender": "Seçiniz",
            "job": "",
            "demographics": "",
            "politics": "Seçiniz",
            "bio": "",
            "color": "#3498DB"
        }

        top_bar = QHBoxLayout()
        back_btn = QPushButton("← Karakter Dosyasına Dön")
        back_btn.setObjectName("theme_btn")
        back_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        back_btn.clicked.connect(self.load_character_templates_dashboard)
        top_bar.addWidget(back_btn)
        top_bar.addStretch()
        layout.addLayout(top_bar)
        layout.addSpacing(10)

        card = QFrame()
        card.setMaximumWidth(750)
        card.setObjectName("card_box")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(30, 30, 30, 30)
        card_layout.setSpacing(14)

        title_str = f"Karakter Taslağı Düzenle: {tpl_data['trait']}" if is_edit else "Yeni Karakter Taslağı Oluştur"
        form_title = QLabel(title_str)
        form_title.setFont(QFont("Segoe UI", 22, QFont.Weight.Bold))
        card_layout.addWidget(form_title)

        # 1. Karakter Özelliği
        trait_lbl = QLabel("Karakter Özelliği * (Örn: İçine kapanık memur)")
        trait_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        trait_in = QLineEdit(tpl_data["trait"])
        trait_in.setPlaceholderText("Örn: İçine kapanık memur, Hırslı akademisyen...")

        # 2. Yaş (Decimal / Integer numeric only validator)
        row_age_gender = QHBoxLayout()
        
        age_box = QVBoxLayout()
        age_lbl = QLabel("Yaş (Sayısal)")
        age_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        age_in = QLineEdit(str(tpl_data.get("age", "")))
        age_in.setValidator(QIntValidator(0, 150))
        age_in.setPlaceholderText("Örn: 32")
        age_box.addWidget(age_lbl)
        age_box.addWidget(age_in)

        # 3. Cinsiyet (Dropdown: Seçiniz, Kadın, Erkek, Non-Binary)
        gender_box = QVBoxLayout()
        gender_lbl = QLabel("Cinsiyet")
        gender_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        gender_in = QComboBox()
        gender_in.addItems(["Seçiniz", "Kadın", "Erkek", "Non-Binary"])
        if tpl_data.get("gender") in ["Seçiniz", "Kadın", "Erkek", "Non-Binary"]:
            gender_in.setCurrentText(tpl_data["gender"])
        gender_box.addWidget(gender_lbl)
        gender_box.addWidget(gender_in)

        row_age_gender.addLayout(age_box, stretch=1)
        row_age_gender.addLayout(gender_box, stretch=1)

        # 4. Meslek & Demografi (String inputs)
        row_job_demo = QHBoxLayout()
        
        job_box = QVBoxLayout()
        job_lbl = QLabel("Meslek (String)")
        job_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        job_in = QLineEdit(tpl_data.get("job", ""))
        job_in.setPlaceholderText("Örn: Kütüphaneci, Mühendis...")
        job_box.addWidget(job_lbl)
        job_box.addWidget(job_in)

        demo_box = QVBoxLayout()
        demo_lbl = QLabel("Demografi (String)")
        demo_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        demo_in = QLineEdit(tpl_data.get("demographics", ""))
        demo_in.setPlaceholderText("Örn: Kentli orta sınıf...")
        demo_box.addWidget(demo_lbl)
        demo_box.addWidget(demo_in)

        row_job_demo.addLayout(job_box, stretch=1)
        row_job_demo.addLayout(demo_box, stretch=1)

        # 5. Siyasi Görüş (Dropdown List)
        politics_lbl = QLabel("Siyasi Görüş (Listeli)")
        politics_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        politics_in = QComboBox()
        politics_in.addItems(["Seçiniz", "Apolitik", "Sosyal Demokrat", "Liberal", "Muhafazakar", "Sosyalist", "Milliyetçi", "Diğer"])
        if tpl_data.get("politics") in ["Seçiniz", "Apolitik", "Sosyal Demokrat", "Liberal", "Muhafazakar", "Sosyalist", "Milliyetçi", "Diğer"]:
            politics_in.setCurrentText(tpl_data["politics"])

        # 6. Açıklama / Biyografi
        bio_lbl = QLabel("Açıklama / Biyografi Taslağı")
        bio_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        bio_in = QTextEdit()
        bio_in.setPlainText(tpl_data.get("bio", ""))
        bio_in.setPlaceholderText("Karakterin kişilik detayları ve ilham notları...")
        bio_in.setFixedHeight(65)

        card_layout.addWidget(trait_lbl)
        card_layout.addWidget(trait_in)
        card_layout.addLayout(row_age_gender)
        card_layout.addLayout(row_job_demo)
        card_layout.addWidget(politics_lbl)
        card_layout.addWidget(politics_in)
        card_layout.addWidget(bio_lbl)
        card_layout.addWidget(bio_in)

        # Action Buttons: Taslağı Kaydet + ✨ Kişi Oluştur
        btn_action_row = QHBoxLayout()
        
        save_tpl_btn = QPushButton("💾 Taslağı Kaydet")
        save_tpl_btn.setObjectName("theme_btn")
        save_tpl_btn.setFixedHeight(42)
        save_tpl_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        create_person_from_this_btn = QPushButton("✨ Bu Taslaktan Kişi Oluştur")
        create_person_from_this_btn.setObjectName("primary_btn")
        create_person_from_this_btn.setFixedHeight(42)
        create_person_from_this_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        def save_template_data():
            trait_val = trait_in.text().strip()
            if not trait_val:
                QMessageBox.warning(self, "Uyarı", "Karakter özelliği boş bırakılamaz.")
                return False

            tpl_data["trait"] = trait_val
            tpl_data["age"] = age_in.text().strip()
            tpl_data["gender"] = gender_in.currentText()
            tpl_data["job"] = job_in.text().strip()
            tpl_data["demographics"] = demo_in.text().strip()
            tpl_data["politics"] = politics_in.currentText()
            tpl_data["bio"] = bio_in.toPlainText().strip()

            if not any(t["id"] == tpl_data["id"] for t in self.character_templates):
                self.character_templates.append(tpl_data)
            return True

        def on_save_click():
            if save_template_data():
                self.load_character_templates_dashboard()

        def on_create_person_click():
            if save_template_data():
                self.instantiate_person_from_template(tpl_data)

        save_tpl_btn.clicked.connect(on_save_click)
        create_person_from_this_btn.clicked.connect(on_create_person_click)

        btn_action_row.addWidget(save_tpl_btn)
        btn_action_row.addWidget(create_person_from_this_btn)

        card_layout.addSpacing(10)
        card_layout.addLayout(btn_action_row)

        layout.addWidget(card, alignment=Qt.AlignmentFlag.AlignCenter)
        layout.addStretch()

        self.set_active_content_page(page)

    # ==========================================
    # INSTANTIATE PERSON FROM TEMPLATE (TASLAKTAN KİŞİ OLUŞTURMA AKIŞI)
    # ==========================================
    def instantiate_person_from_template(self, tpl_data):
        dialog = QDialog(self)
        dialog.setWindowTitle("Kişi Oluştur (Hikayeye Aktar)")
        dialog.setFixedWidth(430)

        layout = QVBoxLayout(dialog)
        layout.setSpacing(15)
        layout.setContentsMargins(25, 25, 25, 25)

        info_lbl = QLabel(f"<b>'{tpl_data['trait']}'</b> taslağından yeni bir kişi oluşturuluyor:")
        info_lbl.setWordWrap(True)

        name_lbl = QLabel("Kişi İsmi * (Zorunlu):")
        name_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        name_in = QLineEdit()
        name_in.setPlaceholderText("Örn: Ahmet Yılmaz")

        book_lbl = QLabel("Ait Olduğu Kitap:")
        book_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        book_combo = QComboBox()
        
        for b in self.saved_books:
            book_combo.addItem(b["title"])
        book_combo.addItem("➕ Yeni Kitap Oluştur (Otomatik)")

        btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btn_box.accepted.connect(dialog.accept)
        btn_box.rejected.connect(dialog.reject)

        layout.addWidget(info_lbl)
        layout.addWidget(name_lbl)
        layout.addWidget(name_in)
        layout.addWidget(book_lbl)
        layout.addWidget(book_combo)
        layout.addSpacing(10)
        layout.addWidget(btn_box)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            person_name = name_in.text().strip()
            if not person_name:
                QMessageBox.warning(self, "Uyarı", "Kişi ismi girilmesi zorunludur.")
                return

            selected_book_option = book_combo.currentText()

            # Rule: If no specific existing book is selected or "Yeni Kitap Oluştur" is chosen,
            # auto-create a book named "{Kişi İsmi} Kitabı" in saved_books!
            if selected_book_option == "➕ Yeni Kitap Oluştur (Otomatik)":
                target_book_title = f"{person_name} Kitabı"
                if not any(b["title"] == target_book_title for b in self.saved_books):
                    self.saved_books.append({
                        "title": target_book_title,
                        "subject": f"{person_name} karakterinin hikayesi.",
                        "cover": "",
                        "author": self.user_profile["name"],
                        "content": ""
                    })
            else:
                target_book_title = selected_book_option

            # Create Person Instance
            new_person = {
                "id": f"p_{len(self.book_persons)+1}",
                "name": person_name,
                "book_title": target_book_title,
                "trait": tpl_data.get("trait", ""),
                "age": tpl_data.get("age", ""),
                "gender": tpl_data.get("gender", ""),
                "job": tpl_data.get("job", ""),
                "demographics": tpl_data.get("demographics", ""),
                "politics": tpl_data.get("politics", ""),
                "bio": tpl_data.get("bio", ""),
                "color": tpl_data.get("color", "#3498DB")
            }

            self.book_persons.append(new_person)
            
            QMessageBox.information(
                self, 
                "Başarılı", 
                f"'{person_name}' isimli kişi '{target_book_title}' kitabına başarıyla eklendi!"
            )
            # Switch to that book's relationship board
            self.show_book_relationships_board(target_book_title)

    # ==========================================
    # KİTABIN İLİŞKİLERİ YÖNET SAYFASI (POLİSİYE PANO & SAĞ TIK KİŞİ YARATMA)
    # ==========================================
    def show_book_relationships_board(self, book_title):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(20, 20, 20, 20)

        top_bar = QHBoxLayout()
        back_btn = QPushButton("← Kitaplarıma Dön")
        back_btn.setObjectName("theme_btn")
        back_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        back_btn.clicked.connect(lambda: self.load_folder_view("Kitaplarım"))

        header = QLabel(f"📖 '{book_title}' — İlişki Haritası & Şüpheliler Panosu")
        header.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        header.setObjectName("header_text")

        add_person_btn = QPushButton("➕ Karakter/Kişi Ekle")
        add_person_btn.setObjectName("primary_btn")
        add_person_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        def show_add_person_menu():
            menu = QMenu(self)
            act_tpl = QAction("📋 Dosyadan Kişi Yarat (Taslak Kullan)", self)
            act_scratch = QAction("✨ Sıfırdan Kişi Yarat", self)
            
            act_tpl.triggered.connect(lambda: self.open_create_person_flow(book_title, mode="from_template"))
            act_scratch.triggered.connect(lambda: self.open_create_person_flow(book_title, mode="from_scratch"))

            menu.addAction(act_tpl)
            menu.addAction(act_scratch)
            menu.exec(add_person_btn.mapToGlobal(QPointF(0, add_person_btn.height()).toPoint()))

        add_person_btn.clicked.connect(show_add_person_menu)

        add_rel_btn = QPushButton("🔗 İlişki Bağla")
        add_rel_btn.setStyleSheet("background-color: #E8F8F5; color: #16A085; font-weight: bold; border-radius: 8px; padding: 8px 14px; font-size: 13px; border: 1px solid #A3E4D7;")
        add_rel_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        add_rel_btn.clicked.connect(lambda: self.open_book_relation_dialog(book_title))

        top_bar.addWidget(back_btn)
        top_bar.addSpacing(15)
        top_bar.addWidget(header)
        top_bar.addStretch()
        top_bar.addWidget(add_person_btn)
        top_bar.addSpacing(8)
        top_bar.addWidget(add_rel_btn)
        layout.addLayout(top_bar)

        scene = QGraphicsScene()
        scene.setBackgroundBrush(QBrush(QColor("#2B1B12"))) # Warm Dark Detective Corkboard

        # Custom view supporting Right-click Context Menu
        view = DetectiveBoardGraphicsView(scene, self, book_title)
        view.setObjectName("canvas_view")
        view.setStyleSheet("QGraphicsView { border: 6px solid #4E342E; border-radius: 12px; }")
        view.setRenderHint(QGraphicsView.RenderHint.Antialiasing)

        # Attach scene update reference
        scene.update_connecting_lines = lambda: self.render_book_schematic_scene(scene, book_title)

        # Control panel for relationship thread filters
        control_panel = QFrame()
        control_panel.setStyleSheet("background-color: rgba(36, 36, 40, 0.95); border-radius: 10px; padding: 8px; border: 1px solid rgba(255,255,255,0.1);")
        cp_layout = QHBoxLayout(control_panel)
        cp_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        cp_layout.setSpacing(12)

        ctrl_title = QLabel("İlişki İpi Filtreleri:")
        ctrl_title.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        ctrl_title.setStyleSheet("color: #F5EEF8;")
        cp_layout.addWidget(ctrl_title)

        btn_all = QPushButton("Tümü")
        btn_all.setCheckable(True)
        btn_all.setChecked(all(self.active_schematic_filters.values()))
        btn_all.setStyleSheet("padding: 6px 12px; font-weight: bold; color: white;")
        btn_all.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        btn_family = QPushButton("🟢 Aile Baloncuğu")
        btn_family.setCheckable(True)
        btn_family.setChecked(self.active_schematic_filters["Aile"])
        btn_family.setStyleSheet("padding: 6px 12px; font-weight: bold; color: #27AE60;")
        btn_family.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        btn_friends = QPushButton("🟡 Arkadaşlık İpi")
        btn_friends.setCheckable(True)
        btn_friends.setChecked(self.active_schematic_filters["Arkadaşlık"])
        btn_friends.setStyleSheet("padding: 6px 12px; font-weight: bold; color: #F1C40F;")
        btn_friends.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        btn_love = QPushButton("🔴 Aşk İpi")
        btn_love.setCheckable(True)
        btn_love.setChecked(self.active_schematic_filters["Aşk"])
        btn_love.setStyleSheet("padding: 6px 12px; font-weight: bold; color: #E74C3C;")
        btn_love.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

        def update_render():
            self.render_book_schematic_scene(scene, book_title)

        def toggle_all():
            state = btn_all.isChecked()
            self.active_schematic_filters["Aile"] = state
            self.active_schematic_filters["Arkadaşlık"] = state
            self.active_schematic_filters["Aşk"] = state
            btn_family.setChecked(state)
            btn_friends.setChecked(state)
            btn_love.setChecked(state)
            update_render()

        def toggle_filter(key, button):
            self.active_schematic_filters[key] = button.isChecked()
            btn_all.setChecked(all([self.active_schematic_filters["Aile"], self.active_schematic_filters["Arkadaşlık"], self.active_schematic_filters["Aşk"]]))
            update_render()

        btn_all.clicked.connect(toggle_all)
        btn_family.clicked.connect(lambda: toggle_filter("Aile", btn_family))
        btn_friends.clicked.connect(lambda: toggle_filter("Arkadaşlık", btn_friends))
        btn_love.clicked.connect(lambda: toggle_filter("Aşk", btn_love))

        cp_layout.addWidget(btn_all)
        cp_layout.addWidget(btn_family)
        cp_layout.addWidget(btn_friends)
        cp_layout.addWidget(btn_love)

        layout.addWidget(view)
        layout.addWidget(control_panel)

        self.render_book_schematic_scene(scene, book_title)

        self.set_active_content_page(page)

    def render_book_schematic_scene(self, scene, book_title):
        scene.clear()

        persons_in_book = [p for p in self.book_persons if p.get("book_title") == book_title]
        relations_in_book = [r for r in self.book_relations if r.get("book_title") == book_title]

        if not persons_in_book:
            empty_msg = scene.addText(f"'{book_title}' kitabına henüz bir kişi eklenmedi.\n\nPanoya sağ tıklayarak veya yukarıdaki '+ Karakter/Kişi Ekle' butonuna basarak kişi ekleyebilirsiniz.")
            empty_msg.setDefaultTextColor(QColor("#D5D8DC"))
            empty_msg.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
            empty_msg.setPos(120, 180)
            return

        family_rels = [r for r in relations_in_book if r["type"] == "Aile"]
        family_person_ids = set()
        for r in family_rels:
            family_person_ids.add(r["from_id"])
            family_person_ids.add(r["to_id"])

        family_persons = [p for p in persons_in_book if p["id"] in family_person_ids]
        other_persons = [p for p in persons_in_book if p["id"] not in family_person_ids]

        pos_dict = {}

        if family_persons:
            fam_cx, fam_cy = 280, 240
            f_radius = 110
            for i, p in enumerate(family_persons):
                angle = (2 * math.pi * i) / len(family_persons)
                fx = fam_cx + f_radius * math.cos(angle)
                fy = fam_cy + f_radius * math.sin(angle)
                pos_dict[p["id"]] = (fx, fy)

            if self.active_schematic_filters.get("Aile", True):
                bubble_rect = QRectF(120, 90, 320, 300)
                bubble_item = QGraphicsEllipseItem(bubble_rect)
                
                dash_pen = QPen(QColor("#27AE60"), 3.5, Qt.PenStyle.DotLine)
                dash_pen.setDashPattern([3, 4])
                bubble_item.setPen(dash_pen)
                bubble_item.setBrush(QBrush(QColor(39, 174, 96, 25)))
                scene.addItem(bubble_item)

                bubble_title = scene.addText("🟢 Ailesel Küme (Baloncuk)")
                bubble_title.setDefaultTextColor(QColor("#A9DFBF"))
                bubble_title.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
                bubble_title.setPos(150, 60)

        ox = 680
        oy = 150
        for p in other_persons:
            pos_dict[p["id"]] = (ox, oy)
            oy += 180

        for rel in relations_in_book:
            r_type = rel["type"]
            
            is_visible = False
            if r_type == "Aile" and self.active_schematic_filters.get("Aile", True):
                is_visible = True
            elif (r_type == "Romantik İlişki" or r_type == "Aşk") and self.active_schematic_filters.get("Aşk", True):
                is_visible = True
            elif r_type == "Arkadaşlık" and self.active_schematic_filters.get("Arkadaşlık", True):
                is_visible = True
            elif r_type not in ["Aile", "Romantik İlişki", "Aşk", "Arkadaşlık"]:
                is_visible = True

            if is_visible and rel["from_id"] in pos_dict and rel["to_id"] in pos_dict:
                x1, y1 = pos_dict[rel["from_id"]]
                x2, y2 = pos_dict[rel["to_id"]]

                if r_type == "Aile":
                    line_pen = QPen(QColor("#27AE60"), 2.5, Qt.PenStyle.DotLine)
                elif r_type in ["Romantik İlişki", "Aşk"]:
                    line_pen = QPen(QColor("#E74C3C"), 3.5, Qt.PenStyle.DotLine)
                elif r_type == "Arkadaşlık":
                    line_pen = QPen(QColor("#F1C40F"), 3.5, Qt.PenStyle.DotLine)
                else:
                    line_pen = QPen(QColor("#8E44AD"), 2.5, Qt.PenStyle.DotLine)

                scene.addLine(x1, y1, x2, y2, line_pen)

                mid_x = (x1 + x2) / 2
                mid_y = (y1 + y2) / 2
                lbl_text = "Aşk" if r_type in ["Romantik İlişki", "Aşk"] else r_type
                
                label = scene.addText(lbl_text)
                label.setDefaultTextColor(line_pen.color())
                label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
                label.setPos(mid_x - 20, mid_y - 12)

        for person in persons_in_book:
            if person["id"] in pos_dict:
                cx, cy = pos_dict[person["id"]]
                node_item = PersonNodeItem(person, self, book_title)
                node_item.setPos(cx, cy)
                scene.addItem(node_item)

    # ==========================================
    # DOSYADAN VE SIFIRDAN KİŞİ OLUŞTURMA AKIŞLARI
    # ==========================================
    def open_create_person_flow(self, book_title, mode="from_scratch"):
        if mode == "from_template":
            if not self.character_templates:
                QMessageBox.information(self, "Bilgi", "Henüz Karakter Dosyasında kayıtlı bir taslak yok. Sıfırdan kişi yaratma formuna yönlendiriliyorsunuz.")
                self.open_create_person_flow(book_title, mode="from_scratch")
                return

            dialog = QDialog(self)
            dialog.setWindowTitle(f"'{book_title}' İçin Dosyadan Kişi Yarat")
            dialog.setFixedWidth(420)

            layout = QVBoxLayout(dialog)
            layout.setSpacing(15)
            layout.setContentsMargins(25, 25, 25, 25)

            tpl_label = QLabel("Karakter Dosyasından Bir Taslak Seçin:")
            tpl_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            
            tpl_combo = QComboBox()
            for t in self.character_templates:
                tpl_combo.addItem(f"💡 {t['trait']} ({t.get('job', '-')})", t)

            name_label = QLabel("Kişi İsmi * (Zorunlu):")
            name_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            name_input = QLineEdit()
            name_input.setPlaceholderText("Örn: Ahmet Yılmaz")

            btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
            btn_box.accepted.connect(dialog.accept)
            btn_box.rejected.connect(dialog.reject)

            layout.addWidget(tpl_label)
            layout.addWidget(tpl_combo)
            layout.addWidget(name_label)
            layout.addWidget(name_input)
            layout.addSpacing(10)
            layout.addWidget(btn_box)

            if dialog.exec() == QDialog.DialogCode.Accepted:
                p_name = name_input.text().strip()
                if not p_name:
                    QMessageBox.warning(self, "Uyarı", "Kişi ismi boş bırakılamaz.")
                    return

                selected_tpl = tpl_combo.currentData()
                new_person = {
                    "id": f"p_{len(self.book_persons)+1}",
                    "name": p_name,
                    "book_title": book_title,
                    "trait": selected_tpl.get("trait", ""),
                    "age": selected_tpl.get("age", ""),
                    "gender": selected_tpl.get("gender", ""),
                    "job": selected_tpl.get("job", ""),
                    "demographics": selected_tpl.get("demographics", ""),
                    "politics": selected_tpl.get("politics", ""),
                    "bio": selected_tpl.get("bio", ""),
                    "color": selected_tpl.get("color", "#3498DB")
                }
                self.book_persons.append(new_person)
                self.show_book_relationships_board(book_title)

        else: # SIFIRDAN KİŞİ YARAT
            dialog = QDialog(self)
            dialog.setWindowTitle(f"'{book_title}' İçin Sıfırdan Kişi Yarat")
            dialog.setFixedWidth(450)

            layout = QVBoxLayout(dialog)
            layout.setSpacing(12)
            layout.setContentsMargins(25, 25, 25, 25)

            name_lbl = QLabel("Kişi İsmi * (ZORUNLU):")
            name_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            name_in = QLineEdit()
            name_in.setPlaceholderText("Örn: Ahmet Yılmaz")

            trait_lbl = QLabel("Karakter Özelliği (Örn: İçine kapanık memur):")
            trait_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            trait_in = QLineEdit()

            row_age_gen = QHBoxLayout()
            age_in = QLineEdit()
            age_in.setValidator(QIntValidator(0, 150))
            age_in.setPlaceholderText("Yaş")

            gen_in = QComboBox()
            gen_in.addItems(["Seçiniz", "Kadın", "Erkek", "Non-Binary"])

            row_age_gen.addWidget(QLabel("Yaş:"))
            row_age_gen.addWidget(age_in)
            row_age_gen.addWidget(QLabel("Cinsiyet:"))
            row_age_gen.addWidget(gen_in)

            job_lbl = QLabel("Meslek / Demografi:")
            job_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            job_in = QLineEdit()
            job_in.setPlaceholderText("Meslek...")

            bio_lbl = QLabel("Biyografi / Detaylar:")
            bio_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            bio_in = QTextEdit()
            bio_in.setFixedHeight(60)

            btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
            btn_box.accepted.connect(dialog.accept)
            btn_box.rejected.connect(dialog.reject)

            layout.addWidget(name_lbl)
            layout.addWidget(name_in)
            layout.addWidget(trait_lbl)
            layout.addWidget(trait_in)
            layout.addLayout(row_age_gen)
            layout.addWidget(job_lbl)
            layout.addWidget(job_in)
            layout.addWidget(bio_lbl)
            layout.addWidget(bio_in)
            layout.addSpacing(10)
            layout.addWidget(btn_box)

            if dialog.exec() == QDialog.DialogCode.Accepted:
                p_name = name_in.text().strip()
                if not p_name:
                    QMessageBox.warning(self, "Uyarı", "Kişi ismi verilmesi zorunludur!")
                    return

                new_person = {
                    "id": f"p_{len(self.book_persons)+1}",
                    "name": p_name,
                    "book_title": book_title,
                    "trait": trait_in.text().strip(),
                    "age": age_in.text().strip(),
                    "gender": gen_in.currentText(),
                    "job": job_in.text().strip(),
                    "demographics": "",
                    "politics": "Seçiniz",
                    "bio": bio_in.toPlainText().strip(),
                    "color": "#3498DB"
                }
                self.book_persons.append(new_person)
                self.show_book_relationships_board(book_title)

    def open_edit_person_dialog(self, person, book_title):
        dialog = QDialog(self)
        dialog.setWindowTitle(f"Kişi Bilgilerini Düzenle: {person['name']}")
        dialog.setFixedWidth(420)

        layout = QVBoxLayout(dialog)
        layout.setSpacing(12)
        layout.setContentsMargins(25, 25, 25, 25)

        name_lbl = QLabel("Kişi İsmi *:")
        name_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        name_in = QLineEdit(person["name"])

        trait_lbl = QLabel("Karakter Özelliği:")
        trait_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        trait_in = QLineEdit(person.get("trait", ""))

        row_age_gen = QHBoxLayout()
        age_in = QLineEdit(str(person.get("age", "")))
        age_in.setValidator(QIntValidator(0, 150))
        
        gen_in = QComboBox()
        gen_in.addItems(["Seçiniz", "Kadın", "Erkek", "Non-Binary"])
        if person.get("gender") in ["Seçiniz", "Kadın", "Erkek", "Non-Binary"]:
            gen_in.setCurrentText(person["gender"])

        row_age_gen.addWidget(QLabel("Yaş:"))
        row_age_gen.addWidget(age_in)
        row_age_gen.addWidget(QLabel("Cinsiyet:"))
        row_age_gen.addWidget(gen_in)

        job_lbl = QLabel("Meslek:")
        job_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        job_in = QLineEdit(person.get("job", ""))

        bio_lbl = QLabel("Biyografi:")
        bio_lbl.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        bio_in = QTextEdit()
        bio_in.setPlainText(person.get("bio", ""))
        bio_in.setFixedHeight(60)

        btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btn_box.accepted.connect(dialog.accept)
        btn_box.rejected.connect(dialog.reject)

        del_person_btn = QPushButton("🗑️ Bu Kişiyi Sil")
        del_person_btn.setStyleSheet("background-color: #FDEDEC; color: #E74C3C; font-weight: bold; border-radius: 6px; padding: 6px;")
        
        def delete_this_person():
            dialog.reject()
            self.book_persons.remove(person)
            # Remove associated relations
            self.book_relations = [r for r in self.book_relations if r["from_id"] != person["id"] and r["to_id"] != person["id"]]
            self.show_book_relationships_board(book_title)

        del_person_btn.clicked.connect(delete_this_person)

        layout.addWidget(name_lbl)
        layout.addWidget(name_in)
        layout.addWidget(trait_lbl)
        layout.addWidget(trait_in)
        layout.addLayout(row_age_gen)
        layout.addWidget(job_lbl)
        layout.addWidget(job_in)
        layout.addWidget(bio_lbl)
        layout.addWidget(bio_in)
        layout.addSpacing(5)
        layout.addWidget(del_person_btn)
        layout.addSpacing(10)
        layout.addWidget(btn_box)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            new_name = name_in.text().strip()
            if new_name:
                person["name"] = new_name
                person["trait"] = trait_in.text().strip()
                person["age"] = age_in.text().strip()
                person["gender"] = gen_in.currentText()
                person["job"] = job_in.text().strip()
                person["bio"] = bio_in.toPlainText().strip()
                self.show_book_relationships_board(book_title)

    def open_book_relation_dialog(self, book_title):
        persons_in_book = [p for p in self.book_persons if p.get("book_title") == book_title]
        if len(persons_in_book) < 2:
            QMessageBox.warning(self, "Uyarı", f"'{book_title}' kitabında ilişki oluşturabilmek için en az 2 kişi eklenmiş olmalıdır.")
            return

        dialog = QDialog(self)
        dialog.setWindowTitle(f"İlişki Bağla: {book_title}")
        dialog.setFixedWidth(380)

        layout = QVBoxLayout(dialog)
        layout.setSpacing(14)
        layout.setContentsMargins(25, 25, 25, 25)

        lbl_c1 = QLabel("1. Kişi:")
        lbl_c1.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        combo_c1 = QComboBox()
        for p in persons_in_book:
            combo_c1.addItem(p["name"], p["id"])

        lbl_c2 = QLabel("2. Kişi:")
        lbl_c2.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        combo_c2 = QComboBox()
        for p in persons_in_book:
            combo_c2.addItem(p["name"], p["id"])

        if len(persons_in_book) > 1:
            combo_c2.setCurrentIndex(1)

        lbl_type = QLabel("İlişki Türü:")
        lbl_type.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        combo_type = QComboBox()
        combo_type.addItems(["Aile", "Arkadaşlık", "Aşk", "Düşmanlık"])

        btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btn_box.accepted.connect(dialog.accept)
        btn_box.rejected.connect(dialog.reject)

        layout.addWidget(lbl_c1)
        layout.addWidget(combo_c1)
        layout.addWidget(lbl_c2)
        layout.addWidget(combo_c2)
        layout.addWidget(lbl_type)
        layout.addWidget(combo_type)
        layout.addSpacing(10)
        layout.addWidget(btn_box)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            from_id = combo_c1.currentData()
            to_id = combo_c2.currentData()

            if from_id == to_id:
                QMessageBox.warning(self, "Uyarı", "Bir kişi kendisiyle ilişkilendirilemez.")
                return

            rel_type = combo_type.currentText()
            self.book_relations.append({
                "id": f"r_{len(self.book_relations)+1}",
                "from_id": from_id,
                "to_id": to_id,
                "type": rel_type,
                "book_title": book_title
            })
            self.show_book_relationships_board(book_title)

    # ==========================================
    # 5. PROFIL SEGMENT VIEW
    # ==========================================
    def load_profile_view(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(40, 40, 40, 40)

        header = QLabel("Profil Bilgileri")
        header.setFont(QFont("Segoe UI", 28, QFont.Weight.Bold))
        header.setObjectName("header_text")
        layout.addWidget(header)
        layout.addSpacing(15)

        profile_card = QFrame()
        profile_card.setMaximumWidth(650)
        profile_card.setObjectName("card_box")
        card_layout = QVBoxLayout(profile_card)
        card_layout.setContentsMargins(35, 35, 35, 35)
        card_layout.setSpacing(18)

        avatar_layout = QHBoxLayout()
        avatar_icon = QLabel("👤")
        avatar_icon.setFont(QFont("Segoe UI", 48))
        avatar_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)

        avatar_info = QVBoxLayout()
        avatar_title = QLabel(self.user_profile["name"])
        avatar_title.setFont(QFont("Segoe UI", 18, QFont.Weight.Bold))
        avatar_sub = QLabel("Textination Yazar Hesabı")
        avatar_sub.setObjectName("secondary_text")
        avatar_info.addWidget(avatar_title)
        avatar_info.addWidget(avatar_sub)

        avatar_layout.addWidget(avatar_icon)
        avatar_layout.addSpacing(15)
        avatar_layout.addLayout(avatar_info)
        avatar_layout.addStretch()

        card_layout.addLayout(avatar_layout)
        card_layout.addSpacing(10)

        name_label = QLabel("Yazar Adı / Kullanıcı Adı *")
        name_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.profile_name_input = QLineEdit(self.user_profile["name"])
        self.profile_name_input.setFixedHeight(42)

        email_label = QLabel("E-posta Adresi")
        email_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.profile_email_input = QLineEdit(self.user_profile["email"])
        self.profile_email_input.setFixedHeight(42)

        bio_label = QLabel("Yazar Biyografisi / Hakkında")
        bio_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.profile_bio_input = QTextEdit()
        self.profile_bio_input.setPlainText(self.user_profile["bio"])
        self.profile_bio_input.setFixedHeight(90)

        self.profile_status_msg = QLabel("")
        self.profile_status_msg.setStyleSheet("color: #27AE60; font-weight: bold; font-size: 13px;")

        save_btn = QPushButton("Profil Bilgilerini Kaydet")
        save_btn.setFixedHeight(45)
        save_btn.setObjectName("primary_btn")
        save_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        save_btn.clicked.connect(self.save_profile_changes)

        card_layout.addWidget(name_label)
        card_layout.addWidget(self.profile_name_input)
        card_layout.addWidget(email_label)
        card_layout.addWidget(self.profile_email_input)
        card_layout.addWidget(bio_label)
        card_layout.addWidget(self.profile_bio_input)
        card_layout.addSpacing(10)
        card_layout.addWidget(save_btn)
        card_layout.addWidget(self.profile_status_msg)

        layout.addWidget(profile_card)
        layout.addStretch()

        self.set_active_content_page(page)

    def save_profile_changes(self):
        new_name = self.profile_name_input.text().strip()
        if new_name:
            self.user_profile["name"] = new_name
            self.user_profile["email"] = self.profile_email_input.text().strip()
            self.user_profile["bio"] = self.profile_bio_input.toPlainText().strip()
            self.user_badge.setText(f"👤 {self.user_profile['name']}")
            self.profile_status_msg.setText("✓ Profil bilgileriniz başarıyla güncellendi!")
        else:
            self.profile_status_msg.setText("⚠️ Yazar adı boş bırakılamaz.")

    # ==========================================
    # 6. NEW BOOK CREATION FORM
    # ==========================================
    def open_new_book_creation_form(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(40, 30, 40, 40)

        top_bar = QHBoxLayout()
        back_btn = QPushButton("← Kitaplarıma Dön")
        back_btn.setObjectName("theme_btn")
        back_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        back_btn.clicked.connect(lambda: self.load_folder_view("Kitaplarım"))
        top_bar.addWidget(back_btn)
        top_bar.addStretch()
        layout.addLayout(top_bar)
        layout.addSpacing(15)

        form_card = QFrame()
        form_card.setMaximumWidth(700)
        form_card.setObjectName("card_box")
        card_layout = QVBoxLayout(form_card)
        card_layout.setContentsMargins(35, 35, 35, 35)
        card_layout.setSpacing(18)

        form_title = QLabel("Yeni Kitap Oluştur")
        form_title.setFont(QFont("Segoe UI", 24, QFont.Weight.Bold))
        
        form_sub = QLabel("Kitabınızın başlığını, yazarını ve konusunu belirleyip yazmaya geçebilirsiniz.")
        form_sub.setObjectName("secondary_text")

        card_layout.addWidget(form_title)
        card_layout.addWidget(form_sub)
        card_layout.addSpacing(10)

        title_label = QLabel("Kitap Başlığı *")
        title_label.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        self.book_title_input = QLineEdit()
        self.book_title_input.setPlaceholderText("Kitabınızın başlığını girin...")
        self.book_title_input.setFixedHeight(45)

        author_label = QLabel("Yazar Adı (Varsayılan: Profildeki Adınız)")
        author_label.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        self.book_author_input = QLineEdit(self.user_profile["name"])
        self.book_author_input.setFixedHeight(45)

        subject_label = QLabel("Kitap Konusu (İsteğe bağlı)")
        subject_label.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        self.book_subject_input = QTextEdit()
        self.book_subject_input.setPlaceholderText("Kitabın özeti veya ana teması...")
        self.book_subject_input.setFixedHeight(80)

        cover_label = QLabel("Kitap Kapağı (İsteğe bağlı)")
        cover_label.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        
        cover_box = QHBoxLayout()
        self.selected_cover_path = ""
        
        self.cover_path_label = QLabel("Henüz görsel seçilmedi")
        self.cover_path_label.setObjectName("secondary_text")
        
        choose_cover_btn = QPushButton("📷 Kapak Görseli Seç")
        choose_cover_btn.setObjectName("theme_btn")
        choose_cover_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        choose_cover_btn.clicked.connect(self.select_cover_image)

        cover_box.addWidget(choose_cover_btn)
        cover_box.addWidget(self.cover_path_label)
        cover_box.addStretch()

        self.cover_preview_img = QLabel()
        self.cover_preview_img.setFixedSize(90, 120)
        self.cover_preview_img.setStyleSheet("border: 1px dashed #CCC; border-radius: 6px; background: rgba(0,0,0,0.03);")
        self.cover_preview_img.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover_preview_img.setText("Kapak\nÖnizleme")
        self.cover_preview_img.setObjectName("secondary_text")

        cover_preview_wrapper = QHBoxLayout()
        cover_preview_wrapper.addLayout(cover_box)
        cover_preview_wrapper.addStretch()
        cover_preview_wrapper.addWidget(self.cover_preview_img)

        next_btn = QPushButton("İleri → Editöre Geç")
        next_btn.setFixedHeight(50)
        next_btn.setObjectName("primary_btn")
        next_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        next_btn.clicked.connect(self.proceed_to_editor_from_form)

        card_layout.addWidget(title_label)
        card_layout.addWidget(self.book_title_input)
        card_layout.addWidget(author_label)
        card_layout.addWidget(self.book_author_input)
        card_layout.addWidget(subject_label)
        card_layout.addWidget(self.book_subject_input)
        card_layout.addWidget(cover_label)
        card_layout.addLayout(cover_preview_wrapper)
        card_layout.addSpacing(10)
        card_layout.addWidget(next_btn)

        layout.addWidget(form_card, alignment=Qt.AlignmentFlag.AlignCenter)
        layout.addStretch()

        self.set_active_content_page(page)

    def select_cover_image(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Kitap Kapağı Seç", "", "Resim Dosyaları (*.png *.jpg *.jpeg *.bmp)"
        )
        if file_path:
            self.selected_cover_path = file_path
            filename = file_path.split("/")[-1]
            self.cover_path_label.setText(f"✓ {filename}")
            
            pixmap = QPixmap(file_path)
            if not pixmap.isNull():
                scaled = pixmap.scaled(90, 120, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                self.cover_preview_img.setPixmap(scaled)

    def proceed_to_editor_from_form(self):
        title = self.book_title_input.text().strip() or "İsimsiz Kitap"
        author = self.book_author_input.text().strip() or self.user_profile["name"]
        subject = self.book_subject_input.toPlainText().strip()
        cover_path = self.selected_cover_path
        
        existing = next((b for b in self.saved_books if b["title"] == title), None)
        if not existing:
            self.saved_books.append({
                "title": title,
                "author": author,
                "subject": subject,
                "cover": cover_path,
                "content": ""
            })
        else:
            existing["author"] = author
            existing["cover"] = cover_path

        self.open_book_editor(title, subject, cover_path, author, "")

    # ==========================================
    # 7. BOOK EDITOR VIEW
    # ==========================================
    def open_book_editor(self, title, subject="", cover_path="", author=None, initial_content=""):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(20, 20, 20, 20)

        book_author_name = author if author else self.user_profile["name"]

        top_bar = QHBoxLayout()
        back_btn = QPushButton("← Kitaplarıma Dön")
        back_btn.setObjectName("theme_btn")
        back_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        back_btn.clicked.connect(lambda: self.load_folder_view("Kitaplarım"))

        header_title = QLabel(f"📖 {title}")
        header_title.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        header_title.setObjectName("header_text")

        save_book_btn = QPushButton("💾 Kaydet")
        save_book_btn.setObjectName("primary_btn")
        save_book_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        
        top_bar.addWidget(back_btn)
        top_bar.addSpacing(15)
        top_bar.addWidget(header_title)
        top_bar.addStretch()
        top_bar.addWidget(save_book_btn)
        layout.addLayout(top_bar)

        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("QScrollArea, QScrollArea > QWidget > QWidget { border: none; background: transparent; }")

        workspace = QWidget()
        workspace_layout = QVBoxLayout(workspace)
        workspace_layout.setAlignment(Qt.AlignmentFlag.AlignHCenter)
        workspace_layout.setContentsMargins(30, 20, 30, 40)
        workspace_layout.setSpacing(35)

        title_page_frame = QFrame()
        title_page_frame.setFixedSize(580, 760)
        
        title_page_frame.setStyleSheet("""
            QFrame {
                background-color: #FFFDF0;
                border: none;
                border-radius: 0px;
            }
            QLabel {
                color: #2C221E;
            }
        """)

        tp_layout = QVBoxLayout(title_page_frame)
        tp_layout.setContentsMargins(45, 45, 45, 45)
        tp_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        tp_layout.addStretch(1)

        book_name_label = QLabel(title)
        book_font = QFont("Georgia", 28, QFont.Weight.Bold)
        book_name_label.setFont(book_font)
        book_name_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        book_name_label.setWordWrap(True)
        tp_layout.addWidget(book_name_label)

        if subject:
            tp_layout.addSpacing(15)
            subj_label = QLabel(subject)
            subj_label.setFont(QFont("Georgia", 12, QFont.Weight.Normal))
            subj_label.setStyleSheet("color: #665A4E; font-style: italic;")
            subj_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            subj_label.setWordWrap(True)
            tp_layout.addWidget(subj_label)

        tp_layout.addSpacing(25)
        divider = QLabel("❖  ✦  ❖")
        divider.setFont(QFont("Georgia", 16))
        divider.setStyleSheet("color: #B5A686;")
        divider.setAlignment(Qt.AlignmentFlag.AlignCenter)
        tp_layout.addWidget(divider)
        tp_layout.addSpacing(25)

        author_name_label = QLabel(f"Yazar\n{book_author_name}")
        author_font = QFont("Georgia", 15, QFont.Weight.Bold)
        author_name_label.setFont(author_font)
        author_name_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        author_name_label.setStyleSheet("color: #4A3E35;")
        tp_layout.addWidget(author_name_label)

        tp_layout.addStretch(1)

        publisher_label = QLabel("— texination —")
        pub_font = QFont("Old English Text MT", 20, QFont.Weight.Normal)
        pub_font.setStyleHint(QFont.StyleHint.Serif)
        publisher_label.setFont(pub_font)
        publisher_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        publisher_label.setStyleSheet("color: #8C7A6B; letter-spacing: 3px;")
        tp_layout.addWidget(publisher_label, alignment=Qt.AlignmentFlag.AlignCenter)

        workspace_layout.addWidget(title_page_frame, alignment=Qt.AlignmentFlag.AlignCenter)

        page_sep = QLabel("— Sayfa 1: Hikayenizi Yazmaya Başlayın —")
        page_sep.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        page_sep.setObjectName("secondary_text")
        workspace_layout.addWidget(page_sep, alignment=Qt.AlignmentFlag.AlignCenter)

        story_editor = QTextEdit()
        story_editor.setFixedSize(580, 500)
        story_editor.setPlaceholderText("Hikayenizin ilk cümlesini buraya dökün...")
        story_editor.setPlainText(initial_content)
        story_editor.setStyleSheet("""
            QTextEdit {
                background-color: #FFFFFF;
                border: 1px solid rgba(0,0,0,0.12);
                border-radius: 8px;
                padding: 25px;
                font-family: 'Georgia', 'Times New Roman', serif;
                font-size: 15px;
                line-height: 1.6;
            }
        """)
        workspace_layout.addWidget(story_editor, alignment=Qt.AlignmentFlag.AlignCenter)

        def save_story():
            updated_content = story_editor.toPlainText()
            b_item = next((b for b in self.saved_books if b["title"] == title), None)
            if b_item:
                b_item["content"] = updated_content
                b_item["author"] = book_author_name
            else:
                self.saved_books.append({
                    "title": title,
                    "subject": subject,
                    "cover": cover_path,
                    "author": book_author_name,
                    "content": updated_content
                })
            save_book_btn.setText("✓ Kaydedildi")

        save_book_btn.clicked.connect(save_story)

        scroll_area.setWidget(workspace)
        layout.addWidget(scroll_area)

        self.set_active_content_page(page)

    # ==========================================
    # ROUTER AND OTHER MODULE VIEWS
    # ==========================================
    def route_to_creator(self, segment_name):
        print(f"[ROUTER] Navigating to creator canvas for: {segment_name}")
        page = QWidget()
        layout = QVBoxLayout(page)
        
        top_bar = QHBoxLayout()
        back_btn = QPushButton("← Geri")
        back_btn.setObjectName("theme_btn")
        back_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        back_btn.clicked.connect(lambda: self.load_folder_view(segment_name))
        top_bar.addWidget(back_btn)
        top_bar.addStretch()
        layout.addLayout(top_bar)

        if segment_name == "Yazma Egzersizi":
            self.build_prompt_editor(layout)
        elif segment_name == "Mekan Fotoğrafları":
            self.build_location_editor(layout)
        elif segment_name == "Asistan Yazar":
            self.build_chatbot_assistant(layout)
        elif segment_name == "İlham Alıntıları":
            self.build_quotes_editor(layout)

        self.set_active_content_page(page)

    def build_prompt_editor(self, layout):
        prompt_box = QLabel("Rastgele Egzersiz: Bulutları pamuk kelimesini kullanmadan betimle.")
        prompt_box.setObjectName("card_box")
        prompt_box.setWordWrap(True)
        prompt_box.setContentsMargins(15, 15, 15, 15)
        
        editor = QTextEdit()
        editor.setPlaceholderText("Egzersiz çalışma alanı...")
        layout.addWidget(prompt_box)
        layout.addWidget(editor)

    def build_location_editor(self, layout):
        upload_btn = QPushButton("📷 Görsel Ekle")
        upload_btn.setObjectName("primary_btn")
        
        desc = QTextEdit()
        desc.setPlaceholderText("Mekanın kokusu, duyusal detayları...")
        
        layout.addWidget(upload_btn)
        layout.addWidget(desc)

    def build_chatbot_assistant(self, layout):
        chat_history = QListWidget()
        chat_history.setObjectName("chat_history")
        chat_history.addItem("Asistan: Hikayenin iskeletini bana kaba taslak anlat, detaylandıralım.")
        
        input_layout = QHBoxLayout()
        chat_input = QLineEdit()
        chat_input.setPlaceholderText("Örn: İki kardeşin bir otomotiv şirketi kurma hikayesi...")
        
        send_btn = QPushButton("Gönder")
        send_btn.setObjectName("primary_btn")
        
        input_layout.addWidget(chat_input)
        input_layout.addWidget(send_btn)
        
        layout.addWidget(chat_history)
        layout.addLayout(input_layout)

    def build_quotes_editor(self, layout):
        input_layout = QHBoxLayout()
        quote_input = QLineEdit()
        quote_input.setPlaceholderText("Sevdiğin bir alıntıyı gir, AI veritabanını besle...")
        
        add_btn = QPushButton("Ekle")
        add_btn.setObjectName("primary_btn")
        
        input_layout.addWidget(quote_input)
        input_layout.addWidget(add_btn)
        
        quote_board = QTextEdit()
        quote_board.setPlaceholderText("İlham Pınarı... (Alıntılar burada listelenecek)")
        quote_board.setReadOnly(True)
        
        layout.addLayout(input_layout)
        layout.addWidget(quote_board)

    # ==========================================
    # THEME ENGINE
    # ==========================================
    def toggle_sidebar(self):
        self.sidebar.setVisible(not self.sidebar.isVisible())

    def toggle_theme(self):
        self.is_dark_mode = not self.is_dark_mode
        self.apply_theme()

    def apply_theme(self):
        if self.is_dark_mode:
            bg_color = "#18181A"
            card_bg = "#242428"
            text_color = "#F0F0F0"
            sidebar_bg = "#1F1F23"
            pastel_green = "#77DD77"
            hover_bg = "rgba(119, 221, 119, 0.15)"
            input_bg = "#2D2D32"
        else:
            bg_color = "#EAEFEA" # Soft pastel tone
            card_bg = "#FFFFFF"
            text_color = "#2C3E50"
            sidebar_bg = "#F5F8F5"
            pastel_green = "#A8D5BA"
            hover_bg = "rgba(168, 213, 186, 0.3)"
            input_bg = "#FFFFFF"

        stylesheet = f"""
            QMainWindow, QStackedWidget {{ background-color: {bg_color}; }}
            #main_content_wrapper {{ background-color: {bg_color}; }}
            QScrollArea {{ background: transparent; border: none; }}
            QScrollArea > QWidget > QWidget {{ background: transparent; }}
            QLabel {{ color: {text_color}; background: transparent; }}
            #app_title {{ color: {pastel_green}; }}
            #header_text {{ color: {text_color}; background: transparent; }}
            #secondary_text {{ color: #7F8C8D; font-size: 13px; font-weight: normal; background: transparent; }}
            #card_box {{ background-color: {card_bg}; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); }}
            
            #primary_btn {{ background-color: {pastel_green}; color: #1A1A1A; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; padding: 10px 18px; }}
            #primary_btn:hover {{ background-color: #8FC9A3; }}
            
            #oval_primary_btn {{ background-color: {pastel_green}; color: #1A1A1A; border: none; border-radius: 25px; font-weight: bold; font-size: 20px; }}
            #oval_primary_btn:hover {{ background-color: #8FC9A3; }}
            
            #google_btn {{ background-color: {card_bg}; color: {text_color}; border: 1px solid #CCCCCC; border-radius: 8px; font-weight: bold; font-size: 14px; }}
            #google_btn:hover {{ background-color: {input_bg}; }}
            #link_btn {{ background-color: transparent; color: {pastel_green}; font-weight: bold; border: none; text-align: left; }}
            #link_btn:hover {{ text-decoration: underline; }}
            
            QLineEdit, QComboBox {{ background-color: {input_bg}; color: {text_color}; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 10px; font-size: 14px; }}
            QLineEdit:focus, QComboBox:focus {{ border: 1px solid {pastel_green}; }}
            
            #sidebar {{ background-color: {sidebar_bg}; border-right: 1px solid rgba(0,0,0,0.06); }}
            #sidebar_btn {{ background-color: transparent; color: {text_color}; text-align: left; padding: 14px 18px; font-size: 15px; border: none; border-left: 4px solid transparent; border-radius: 6px; }}
            #sidebar_btn:hover {{ background-color: {hover_bg}; border-left: 4px solid {pastel_green}; font-weight: bold; }}
            
            #top_nav {{ background-color: {sidebar_bg}; border-bottom: 1px solid rgba(0,0,0,0.06); }}
            #icon_btn {{ background-color: transparent; color: {text_color}; border: none; font-size: 24px; padding: 5px 15px; }}
            #theme_btn {{ background-color: {input_bg}; color: {text_color}; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: bold; }}
            #theme_btn:hover {{ background-color: {hover_bg}; }}
            
            #create_btn {{ background-color: {card_bg}; color: {pastel_green}; border: 2px dashed {pastel_green}; border-radius: 20px; font-size: 36px; font-weight: 300; }}
            #create_btn:hover {{ background-color: {hover_bg}; border-style: solid; }}
            
            QTextEdit, QListWidget {{ background-color: {input_bg}; color: {text_color}; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 12px; font-size: 14px; line-height: 1.5; }}
            #canvas_view {{ background-color: {card_bg}; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; }}
        """
        self.setStyleSheet(stylesheet)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TextinationApp()
    window.show()
    sys.exit(app.exec())