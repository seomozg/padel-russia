"use client";

import Navbar from "./Navbar";
import { useTheme } from "./ThemeProvider";

/**
 * Обёртка для Navbar, получающая тему из ThemeContext.
 * Root layout — серверный компонент, не может использовать useTheme напрямую.
 */
export default function NavbarWrapper() {
  const { theme, toggleTheme } = useTheme();
  return <Navbar theme={theme} onToggleTheme={toggleTheme} />;
}
