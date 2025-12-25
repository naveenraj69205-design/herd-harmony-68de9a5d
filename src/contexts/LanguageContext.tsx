import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es' | 'fr' | 'sw';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    totalCows: 'Total Cows',
    healthy: 'Healthy',
    inHeat: 'In Heat',
    heatDetections: 'Heat Detections (7d)',
    absentStaff: 'Absent Staff',
    noAbsentStaff: 'All staff present today',
    quickTips: 'Quick Tips',
    gettingStarted: 'Getting Started',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    toggleDarkTheme: 'Toggle dark theme',
    profile: 'Profile',
    editProfile: 'Edit Profile',
    fullName: 'Full Name',
    farmName: 'Farm Name',
    farmLocation: 'Farm Location',
    saveChanges: 'Save Changes',
    language: 'Language',
    selectLanguage: 'Select your preferred language',
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    swahili: 'Swahili',
    monthlyStock: 'Monthly Stock Items',
    addItem: 'Add Item',
    noStockItems: 'No stock items for this month',
    itemAdded: 'Item added',
    itemUpdated: 'Item updated',
    itemDeleted: 'Item deleted',
  },
  es: {
    dashboard: 'Panel',
    settings: 'Configuración',
    totalCows: 'Total de Vacas',
    healthy: 'Saludables',
    inHeat: 'En Celo',
    heatDetections: 'Detecciones de Celo (7d)',
    absentStaff: 'Personal Ausente',
    noAbsentStaff: 'Todo el personal presente hoy',
    quickTips: 'Consejos Rápidos',
    gettingStarted: 'Comenzar',
    appearance: 'Apariencia',
    darkMode: 'Modo Oscuro',
    toggleDarkTheme: 'Alternar tema oscuro',
    profile: 'Perfil',
    editProfile: 'Editar Perfil',
    fullName: 'Nombre Completo',
    farmName: 'Nombre de la Granja',
    farmLocation: 'Ubicación de la Granja',
    saveChanges: 'Guardar Cambios',
    language: 'Idioma',
    selectLanguage: 'Seleccione su idioma preferido',
    english: 'Inglés',
    spanish: 'Español',
    french: 'Francés',
    swahili: 'Suajili',
    monthlyStock: 'Artículos de Stock Mensual',
    addItem: 'Agregar Artículo',
    noStockItems: 'Sin artículos de stock este mes',
    itemAdded: 'Artículo agregado',
    itemUpdated: 'Artículo actualizado',
    itemDeleted: 'Artículo eliminado',
  },
  fr: {
    dashboard: 'Tableau de bord',
    settings: 'Paramètres',
    totalCows: 'Total des Vaches',
    healthy: 'En bonne santé',
    inHeat: 'En chaleur',
    heatDetections: 'Détections de chaleur (7j)',
    absentStaff: 'Personnel Absent',
    noAbsentStaff: 'Tout le personnel présent',
    quickTips: 'Conseils Rapides',
    gettingStarted: 'Commencer',
    appearance: 'Apparence',
    darkMode: 'Mode Sombre',
    toggleDarkTheme: 'Basculer le thème sombre',
    profile: 'Profil',
    editProfile: 'Modifier le Profil',
    fullName: 'Nom Complet',
    farmName: 'Nom de la Ferme',
    farmLocation: 'Emplacement de la Ferme',
    saveChanges: 'Enregistrer',
    language: 'Langue',
    selectLanguage: 'Sélectionnez votre langue préférée',
    english: 'Anglais',
    spanish: 'Espagnol',
    french: 'Français',
    swahili: 'Swahili',
    monthlyStock: 'Articles de Stock Mensuel',
    addItem: 'Ajouter un Article',
    noStockItems: 'Aucun article de stock ce mois',
    itemAdded: 'Article ajouté',
    itemUpdated: 'Article mis à jour',
    itemDeleted: 'Article supprimé',
  },
  sw: {
    dashboard: 'Dashibodi',
    settings: 'Mipangilio',
    totalCows: 'Jumla ya Ng\'ombe',
    healthy: 'Wenye Afya',
    inHeat: 'Katika Joto',
    heatDetections: 'Ugunduzi wa Joto (7d)',
    absentStaff: 'Wafanyakazi Wasiokuwepo',
    noAbsentStaff: 'Wafanyakazi wote wako leo',
    quickTips: 'Vidokezo vya Haraka',
    gettingStarted: 'Kuanza',
    appearance: 'Muonekano',
    darkMode: 'Hali ya Giza',
    toggleDarkTheme: 'Badilisha mandhari ya giza',
    profile: 'Wasifu',
    editProfile: 'Hariri Wasifu',
    fullName: 'Jina Kamili',
    farmName: 'Jina la Shamba',
    farmLocation: 'Mahali pa Shamba',
    saveChanges: 'Hifadhi Mabadiliko',
    language: 'Lugha',
    selectLanguage: 'Chagua lugha unayopendelea',
    english: 'Kiingereza',
    spanish: 'Kihispania',
    french: 'Kifaransa',
    swahili: 'Kiswahili',
    monthlyStock: 'Vitu vya Hifadhi vya Mwezi',
    addItem: 'Ongeza Kitu',
    noStockItems: 'Hakuna vitu vya hifadhi mwezi huu',
    itemAdded: 'Kitu kimeongezwa',
    itemUpdated: 'Kitu kimesasishwa',
    itemDeleted: 'Kitu kimefutwa',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
