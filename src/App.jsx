import React, { useState, useEffect, useRef } from 'react';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import MobileDrawer from './components/MobileDrawer';
import Hero from './components/Hero';
import BrandStrip from './components/BrandStrip';
import About from './components/About';
import Categories from './components/Categories';
import ChocolatesSection from './components/ChocolatesSection';
import CakesAndBakesSection from './components/CakesAndBakesSection';
import OccasionsSection from './components/OccasionsSection';
import CustomOrderBanner from './components/CustomOrderBanner';
import HowItWorks from './components/HowItWorks';
import WhyChooseUs from './components/WhyChooseUs';
import Gallery from './components/Gallery';
import Testimonials from './components/Testimonials';
import SocialFeed from './components/SocialFeed';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import FloatingElements from './components/FloatingElements';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import OrderHistoryModal from './components/OrderHistoryModal';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import OwnerDashboard from './components/OwnerDashboard';

const routeViewMap = {
  '': 'view-home',
  '#home': 'view-home',
  '#about': 'view-about',
  '#categories': 'view-categories',
  '#occasions': 'view-categories',
  '#custom-order': 'view-categories',
  '#how-it-works': 'view-categories',
  '#why-choose-us': 'view-categories',
  '#gallery': 'view-categories',
  '#chocolates': 'view-chocolates',
  '#cakes-bakes': 'view-cakes-bakes',
  '#contact': 'view-contact',
  '#login': 'view-login',
  '#signup': 'view-login',
  '#admin': 'view-admin',
  '#owner': 'view-owner'
};

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [confirmationRefNumber, setConfirmationRefNumber] = useState('');
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [initialFormData, setInitialFormData] = useState(null);
  const [chocolateFilter, setChocolateFilter] = useState('all');
  const [cakesFilter, setCakesFilter] = useState('all');
  const contactRef = useRef(null);

  const cleanHash = currentHash.split('?')[0] || '';
  const activeView = routeViewMap[cleanHash] || 'view-home';
  const initialTab = (currentHash.includes('tab=signup') || cleanHash === '#signup') ? 'signup' : 'login';

  // Apply auth-page body class when on login/signup page
  useEffect(() => {
    if (activeView === 'view-login') {
      document.body.classList.add('auth-page');
    } else {
      document.body.classList.remove('auth-page');
    }
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, [activeView]);

  // Listen to browser hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || '';
      setCurrentHash(newHash);

      const target = newHash.split('?')[0];
      if (['#occasions', '#custom-order', '#gallery', '#how-it-works', '#why-choose-us'].includes(target)) {
        setTimeout(() => {
          const el = document.querySelector(target);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (hash) => {
    window.location.hash = hash;
    setCurrentHash(hash);
  };

  const handleFilterNavigate = (hash, filter) => {
    if (hash === '#chocolates') {
      setChocolateFilter(filter);
    } else if (hash === '#cakes-bakes') {
      setCakesFilter(filter);
    }
    navigateTo(hash);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Pre-fill contact form when user clicks "Customise & Enquire"
  const handleEnquireProduct = (prodData) => {
    let customNote = '';
    if (prodData.type === 'theme') {
      const occ = prodData.selectedOccasion ? `Theme/Occasion: ${prodData.selectedOccasion}. ` : 'Theme/Occasion: (Rakhi, Diwali, Birthday, etc.). ';
      customNote = `${occ}I would like custom handcrafted chocolates tailored for this celebration.`;
    } else if (prodData.type === 'corporate') {
      customNote = 'Corporate Order: Custom chocolates featuring our company logo/branding, custom box packaging and greeting sleeve.';
    } else if (prodData.type === 'flavoured') {
      const flav = prodData.selectedFlavour ? `Flavour Preference: ${prodData.selectedFlavour}. ` : 'Flavours interested in: ';
      customNote = `${flav}Please share available assortment sizes and pricing details.`;
    } else {
      customNote = `I am interested in ${prodData.product}. I’d like to know more about customisation, quantity and pricing.`;
    }

    setInitialFormData({
      product: prodData.product,
      customisation: customNote
    });

    navigateTo('#contact');
  };

  // Pre-fill contact form from Occasions section
  const handleEnquireOccasion = (occasionName) => {
    setInitialFormData({
      occasion: occasionName,
      customisation: `Enquiry for ${occasionName} celebration treats.`
    });
    navigateTo('#contact');
  };

  // Pre-fill contact form from Gallery item
  const handleEnquireGalleryItem = (item) => {
    setInitialFormData({
      customisation: `I saw "${item.title}" in your gallery and would like to enquire about a similar creation.`
    });
    navigateTo('#contact');
  };

  const handleOrderSubmitted = (refNumber) => {
    setConfirmationRefNumber(refNumber);
    setIsConfirmationOpen(true);
  };

  // Dedicated standalone views: Login, Admin, Owner
  if (activeView === 'view-login') {
    return (
      <div className="app-root">
        <Header
          activeView={activeView}
          onNavigate={navigateTo}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
          onOpenOrderHistory={() => setIsOrderHistoryOpen(true)}
        />
        <LoginView onNavigate={navigateTo} initialTab={initialTab} />
        <Footer onNavigate={navigateTo} />
        <FloatingElements toastMessage={toastMessage} />
      </div>
    );
  }

  if (activeView === 'view-admin') {
    return (
      <div className="app-root">
        <AdminDashboard onNavigate={navigateTo} />
        <FloatingElements toastMessage={toastMessage} />
      </div>
    );
  }

  if (activeView === 'view-owner') {
    return (
      <div className="app-root">
        <OwnerDashboard onNavigate={navigateTo} />
        <FloatingElements toastMessage={toastMessage} />
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Cinematic Animated Splash Opening Screen */}
      <SplashScreen />

      {/* Luxury Navigation Header */}
      <Header
        activeView={activeView}
        onNavigate={navigateTo}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        onOpenOrderHistory={() => setIsOrderHistoryOpen(true)}
      />

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={navigateTo}
        onFilterNavigate={handleFilterNavigate}
        onOpenOrderHistory={() => setIsOrderHistoryOpen(true)}
      />

      {/* Multi-Page Views System */}
      <main id="main-content">
        {/* VIEW 1: HOME */}
        <div className={`page-view ${activeView === 'view-home' ? 'active-view' : 'hidden-view'}`} id="view-home">
          <Hero onNavigate={navigateTo} />
          <BrandStrip />
        </div>

        {/* VIEW 2: ABOUT */}
        <div className={`page-view ${activeView === 'view-about' ? 'active-view' : 'hidden-view'}`} id="view-about">
          <About onNavigate={navigateTo} />
        </div>

        {/* VIEW 3: CREATIONS (Categories, Occasions, Custom Order, Story, Why Us, Gallery, Testimonials, Social) */}
        <div className={`page-view ${activeView === 'view-categories' ? 'active-view' : 'hidden-view'}`} id="view-categories">
          <Categories onNavigate={navigateTo} />
          <OccasionsSection
            onEnquireOccasion={handleEnquireOccasion}
            onChipNavigate={handleFilterNavigate}
          />
          <CustomOrderBanner onNavigate={navigateTo} />
          <HowItWorks />
          <WhyChooseUs />
          <Gallery onEnquireGalleryItem={handleEnquireGalleryItem} />
          <Testimonials />
          <SocialFeed />
        </div>

        {/* VIEW 4: CHOCOLATES */}
        <div className={`page-view ${activeView === 'view-chocolates' ? 'active-view' : 'hidden-view'}`} id="view-chocolates">
          <ChocolatesSection
            onEnquireProduct={handleEnquireProduct}
            activeFilter={chocolateFilter}
          />
        </div>

        {/* VIEW 5: CAKES & BAKES */}
        <div className={`page-view ${activeView === 'view-cakes-bakes' ? 'active-view' : 'hidden-view'}`} id="view-cakes-bakes">
          <CakesAndBakesSection
            onEnquireProduct={handleEnquireProduct}
            activeFilter={cakesFilter}
          />
        </div>

        {/* VIEW 6: CONTACT */}
        <div className={`page-view ${activeView === 'view-contact' ? 'active-view' : 'hidden-view'}`} id="view-contact">
          <ContactSection
            ref={contactRef}
            initialFormData={initialFormData}
            onSubmitSuccess={handleOrderSubmitted}
            showToast={showToast}
          />
        </div>
      </main>

      {/* Luxury Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Floating Elements (Scroll Progress, WhatsApp Quick Chat, Back to Top, Toast) */}
      <FloatingElements toastMessage={toastMessage} />

      {/* Confirmation Dialog Modal */}
      <OrderConfirmationModal
        isOpen={isConfirmationOpen}
        referenceNumber={confirmationRefNumber}
        onClose={() => setIsConfirmationOpen(false)}
      />

      {/* Order History Dialog Modal */}
      <OrderHistoryModal
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        onNavigate={navigateTo}
      />
    </div>
  );
}
