import React from 'react';
import { Header, HeroSection, Features, Services, Stats, Footer } from '../components/home';



const HomePage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <Features />
      <Services />
      <Stats />
      <Footer />
    </div>
  );
};

export default HomePage;