import { useEffect } from "react";
import { useSiteConfig } from "./use-site-config";

// Função para converter hex para HSL
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useThemeColor() {
  const { data: siteConfig } = useSiteConfig();

  useEffect(() => {
    if (siteConfig?.primaryColor) {
      const hslColor = hexToHsl(siteConfig.primaryColor);
      
      // Aplicar a cor primária nas variáveis CSS
      document.documentElement.style.setProperty('--primary', hslColor);
      
      // Criar variações da cor para diferentes tons
      const r = parseInt(siteConfig.primaryColor.slice(1, 3), 16);
      const g = parseInt(siteConfig.primaryColor.slice(3, 5), 16);
      const b = parseInt(siteConfig.primaryColor.slice(5, 7), 16);
      
      // Versão mais escura para hover
      const darkerR = Math.max(0, r - 30);
      const darkerG = Math.max(0, g - 30);
      const darkerB = Math.max(0, b - 30);
      const darkerHex = `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
      const darkerHsl = hexToHsl(darkerHex);
      
      document.documentElement.style.setProperty('--primary-foreground', '210 40% 98%');
      document.documentElement.style.setProperty('--primary-hover', darkerHsl);
      
      // Aplicar cores diretamente nos elementos
      const style = document.createElement('style');
      style.textContent = `
        .bg-blue-500 { background-color: ${siteConfig.primaryColor} !important; }
        .bg-blue-600 { background-color: ${darkerHex} !important; }
        .text-blue-500 { color: ${siteConfig.primaryColor} !important; }
        .text-blue-600 { color: ${darkerHex} !important; }
        .text-blue-700 { color: ${darkerHex} !important; }
        .border-blue-200 { border-color: ${siteConfig.primaryColor}33 !important; }
        .border-blue-500 { border-color: ${siteConfig.primaryColor} !important; }
        .hover\\:bg-blue-600:hover { background-color: ${darkerHex} !important; }
        .hover\\:text-blue-500:hover { color: ${siteConfig.primaryColor} !important; }
        .hover\\:text-blue-700:hover { color: ${darkerHex} !important; }
        .bg-blue-50 { background-color: ${siteConfig.primaryColor}0d !important; }
        .bg-blue-100 { background-color: ${siteConfig.primaryColor}1a !important; }
      `;
      
      // Remover estilo anterior se existir
      const existingStyle = document.getElementById('custom-theme-colors');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      style.id = 'custom-theme-colors';
      document.head.appendChild(style);
    }
  }, [siteConfig?.primaryColor]);

  return siteConfig?.primaryColor;
}