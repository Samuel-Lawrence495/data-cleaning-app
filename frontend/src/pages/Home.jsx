import React from 'react';
import XLSXUploader from '../components/xlsxUploader'; 

function HomePage() {
  return (
    <div className="homepage-layout">
      <header>
        <h1>My Awesome Data Cleaner</h1>
      </header>
      <main>
        <section className="upload-section">
          <h2>Upload and Preview Your Data</h2>
          <XLSXUploader />
        </section>
        {/* <section className="other-section">
          <OtherHomepageSection />
        </section> */}
      </main>
      <footer>
        <p>© 2025 My App</p>
      </footer>
    </div>
  );
}

export default HomePage;