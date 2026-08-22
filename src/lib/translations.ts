import type { LanguageCode } from "./preferences";

/**
 * Master translation table. Keys are the exact English strings used across
 * the store (trimmed). Values are arrays of [fr, es, de, it, nl, pt, ar, zh, ja].
 * Missing keys fall back to the original English text — so adding more
 * languages or strings is purely additive.
 */
const ORDER: LanguageCode[] = ["fr", "es", "de", "it", "nl", "pt", "ar", "zh", "ja"];

const DICT: Record<string, string[]> = {
  // Header / promo
  "Buy 3, Get 30% Off on Bodysuits — Shop Now": [
    "Achetez-en 3, obtenez 30 % de réduction sur les bodys — Achetez maintenant",
    "Compra 3 y obtén un 30% de descuento en bodies — Compra ahora",
    "Kaufe 3, erhalte 30 % Rabatt auf Bodys — Jetzt shoppen",
    "Acquista 3, ottieni il 30% di sconto sui body — Acquista ora",
    "Koop er 3, krijg 30% korting op bodysuits — Shop nu",
    "Compre 3, ganhe 30% de desconto em bodysuits — Compre agora",
    "اشترِ 3 واحصل على خصم 30٪ على البودي سوت — تسوّق الآن",
    "购买3件，紧身衣享7折优惠 — 立即选购",
    "3点購入で全ボディスーツ30%オフ — 今すぐ購入",
  ],
  // Nav
  Home: ["Accueil", "Inicio", "Startseite", "Home", "Home", "Início", "الرئيسية", "首页", "ホーム"],
  Bodysuits: ["Bodys", "Bodies", "Bodys", "Body", "Bodysuits", "Bodysuits", "بودي سوت", "紧身衣", "ボディスーツ"],
  Dresses: ["Robes", "Vestidos", "Kleider", "Vestiti", "Jurken", "Vestidos", "فساتين", "连衣裙", "ドレス"],
  Robes: ["Peignoirs", "Batas", "Morgenmäntel", "Vestaglie", "Badjassen", "Roupões", "أرواب", "长袍", "ローブ"],
  Activewear: ["Sportwear", "Ropa deportiva", "Sportbekleidung", "Activewear", "Sportkleding", "Activewear", "ملابس رياضية", "运动服", "アクティブウェア"],
  Clothing: ["Vêtements", "Ropa", "Bekleidung", "Abbigliamento", "Kleding", "Roupas", "ملابس", "服装", "衣類"],
  Bras: ["Soutiens-gorge", "Sujetadores", "BHs", "Reggiseni", "BH's", "Sutiãs", "حمالات صدر", "文胸", "ブラ"],
  "New Arrivals": ["Nouveautés", "Novedades", "Neuheiten", "Novità", "Nieuw Binnen", "Novidades", "وصل حديثاً", "新品上架", "新着商品"],
  "Help Center": ["Centre d'aide", "Centro de ayuda", "Hilfecenter", "Centro Assistenza", "Helpcentrum", "Central de Ajuda", "مركز المساعدة", "帮助中心", "ヘルプセンター"],
  "Shop All": ["Tout voir", "Comprar todo", "Alles ansehen", "Acquista tutto", "Alles shoppen", "Comprar tudo", "تسوّق الكل", "全部商品", "すべて見る"],
  "By Style": ["Par style", "Por estilo", "Nach Stil", "Per stile", "Op stijl", "Por estilo", "حسب النمط", "按风格", "スタイル別"],
  "By Function": ["Par fonction", "Por función", "Nach Funktion", "Per funzione", "Op functie", "Por função", "حسب الوظيفة", "按功能", "機能別"],
  "By Sleeve": ["Par manche", "Por manga", "Nach Ärmel", "Per manica", "Op mouw", "Por manga", "حسب الكم", "按袖型", "袖タイプ別"],
  Mini: ["Mini", "Mini", "Mini", "Mini", "Mini", "Mini", "ميني", "迷你", "ミニ"],
  Midi: ["Midi", "Midi", "Midi", "Midi", "Midi", "Midi", "ميدي", "中长", "ミディ"],
  Maxi: ["Maxi", "Maxi", "Maxi", "Maxi", "Maxi", "Maxi", "ماكسي", "长款", "マキシ"],
  Tops: ["Hauts", "Tops", "Oberteile", "Top", "Tops", "Tops", "بلوزات", "上衣", "トップス"],
  Bottoms: ["Bas", "Pantalones", "Hosen", "Pantaloni", "Broeken", "Calças", "بناطيل", "下装", "ボトムス"],
  Sets: ["Ensembles", "Conjuntos", "Sets", "Set", "Sets", "Conjuntos", "أطقم", "套装", "セット"],
  Accessories: ["Accessoires", "Accesorios", "Accessoires", "Accessori", "Accessoires", "Acessórios", "إكسسوارات", "配饰", "アクセサリー"],
  Bralettes: ["Brassières", "Bralettes", "Bralettes", "Bralette", "Bralettes", "Bralettes", "براليت", "无钢圈文胸", "ブラレット"],
  "Push Up": ["Push-up", "Push Up", "Push-up", "Push Up", "Push Up", "Push Up", "بوش أب", "聚拢型", "プッシュアップ"],
  Strapless: ["Sans bretelles", "Sin tirantes", "Trägerlos", "Senza spalline", "Strapless", "Sem alças", "بدون حمالات", "无肩带", "ストラップレス"],
  "Contact Us": ["Nous contacter", "Contáctenos", "Kontakt", "Contattaci", "Contact", "Fale conosco", "اتصل بنا", "联系我们", "お問い合わせ"],
  "Track Your Order": ["Suivi de commande", "Rastrear tu pedido", "Bestellung verfolgen", "Traccia il tuo ordine", "Bestelling volgen", "Rastrear seu pedido", "تتبع طلبك", "订单跟踪", "注文を追跡"],
  "Shipping & Returns": ["Livraison & retours", "Envíos y devoluciones", "Versand & Rückgabe", "Spedizioni e resi", "Verzending & retouren", "Envio e devoluções", "الشحن والإرجاع", "运输与退货", "配送と返品"],
  "Support Center": ["Centre de support", "Centro de soporte", "Support-Center", "Centro Supporto", "Supportcentrum", "Central de suporte", "مركز الدعم", "支持中心", "サポートセンター"],

  // Right cluster
  English: ["Français", "Español", "Deutsch", "Italiano", "Nederlands", "Português", "العربية", "中文", "日本語"],

  // Hero
  "The Auvella Edit": ["L'Édit Auvella", "La Edición Auvella", "Die Auvella-Auswahl", "L'Edit Auvella", "De Auvella Edit", "A Seleção Auvella", "مختارات أوفيلا", "Auvella精选", "Auvella エディット"],
  "Sculpted Comfort.": ["Confort Sculpté.", "Comodidad Esculpida.", "Skulpturierter Komfort.", "Comfort Scolpito.", "Gevormd Comfort.", "Conforto Esculpido.", "راحة منحوتة.", "雕塑般的舒适。", "彫刻された快適さ。"],
  "Effortless Confidence.": ["Confiance Sans Effort.", "Confianza Sin Esfuerzo.", "Mühelose Sicherheit.", "Sicurezza Senza Sforzo.", "Moeiteloos Zelfvertrouwen.", "Confiança Sem Esforço.", "ثقة بلا جهد.", "毫不费力的自信。", "さりげない自信。"],
  "Premium shapewear, soft lounge essentials and satin sleepwear designed to flatter, smooth and move with you.": [
    "Lingerie sculptante premium, essentiels lounge doux et nuisettes en satin conçus pour vous mettre en valeur.",
    "Fajas premium, esenciales suaves de descanso y ropa de dormir de satén diseñados para realzar y moverse contigo.",
    "Premium-Shapewear, weiche Lounge-Essentials und Satin-Nachtwäsche, die schmeicheln und mit dir mitgehen.",
    "Shapewear premium, essenziali lounge morbidi e pigiameria in raso pensati per valorizzarti e muoversi con te.",
    "Premium shapewear, zachte lounge-essentials en satijnen nachtkleding ontworpen om te flatteren en mee te bewegen.",
    "Modeladores premium, essenciais leves de descanso e pijamas de cetim para valorizar e acompanhar você.",
    "ملابس مشدّة فاخرة وأساسيات منزلية ناعمة وملابس نوم ساتان مصمّمة لتُبرز أناقتك وتتحرك معك.",
    "高级塑形内衣、柔软家居服和缎面睡衣，专为修饰身形并随您而动。",
    "プレミアムシェイプウェア、ソフトなラウンジ、サテン素材のスリープウェア。あなたを美しく引き立て、共に動きます。",
  ],
  "Shop Best Sellers": ["Voir les best-sellers", "Comprar más vendidos", "Bestseller shoppen", "Acquista i best seller", "Shop bestsellers", "Comprar mais vendidos", "تسوّق الأكثر مبيعاً", "购买畅销品", "ベストセラーを見る"],
  "Explore Sleep & Lounge": ["Découvrir Sleep & Lounge", "Explorar Sleep & Lounge", "Sleep & Lounge entdecken", "Esplora Sleep & Lounge", "Ontdek Sleep & Lounge", "Explorar Sleep & Lounge", "اكتشف ملابس النوم", "探索睡衣家居", "スリープ＆ラウンジを探す"],
  "Loved by women for everyday comfort, sculpting support and elevated softness.": [
    "Aimée des femmes pour son confort quotidien, son maintien sculptant et sa douceur raffinée.",
    "Adorada por mujeres por su comodidad diaria, soporte modelador y suavidad elevada.",
    "Von Frauen geliebt für alltäglichen Komfort, formenden Halt und edle Weichheit.",
    "Amato dalle donne per comfort quotidiano, sostegno modellante e morbidezza raffinata.",
    "Geliefd door vrouwen voor dagelijks comfort, modellerende ondersteuning en verfijnde zachtheid.",
    "Amado por mulheres pelo conforto diário, suporte modelador e suavidade elevada.",
    "محبوبة من النساء لراحتها اليومية ودعمها المنحوت ونعومتها الراقية.",
    "深受女性喜爱，提供日常舒适、雕塑支撑和精致柔软感。",
    "毎日の快適さ、引き締めるサポート、上質なやわらかさで女性に愛されています。",
  ],

  // Sections
  "New & Trending": ["Nouveautés & Tendances", "Novedades y Tendencias", "Neu & Im Trend", "Nuovi & Di Tendenza", "Nieuw & Trending", "Novidades & Tendências", "جديد ورائج", "新品与流行", "新着＆トレンド"],
  "Fresh Drops": ["Nouvelles arrivées", "Lanzamientos", "Frische Drops", "Nuovi arrivi", "Nieuwe drops", "Novos lançamentos", "إصدارات جديدة", "新品发布", "新作ドロップ"],
  Trending: ["Tendances", "Tendencias", "Im Trend", "Di tendenza", "Trending", "Tendências", "رائج", "热门", "トレンド"],
  "View all items": ["Voir tous les articles", "Ver todos los artículos", "Alle Artikel ansehen", "Vedi tutti gli articoli", "Alle items bekijken", "Ver todos os itens", "عرض كل المنتجات", "查看全部", "すべて見る"],
  "View all": ["Voir tout", "Ver todo", "Alles ansehen", "Vedi tutto", "Bekijk alles", "Ver tudo", "عرض الكل", "查看全部", "すべて見る"],
  "No products found": ["Aucun produit trouvé", "No se encontraron productos", "Keine Produkte gefunden", "Nessun prodotto trovato", "Geen producten gevonden", "Nenhum produto encontrado", "لم يتم العثور على منتجات", "未找到商品", "商品が見つかりません"],

  // Trust badges
  "Soft Sculpting Fit": ["Coupe sculptante douce", "Ajuste modelador suave", "Sanft formende Passform", "Vestibilità modellante morbida", "Zacht modellerende pasvorm", "Modelagem suave", "قَصّة منحوتة ناعمة", "柔软塑形剪裁", "ソフトな引き締めフィット"],
  "Premium Feel Fabrics": ["Tissus haut de gamme", "Tejidos de alta gama", "Hochwertige Stoffe", "Tessuti premium", "Premium stoffen", "Tecidos premium", "أقمشة فاخرة الملمس", "高级面料", "上質な生地"],
  "Tracked Shipping": ["Livraison suivie", "Envío con seguimiento", "Versand mit Tracking", "Spedizione tracciata", "Verzending met track & trace", "Envio rastreado", "شحن مع تتبّع", "可追踪配送", "追跡配送"],
  "Easy Returns": ["Retours faciles", "Devoluciones fáciles", "Einfache Rückgabe", "Resi facili", "Eenvoudige retouren", "Devoluções fáceis", "إرجاع سهل", "轻松退货", "簡単な返品"],

  // Shop by Color
  "Shop by Color": ["Acheter par couleur", "Comprar por color", "Nach Farbe shoppen", "Acquista per colore", "Shop op kleur", "Comprar por cor", "تسوّق حسب اللون", "按颜色选购", "カラーで選ぶ"],
  "Find Your Shade": ["Trouvez votre teinte", "Encuentra tu tono", "Finde deinen Farbton", "Trova la tua tonalità", "Vind jouw kleur", "Encontre seu tom", "اكتشفي لونك", "找到你的色调", "あなたの色を見つけよう"],
  Black: ["Noir", "Negro", "Schwarz", "Nero", "Zwart", "Preto", "أسود", "黑色", "ブラック"],
  Red: ["Rouge", "Rojo", "Rot", "Rosso", "Rood", "Vermelho", "أحمر", "红色", "レッド"],
  White: ["Blanc", "Blanco", "Weiß", "Bianco", "Wit", "Branco", "أبيض", "白色", "ホワイト"],
  Pink: ["Rose", "Rosa", "Rosa", "Rosa", "Roze", "Rosa", "وردي", "粉色", "ピンク"],
  "Shop Black": ["Acheter en noir", "Comprar negro", "Schwarz shoppen", "Acquista nero", "Shop Zwart", "Comprar Preto", "تسوّق الأسود", "选购黑色", "ブラックを購入"],
  "Shop Red": ["Acheter en rouge", "Comprar rojo", "Rot shoppen", "Acquista rosso", "Shop Rood", "Comprar Vermelho", "تسوّق الأحمر", "选购红色", "レッドを購入"],
  "Shop White": ["Acheter en blanc", "Comprar blanco", "Weiß shoppen", "Acquista bianco", "Shop Wit", "Comprar Branco", "تسوّق الأبيض", "选购白色", "ホワイトを購入"],
  "Shop Pink": ["Acheter en rose", "Comprar rosa", "Rosa shoppen", "Acquista rosa", "Shop Roze", "Comprar Rosa", "تسوّق الوردي", "选购粉色", "ピンクを購入"],
  "Head to toe chic or paired with bold tones — sleek Black always makes a statement.": [
    "Total look chic ou associé à des tons audacieux — le noir élégant fait toujours sensation.",
    "De pies a cabeza chic o combinado con tonos atrevidos — el negro siempre marca la diferencia.",
    "Von Kopf bis Fuß schick oder mit kräftigen Tönen kombiniert — elegantes Schwarz fällt immer auf.",
    "Total look chic o abbinato a toni decisi — il nero elegante fa sempre la differenza.",
    "Top tot teen chic of met gedurfde tinten — strak zwart valt altijd op.",
    "Look chique dos pés à cabeça ou combinado com tons ousados — o preto sempre se destaca.",
    "أناقة من الرأس إلى القدم أو مع ألوان جريئة — الأسود الأنيق دائماً بصمة مميزة.",
    "从头到脚的时尚或搭配大胆色调 — 干练黑色总能成为焦点。",
    "頭からつま先までシックに、または大胆な色と。洗練されたブラックは常に存在感を放ちます。",
  ],
  "Bright, bold, and full of energy — Red is your go-to for standing out with confidence.": [
    "Lumineux, audacieux et plein d'énergie — le rouge pour briller avec assurance.",
    "Brillante, audaz y lleno de energía — el rojo es tu opción para destacar con confianza.",
    "Strahlend, kraftvoll und voller Energie — Rot ist deine Wahl, um selbstbewusst aufzufallen.",
    "Brillante, audace e pieno di energia — il rosso per distinguersi con sicurezza.",
    "Helder, gedurfd en vol energie — rood is jouw keuze om zelfverzekerd op te vallen.",
    "Brilhante, ousado e cheio de energia — o vermelho para se destacar com confiança.",
    "مشرق وجريء ومليء بالطاقة — الأحمر خيارك للتألق بثقة.",
    "明亮、大胆、充满活力 — 红色是自信出众的首选。",
    "明るく大胆でエネルギッシュ。レッドは自信を持って目立つための一色です。",
  ],
  "Fresh, crisp, and effortlessly versatile — White is your clean-slate essential.": [
    "Frais, net et polyvalent — le blanc est l'essentiel d'une garde-robe épurée.",
    "Fresco, nítido y versátil — el blanco es tu esencial impecable.",
    "Frisch, klar und vielseitig — Weiß ist dein zeitloses Essential.",
    "Fresco, pulito e versatile — il bianco è l'essenziale immacolato.",
    "Fris, helder en veelzijdig — wit is jouw schone basis.",
    "Fresco, limpo e versátil — o branco é seu essencial impecável.",
    "نقي ومنعش ومتعدد الاستخدامات — الأبيض هو الأساس الراقي.",
    "清新、利落、百搭 — 白色是您的必备净色单品。",
    "清潔感があり、すっきりと万能。ホワイトはあなたの定番アイテム。",
  ],
  "Playful, feminine, and fresh — Pink adds a soft pop that shapes every look.": [
    "Ludique, féminin et frais — le rose ajoute une touche douce à chaque look.",
    "Divertido, femenino y fresco — el rosa añade un toque suave que realza cada look.",
    "Verspielt, feminin und frisch — Rosa setzt einen sanften Akzent in jedem Look.",
    "Giocoso, femminile e fresco — il rosa aggiunge un tocco delicato a ogni look.",
    "Speels, vrouwelijk en fris — roze geeft elke look een zachte accent.",
    "Divertido, feminino e fresco — o rosa adiciona um toque suave a cada look.",
    "مرح وأنثوي ومنعش — الوردي يضيف لمسة ناعمة لكل إطلالة.",
    "俏皮、女性化、清新 — 粉色为每个造型增添柔和亮点。",
    "遊び心がありフェミニンで爽やか。ピンクはどんな装いにも柔らかなアクセントを。",
  ],

  // Our Story
  "Our Story": ["Notre Histoire", "Nuestra Historia", "Unsere Geschichte", "La Nostra Storia", "Ons Verhaal", "Nossa História", "قصتنا", "我们的故事", "私たちのストーリー"],
  "Not just shapewear.": ["Plus que de la lingerie sculptante.", "Más que fajas.", "Mehr als nur Shapewear.", "Più che semplice shapewear.", "Meer dan shapewear.", "Mais do que modeladores.", "أكثر من مجرد ملابس مشدّة.", "不只是塑形衣。", "シェイプウェアだけじゃない。"],

  // Journal / Edit
  Journal: ["Journal", "Diario", "Magazin", "Diario", "Magazine", "Diário", "مجلة", "日志", "ジャーナル"],
  "Styling notes, comfort rituals and everyday essentials.": [
    "Notes de style, rituels de confort et essentiels du quotidien.",
    "Notas de estilo, rituales de confort y básicos diarios.",
    "Styling-Notizen, Komfort-Rituale und Alltagsessentials.",
    "Note di stile, rituali di comfort ed essenziali quotidiani.",
    "Stijltips, comfortrituelen en dagelijkse essentials.",
    "Dicas de estilo, rituais de conforto e essenciais do dia a dia.",
    "ملاحظات تنسيق، طقوس راحة، وأساسيات يومية.",
    "穿搭笔记、舒适仪式与日常必备。",
    "スタイリングノート、心地よさのルーティン、毎日のエッセンシャル。",
  ],
  "Read More": ["Lire la suite", "Leer más", "Mehr lesen", "Leggi di più", "Lees meer", "Leia mais", "اقرأ المزيد", "阅读更多", "続きを読む"],

  // Shop the Look
  "Shop the Look": ["Acheter le look", "Comprar el look", "Den Look shoppen", "Acquista il look", "Shop de look", "Comprar o look", "تسوّقي الإطلالة", "购买整套造型", "ルックを購入"],
  "Tap to explore the pieces you love.": [
    "Touchez pour explorer les pièces que vous aimez.",
    "Toca para explorar las prendas que amas.",
    "Tippe, um deine Lieblingsteile zu entdecken.",
    "Tocca per esplorare i capi che ami.",
    "Tik om de stukken te ontdekken die jij leuk vindt.",
    "Toque para explorar as peças que você ama.",
    "اضغطي لاستكشاف القطع التي تحبينها.",
    "点击探索您喜爱的单品。",
    "タップしてお気に入りのアイテムを探そう。"
  ],
  Shapewear: ["Shapewear", "Fajas", "Shapewear", "Shapewear", "Shapewear", "Modeladores", "ملابس مشدّة", "塑形衣", "シェイプウェア"],
  Sleepwear: ["Vêtements de nuit", "Ropa de dormir", "Nachtwäsche", "Pigiameria", "Nachtkleding", "Pijamas", "ملابس نوم", "睡衣", "ナイトウェア"],
  "Soft Essentials": ["Essentiels doux", "Esenciales suaves", "Soft Essentials", "Essenziali morbidi", "Zachte essentials", "Essenciais suaves", "أساسيات ناعمة", "柔软必备", "ソフトエッセンシャル"],
  Leggings: ["Leggings", "Leggings", "Leggings", "Leggings", "Leggings", "Leggings", "ليجنز", "打底裤", "レギンス"],
  "Sculpted comfort": ["Confort sculpté", "Comodidad esculpida", "Skulpturierter Komfort", "Comfort scolpito", "Gevormd comfort", "Conforto esculpido", "راحة منحوتة", "雕塑般的舒适", "彫刻された快適さ"],
  "Soft nights, slow mornings": ["Nuits douces, matins lents", "Noches suaves, mañanas lentas", "Sanfte Nächte, langsame Morgen", "Notti morbide, mattine lente", "Zachte nachten, langzame ochtenden", "Noites suaves, manhãs lentas", "ليالٍ هادئة وصباحات بطيئة", "柔和的夜晚，悠然的清晨", "やわらかな夜、ゆったりとした朝"],
  "Support made soft": ["Maintien tout en douceur", "Soporte hecho suave", "Halt mit Sanftheit", "Sostegno reso morbido", "Ondersteuning, zacht gemaakt", "Suporte feito suave", "دعم بلمسة ناعمة", "柔软的支撑", "やさしいサポート"],
  "Comfort that moves": ["Le confort qui bouge", "Comodidad que se mueve", "Komfort, der mitgeht", "Comfort che si muove", "Comfort dat meebeweegt", "Conforto que acompanha", "راحة تتحرك معك", "随你而动的舒适", "動きに寄り添う快適さ"],

  // Benefits marquee
  "Easy, Tracked 30 Day Returns": ["Retours faciles et suivis sous 30 jours", "Devoluciones fáciles y rastreadas en 30 días", "Einfache, getrackte 30-Tage-Rückgabe", "Resi facili e tracciati entro 30 giorni", "Eenvoudige retour binnen 30 dagen met tracking", "Devoluções fáceis e rastreadas em 30 dias", "إرجاع سهل ومتتبَّع خلال 30 يوماً", "30天轻松追踪退货", "簡単・追跡可能な30日間返品"],
  "Free Shipping On Orders £75+": ["Livraison offerte dès 75 £", "Envío gratis en pedidos superiores a £75", "Kostenloser Versand ab £75", "Spedizione gratuita per ordini oltre 75 £", "Gratis verzending vanaf £75", "Frete grátis em pedidos acima de £75", "شحن مجاني للطلبات فوق 75£", "订单满£75免运费", "£75以上のご注文で送料無料"],
  "Receive Your Order In 3–5 Business Days": ["Recevez votre commande en 3 à 5 jours ouvrés", "Recibe tu pedido en 3–5 días hábiles", "Erhalte deine Bestellung in 3–5 Werktagen", "Ricevi il tuo ordine in 3–5 giorni lavorativi", "Ontvang je bestelling binnen 3–5 werkdagen", "Receba seu pedido em 3–5 dias úteis", "استلم طلبك خلال 3–5 أيام عمل", "3–5个工作日内收到您的订单", "3〜5営業日でお届け"],
  "Premium Sculpting Comfort": ["Confort sculptant premium", "Comodidad modeladora premium", "Premium-Shaping-Komfort", "Comfort modellante premium", "Premium modellerend comfort", "Conforto modelador premium", "راحة منحوتة فاخرة", "高级塑形舒适", "プレミアムな引き締めコンフォート"],

  // Cart drawer
  "Your Bag": ["Votre panier", "Tu bolsa", "Dein Warenkorb", "La tua borsa", "Je tas", "A sua sacola", "حقيبتك", "您的购物袋", "カート"],
  "Your bag is empty": ["Votre panier est vide", "Tu bolsa está vacía", "Dein Warenkorb ist leer", "La tua borsa è vuota", "Je tas is leeg", "A sua sacola está vazia", "حقيبتك فارغة", "您的购物袋是空的", "カートは空です"],
  Subtotal: ["Sous-total", "Subtotal", "Zwischensumme", "Subtotale", "Subtotaal", "Subtotal", "المجموع الفرعي", "小计", "小計"],
  Checkout: ["Paiement", "Pagar", "Zur Kasse", "Pagamento", "Afrekenen", "Finalizar compra", "إتمام الشراء", "结账", "ご購入手続きへ"],

  // Product page
  "Add to Cart": ["Ajouter au panier", "Añadir al carrito", "In den Warenkorb", "Aggiungi al carrello", "In winkelmand", "Adicionar ao carrinho", "أضف إلى السلة", "加入购物袋", "カートに追加"],
  "Sold Out": ["Épuisé", "Agotado", "Ausverkauft", "Esaurito", "Uitverkocht", "Esgotado", "نفد المخزون", "已售罄", "売り切れ"],
  "Adding…": ["Ajout…", "Añadiendo…", "Wird hinzugefügt…", "Aggiunta…", "Toevoegen…", "Adicionando…", "جارٍ الإضافة…", "添加中…", "追加中…"],
  "Size chart": ["Guide des tailles", "Guía de tallas", "Größentabelle", "Guida alle taglie", "Maattabel", "Guia de tamanhos", "جدول المقاسات", "尺码表", "サイズ表"],
  "Size Chart": ["Guide des tailles", "Guía de tallas", "Größentabelle", "Guida alle taglie", "Maattabel", "Guia de tamanhos", "جدول المقاسات", "尺码表", "サイズ表"],
  "Most Popular": ["Le plus populaire", "Más popular", "Beliebteste", "Più popolare", "Populairste", "Mais popular", "الأكثر شيوعًا", "最受欢迎", "一番人気"],
  "1 Unit": ["1 unité", "1 unidad", "1 Stück", "1 unità", "1 stuk", "1 unidade", "وحدة واحدة", "1件", "1個"],
  "2-Pack": ["Lot de 2", "Pack de 2", "2er-Pack", "Confezione da 2", "2-pack", "Pacote de 2", "عبوة 2", "2件装", "2個セット"],
  "Choose your savings": ["Choisissez vos économies", "Elige tu ahorro", "Wähle deine Ersparnis", "Scegli il tuo risparmio", "Kies je voordeel", "Escolha sua economia", "اختاري توفيرك", "选择您的优惠", "お得なセットを選ぶ"],
  "Choose your savings:": ["Choisissez vos économies :", "Elige tu ahorro:", "Wähle deine Ersparnis:", "Scegli il tuo risparmio:", "Kies je voordeel:", "Escolha sua economia:", "اختاري توفيرك:", "选择您的优惠：", "お得なセットを選ぶ："],
  "In Stock — Ready to Ship": ["En stock — Prêt à expédier", "En stock — Listo para enviar", "Auf Lager — Versandbereit", "Disponibile — Pronto per la spedizione", "Op voorraad — Klaar om te verzenden", "Em estoque — Pronto para enviar", "متوفر — جاهز للشحن", "现货 — 立即发货", "在庫あり — すぐ発送"],
  "Easy Exchange & Return": ["Échange et retour faciles", "Cambio y devolución fáciles", "Einfacher Umtausch & Rückgabe", "Cambio e reso facili", "Eenvoudig ruilen & retourneren", "Troca e devolução fáceis", "تبديل وإرجاع سهل", "轻松换货与退货", "簡単な交換・返品"],
  "Hassle-free process": ["Processus sans tracas", "Proceso sin complicaciones", "Unkomplizierter Ablauf", "Procedura senza complicazioni", "Probleemloos proces", "Processo sem complicações", "إجراء سهل بلا متاعب", "省心流程", "手間なしのプロセス"],
  Colour: ["Couleur", "Color", "Farbe", "Colore", "Kleur", "Cor", "اللون", "颜色", "カラー"],
  Save: ["Économisez", "Ahorra", "Spare", "Risparmi", "Bespaar", "Economize", "وفّر", "节省", "セーブ"],
  "/each": ["/pièce", "/cada uno", "/Stück", "/cad.", "/per stuk", "/cada", "/للوحدة", "/件", "/個"],
  Color: ["Couleur", "Color", "Farbe", "Colore", "Kleur", "Cor", "اللون", "颜色", "カラー"],
  Size: ["Taille", "Talla", "Größe", "Taglia", "Maat", "Tamanho", "المقاس", "尺码", "サイズ"],
  "30-Day Money Back": ["Remboursement 30 jours", "Devolución de 30 días", "30-Tage-Geld-zurück", "Rimborso 30 giorni", "30 dagen geld terug", "Reembolso em 30 dias", "استرداد خلال 30 يوماً", "30天退款保证", "30日間返金保証"],
  "Free Returns": ["Retours gratuits", "Devoluciones gratis", "Kostenlose Rückgabe", "Resi gratuiti", "Gratis retour", "Devoluções grátis", "إرجاع مجاني", "免费退货", "返品送料無料"],
  "Free Shipping": ["Livraison offerte", "Envío gratis", "Kostenloser Versand", "Spedizione gratuita", "Gratis verzending", "Frete grátis", "شحن مجاني", "免费配送", "送料無料"],
  Shipping: ["Livraison", "Envío", "Versand", "Spedizione", "Verzending", "Envio", "الشحن", "配送", "配送"],
  "Care Guide": ["Guide d'entretien", "Guía de cuidado", "Pflegehinweise", "Guida alla cura", "Verzorgingsadvies", "Guia de cuidados", "دليل العناية", "保养指南", "ケアガイド"],
  "Size & Fit": ["Taille & coupe", "Talla y ajuste", "Größe & Passform", "Taglia e vestibilità", "Maat & pasvorm", "Tamanho e caimento", "المقاس والتفصيل", "尺码与版型", "サイズ＆フィット"],
  Returns: ["Retours", "Devoluciones", "Rückgabe", "Resi", "Retouren", "Devoluções", "الإرجاع", "退货", "返品"],
  "Why You'll Love It": ["Pourquoi vous allez l'adorer", "Por qué te encantará", "Warum du es lieben wirst", "Perché lo adorerai", "Waarom je het geweldig vindt", "Por que você vai amar", "لماذا ستحبينه", "为什么你会爱上它", "気に入る理由"],
  "Back to shop": ["Retour à la boutique", "Volver a la tienda", "Zurück zum Shop", "Torna al negozio", "Terug naar de winkel", "Voltar à loja", "العودة إلى المتجر", "返回商店", "ショップに戻る"],
  "Product not found": ["Produit introuvable", "Producto no encontrado", "Produkt nicht gefunden", "Prodotto non trovato", "Product niet gevonden", "Produto não encontrado", "المنتج غير موجود", "未找到该商品", "商品が見つかりません"],

  // Footer
  "Join the Auvella List": ["Rejoignez la liste Auvella", "Únete a la lista Auvella", "Werde Teil der Auvella-Liste", "Iscriviti alla lista Auvella", "Doe mee met de Auvella-lijst", "Junte-se à lista Auvella", "انضمي إلى قائمة أوفيلا", "加入Auvella邮件列表", "Auvellaリストに登録"],
  "Get early access to new drops, private offers and comfortwear essentials designed for everyday confidence.": [
    "Accédez en avant-première aux nouveautés, offres privées et essentiels confort pensés pour votre confiance au quotidien.",
    "Accede antes que nadie a nuevos lanzamientos, ofertas privadas y básicos de comodidad para tu confianza diaria.",
    "Erhalte frühen Zugang zu Neuheiten, privaten Angeboten und Komfort-Essentials für tägliches Selbstbewusstsein.",
    "Accedi in anteprima a nuove uscite, offerte private ed essenziali comfort per la tua sicurezza quotidiana.",
    "Krijg vroege toegang tot nieuwe drops, privé-aanbiedingen en comfort-essentials voor dagelijks zelfvertrouwen.",
    "Tenha acesso antecipado a lançamentos, ofertas privadas e essenciais de conforto para sua confiança diária.",
    "احصلي على وصول مبكر للإطلاقات الجديدة والعروض الخاصة وأساسيات الراحة لثقة يومية.",
    "抢先获取新品、专属优惠和日常自信所需的舒适必备品。",
    "新作の先行案内や限定オファー、毎日の自信を支える快適な定番アイテムを最速でお届け。",
  ],
  "Email address": ["Adresse e-mail", "Correo electrónico", "E-Mail-Adresse", "Indirizzo email", "E-mailadres", "Endereço de e-mail", "البريد الإلكتروني", "电子邮箱", "メールアドレス"],
  "By subscribing you agree to receive recurring marketing messages from Auvella.": [
    "En vous abonnant, vous acceptez de recevoir des messages marketing récurrents d'Auvella.",
    "Al suscribirte aceptas recibir mensajes de marketing recurrentes de Auvella.",
    "Mit der Anmeldung erklärst du dich einverstanden, regelmäßige Marketingnachrichten von Auvella zu erhalten.",
    "Iscrivendoti accetti di ricevere messaggi di marketing ricorrenti da Auvella.",
    "Door je in te schrijven ga je akkoord met terugkerende marketingberichten van Auvella.",
    "Ao se inscrever, você concorda em receber mensagens de marketing recorrentes da Auvella.",
    "بالاشتراك أنتِ توافقين على تلقي رسائل تسويقية متكررة من أوفيلا.",
    "订阅即表示您同意接收Auvella定期发送的营销信息。",
    "ご登録いただくと、Auvellaからの定期的なマーケティングメッセージの受信に同意したことになります。",
  ],
  "Important Links": ["Liens utiles", "Enlaces importantes", "Wichtige Links", "Link importanti", "Belangrijke links", "Links importantes", "روابط مهمة", "重要链接", "重要なリンク"],
  Categories: ["Catégories", "Categorías", "Kategorien", "Categorie", "Categorieën", "Categorias", "الفئات", "分类", "カテゴリー"],
  Company: ["Société", "Empresa", "Unternehmen", "Azienda", "Bedrijf", "Empresa", "الشركة", "公司", "会社"],
  "Follow Us": ["Suivez-nous", "Síguenos", "Folge uns", "Seguici", "Volg ons", "Siga-nos", "تابعينا", "关注我们", "フォローする"],
  Instagram: ["Instagram", "Instagram", "Instagram", "Instagram", "Instagram", "Instagram", "إنستجرام", "Instagram", "Instagram"],
  TikTok: ["TikTok", "TikTok", "TikTok", "TikTok", "TikTok", "TikTok", "تيك توك", "TikTok", "TikTok"],
  Pinterest: ["Pinterest", "Pinterest", "Pinterest", "Pinterest", "Pinterest", "Pinterest", "بينترست", "Pinterest", "Pinterest"],
  Reviews: ["Avis", "Reseñas", "Bewertungen", "Recensioni", "Beoordelingen", "Avaliações", "التقييمات", "评价", "レビュー"],
  "Help Centre": ["Centre d'aide", "Centro de ayuda", "Hilfecenter", "Centro Assistenza", "Helpcentrum", "Central de Ajuda", "مركز المساعدة", "帮助中心", "ヘルプセンター"],
  FAQ: ["FAQ", "Preguntas frecuentes", "FAQ", "FAQ", "FAQ", "FAQ", "الأسئلة الشائعة", "常见问题", "よくある質問"],
  "Discount Codes": ["Codes promo", "Códigos de descuento", "Rabattcodes", "Codici sconto", "Kortingscodes", "Códigos de desconto", "أكواد الخصم", "折扣码", "割引コード"],
  "Loungewear & Sleepwear": ["Loungewear & nuit", "Loungewear y ropa de dormir", "Loungewear & Nachtwäsche", "Loungewear e pigiameria", "Loungewear & nachtkleding", "Loungewear & pijamas", "ملابس منزلية ونوم", "家居服与睡衣", "ラウンジ＆ナイトウェア"],
  "Sleep Accessories": ["Accessoires nuit", "Accesorios de dormir", "Schlaf-Accessoires", "Accessori per il sonno", "Slaapaccessoires", "Acessórios de dormir", "إكسسوارات النوم", "睡眠配件", "スリープ用品"],
  "About Us": ["À propos", "Sobre nosotros", "Über uns", "Chi siamo", "Over ons", "Sobre nós", "من نحن", "关于我们", "私たちについて"],
  "Shipping Policy": ["Politique de livraison", "Política de envío", "Versandbedingungen", "Politica di spedizione", "Verzendbeleid", "Política de envio", "سياسة الشحن", "运输政策", "配送ポリシー"],
  "Refund Policy": ["Politique de remboursement", "Política de reembolso", "Rückerstattungsrichtlinie", "Politica di rimborso", "Restitutiebeleid", "Política de reembolso", "سياسة الاسترداد", "退款政策", "返金ポリシー"],
  "Privacy Policy": ["Politique de confidentialité", "Política de privacidad", "Datenschutzrichtlinie", "Privacy Policy", "Privacybeleid", "Política de privacidade", "سياسة الخصوصية", "隐私政策", "プライバシーポリシー"],
  "Terms of Service": ["Conditions d'utilisation", "Términos del servicio", "Nutzungsbedingungen", "Termini di servizio", "Algemene voorwaarden", "Termos de serviço", "شروط الخدمة", "服务条款", "利用規約"],
  Excellent: ["Excellent", "Excelente", "Hervorragend", "Eccellente", "Uitstekend", "Excelente", "ممتاز", "卓越", "優れた"],
  "Rated by Auvella customers": ["Évalué par les clientes Auvella", "Calificado por clientes de Auvella", "Bewertet von Auvella-Kundinnen", "Valutato dalle clienti Auvella", "Beoordeeld door Auvella-klanten", "Avaliado pelos clientes Auvella", "تقييم من عميلات أوفيلا", "由Auvella顾客评分", "Auvellaのお客様による評価"],
  Privacy: ["Confidentialité", "Privacidad", "Datenschutz", "Privacy", "Privacy", "Privacidade", "الخصوصية", "隐私", "プライバシー"],
  Terms: ["Conditions", "Términos", "Bedingungen", "Termini", "Voorwaarden", "Termos", "الشروط", "条款", "利用規約"],
  Accessibility: ["Accessibilité", "Accesibilidad", "Barrierefreiheit", "Accessibilità", "Toegankelijkheid", "Acessibilidade", "إمكانية الوصول", "无障碍", "アクセシビリティ"],

  // Featured article titles
  "How to style sculptwear for everyday confidence": [
    "Comment porter la lingerie sculptante au quotidien",
    "Cómo combinar la fajas para la confianza diaria",
    "So stylst du Shapewear für tägliches Selbstbewusstsein",
    "Come abbinare lo shapewear per la fiducia di ogni giorno",
    "Hoe je shapewear stijlt voor dagelijks zelfvertrouwen",
    "Como usar shapewear para a confiança do dia a dia",
    "كيف تنسّقين ملابس الشد لثقة يومية",
    "如何搭配塑形衣，展现日常自信",
    "毎日の自信のためのシェイプウェアコーデ術",
  ],
  "From fitted basics to layered looks, discover how Auvella pieces move with your wardrobe.": [
    "Des basiques ajustés aux superpositions, découvrez comment les pièces Auvella évoluent avec votre garde-robe.",
    "Desde básicos ajustados hasta looks por capas, descubre cómo las prendas Auvella se mueven con tu armario.",
    "Von figurbetonten Basics bis Layering — entdecke, wie Auvella-Teile mit deiner Garderobe mitgehen.",
    "Dai basici aderenti ai look a strati, scopri come i capi Auvella si muovono con il tuo guardaroba.",
    "Van getailleerde basics tot gelaagde looks — ontdek hoe Auvella-stukken meebewegen met je garderobe.",
    "De básicos ajustados a looks em camadas, descubra como as peças Auvella acompanham seu guarda-roupa.",
    "من القطع الأساسية المحدّدة إلى التنسيقات الطبقية، اكتشفي كيف تتحرك قطع أوفيلا مع خزانتك.",
    "从合身基本款到叠穿造型，发现Auvella如何与您的衣橱契合。",
    "フィット感のある定番からレイヤードまで、Auvellaのピースがワードローブにどう寄り添うかをご紹介。",
  ],
  "Create a calm routine with satin sleepwear, robes and comfort-focused essentials.": [
    "Créez une routine sereine avec des nuisettes en satin, des peignoirs et des essentiels confort.",
    "Crea una rutina tranquila con ropa de dormir de satén, batas y básicos de comodidad.",
    "Gestalte eine ruhige Routine mit Satin-Nachtwäsche, Bademänteln und Komfort-Essentials.",
    "Crea una routine serena con pigiameria in raso, vestaglie ed essenziali confort.",
    "Creëer een rustige routine met satijnen nachtkleding, badjassen en comfort-essentials.",
    "Crie uma rotina calma com pijamas de cetim, robes e essenciais focados em conforto.",
    "اصنعي روتيناً هادئاً مع ملابس نوم ساتان وأرواب وأساسيات راحة.",
    "用缎面睡衣、长袍和舒适必备品打造宁静日常。",
    "サテンのナイトウェア、ローブ、心地よさを追求した定番で穏やかな時間を。",
  ],

  // Misc UI
  Previous: ["Précédent", "Anterior", "Zurück", "Precedente", "Vorige", "Anterior", "السابق", "上一个", "前へ"],
  Next: ["Suivant", "Siguiente", "Weiter", "Successivo", "Volgende", "Próximo", "التالي", "下一个", "次へ"],
  Search: ["Rechercher", "Buscar", "Suche", "Cerca", "Zoeken", "Pesquisar", "بحث", "搜索", "検索"],
  Account: ["Compte", "Cuenta", "Konto", "Account", "Account", "Conta", "الحساب", "账户", "アカウント"],
  Cart: ["Panier", "Carrito", "Warenkorb", "Carrello", "Winkelmand", "Carrinho", "السلة", "购物袋", "カート"],
  Menu: ["Menu", "Menú", "Menü", "Menu", "Menu", "Menu", "القائمة", "菜单", "メニュー"],
  Remove: ["Retirer", "Eliminar", "Entfernen", "Rimuovi", "Verwijderen", "Remover", "إزالة", "移除", "削除"],
};

const SOURCE_BY_TRANSLATION = new Map<string, string>();

// Pass 1: register every English key as itself so an English label is never
// rewritten to another English key just because it happens to be a translation
// of that key in another language (e.g. "Robes" is French for "Dresses" but is
// also its own English category on this site).
for (const english of Object.keys(DICT)) {
  SOURCE_BY_TRANSLATION.set(english.trim(), english.trim());
}

// Pass 2: register translations, without overwriting English keys.
for (const [english, translations] of Object.entries(DICT)) {
  translations.forEach((translation) => {
    const key = translation.trim();
    if (!SOURCE_BY_TRANSLATION.has(key)) {
      SOURCE_BY_TRANSLATION.set(key, english.trim());
    }
  });
}


export function getEnglishSource(text: string): string | null {
  return SOURCE_BY_TRANSLATION.get(text.trim()) ?? null;
}

export function translate(text: string, lang: LanguageCode): string {
  if (lang === "en") return text;
  const idx = ORDER.indexOf(lang);
  if (idx < 0) return text;
  const entry = DICT[text.trim()];
  if (!entry) return text;
  return entry[idx] ?? text;
}

export function hasTranslation(text: string): boolean {
  return Object.prototype.hasOwnProperty.call(DICT, text.trim());
}
