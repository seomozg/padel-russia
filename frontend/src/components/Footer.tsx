import { Link } from "react-router-dom";
import { MapPin, Instagram, Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-display text-sm font-bold">P</span>
              </div>
              <span className="font-display font-bold text-lg">
                Papa<span className="text-primary">Padel</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Крупнейший каталог падел-кортов России. Найди корт рядом и начни играть сегодня.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary-muted transition-all">
                <Instagram size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary-muted transition-all">
                <Send size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Каталог</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Москва", "Санкт-Петербург", "Казань", "Сочи", "Екатеринбург"].map((city) => (
                <li key={city}>
                  <Link to={`/courts?city=${city}`} className="hover:text-primary transition-colors flex items-center gap-1">
                    <MapPin size={12} />
                    {city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">О паделе</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Что такое падел", "Правила игры", "Выбор ракетки", "Школы и секции", "Турниры"].map((item) => (
                <li key={item}>
                  <Link to="/news" className="hover:text-primary transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Сервис</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Добавить корт", "Реклама", "Контакты", "Политика конфиденциальности"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 PadelRussia. Все права защищены.</p>
          <p className="text-xs text-muted-foreground">Сделано с ❤️ для любителей падела</p>
        </div>
      </div>
    </footer>
  );
}
