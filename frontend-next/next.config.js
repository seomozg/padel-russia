/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone-вывод для Docker (минимальный образ)
  output: 'standalone',

  // Оптимизация изображений
  images: {
    // Разрешаем unoptimized для изображений, которые отдаются с нашего же домена
    unoptimized: true,
  },

  // Отключаем x-powered-by заголовок
  poweredByHeader: false,
};

export default nextConfig;
