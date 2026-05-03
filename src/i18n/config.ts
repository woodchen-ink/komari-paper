import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// English-only build for the Liquid Glass theme
const resources = {
  "en-US": {
    translation: en,
    name: "English",
  },
};

const i18n = i18next.use(initReactI18next).init({
  resources,
  lng: "en-US",
  fallbackLng: "en-US",
  interpolation: {
    escapeValue: false, // React handles XSS
  },
});

export default i18n;
export { resources };
