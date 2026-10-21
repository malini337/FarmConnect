/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    brandName: "FarmConnect",

    language: "Language",
    english: "English",
    tamil: "தமிழ்",

    home: "Home",
    myProducts: "My Products",
    browseProducts: "Browse Products",
    lookingForProduce: "Looking for Produce",
    myCart: "My Cart",
    myOrders: "My Orders",
    myProfile: "My Profile",
    settings: "Settings",
    collapse: "Collapse",
    logout: "Logout",

    farmerDashboard: "Farmer Dashboard",
    addProduct: "Add Product",
    aiVerification: "AI Verification",
    sales: "Sales",
    buyersLooking: "Buyers Looking for Produce",

    consumerDashboard: "Consumer Dashboard",
    browseProductsDescription:
      "Explore fresh crops, vegetables, fruits and farm produce.",
    cartDescription:
      "View your selected farm products before placing an order.",
    ordersDescription:
      "Track your purchases and order history.",
    lookingForProduceDescription:
      "Looking for a particular crop, vegetable or fruit? Post your requirement and connect directly with farmers.",

    retailerDashboard: "Retailer Dashboard",
    wholesalerDashboard: "Wholesaler Dashboard",

    marketplace: "Marketplace",
    searchProducts: "Search Products",
    category: "Category",
    price: "Price",
    quantity: "Quantity",

    welcomeBack: "Welcome Back!",
    emailAddress: "Email Address",
    password: "Password",
    login: "Login",
    register: "Register",
    forgotPassword: "Forgot Password?",
    show: "Show",
    hide: "Hide",

    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    edit: "Edit",
    delete: "Delete",
    back: "Back",
    next: "Next",
    close: "Close",

    profile: "Profile",
    profileImage: "Profile Image",
    uploadImage: "Upload Image",
    chooseAvatar: "Choose Avatar",

    produceName: "Produce Name",
    description: "Description",
    expectedPrice: "Expected Price",
    declaredQuantity: "Declared Quantity",
    qualityGrade: "Quality Grade"
  },

  ta: {
    brandName: "ஃபார்ம்கனெக்ட்",

    language: "மொழி",
    english: "English",
    tamil: "தமிழ்",

    home: "முகப்பு",
    myProducts: "எனது பொருட்கள்",
    browseProducts: "பொருட்களைப் பார்க்க",
    lookingForProduce: "பொருட்கள் தேவை",
    myCart: "எனது கூடை",
    myOrders: "எனது ஆர்டர்கள்",
    myProfile: "எனது சுயவிவரம்",
    settings: "அமைப்புகள்",
    collapse: "சுருக்கு",
    logout: "வெளியேறு",

    farmerDashboard: "விவசாயி முகப்பு",
    addProduct: "பொருளைச் சேர்க்க",
    aiVerification: "AI சரிபார்ப்பு",
    sales: "விற்பனை",
    buyersLooking: "பொருட்களைத் தேடும் வாங்குபவர்கள்",

    consumerDashboard: "நுகர்வோர் முகப்பு",
    browseProductsDescription:
      "புதிய பயிர்கள், காய்கறிகள், பழங்கள் மற்றும் விவசாயப் பொருட்களைப் பார்க்கவும்.",
    cartDescription:
      "ஆர்டர் செய்வதற்கு முன் நீங்கள் தேர்ந்தெடுத்த விவசாயப் பொருட்களைப் பார்க்கவும்.",
    ordersDescription:
      "உங்கள் வாங்குதல்கள் மற்றும் ஆர்டர் வரலாற்றைப் பார்க்கவும்.",
    lookingForProduceDescription:
      "குறிப்பிட்ட பயிர், காய்கறி அல்லது பழம் தேவையா? உங்கள் தேவையைப் பதிவு செய்து விவசாயிகளுடன் நேரடியாக இணையுங்கள்.",

    retailerDashboard: "சில்லறை விற்பனையாளர் முகப்பு",
    wholesalerDashboard: "மொத்த விற்பனையாளர் முகப்பு",

    marketplace: "சந்தை",
    searchProducts: "பொருட்களைத் தேடுங்கள்",
    category: "வகை",
    price: "விலை",
    quantity: "அளவு",

    welcomeBack: "மீண்டும் வரவேற்கிறோம்!",
    emailAddress: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    login: "உள்நுழைய",
    register: "பதிவு செய்ய",
    forgotPassword: "கடவுச்சொல்லை மறந்துவிட்டீர்களா?",
    show: "காண்பி",
    hide: "மறை",

    save: "சேமி",
    cancel: "ரத்து செய்",
    submit: "சமர்ப்பி",
    edit: "திருத்து",
    delete: "நீக்கு",
    back: "பின் செல்ல",
    next: "அடுத்து",
    close: "மூடு",

    profile: "சுயவிவரம்",
    profileImage: "சுயவிவரப் படம்",
    uploadImage: "படத்தைப் பதிவேற்றவும்",
    chooseAvatar: "அவதாரைத் தேர்வு செய்யவும்",

    produceName: "விளைபொருளின் பெயர்",
    description: "விளக்கம்",
    expectedPrice: "எதிர்பார்க்கப்படும் விலை",
    declaredQuantity: "அறிவிக்கப்பட்ட அளவு",
    qualityGrade: "தர நிலை"
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return (
      localStorage.getItem("farmconnect-language") ||
      "en"
    );
  });

  useEffect(() => {
    localStorage.setItem(
      "farmconnect-language",
      language
    );
  }, [language]);

  const changeLanguage = (newLanguage) => {
    if (
      newLanguage === "en" ||
      newLanguage === "ta"
    ) {
      setLanguage(newLanguage);
    }
  };

  const t = (key) => {
    return (
      translations[language]?.[key] ||
      translations.en[key] ||
      key
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;