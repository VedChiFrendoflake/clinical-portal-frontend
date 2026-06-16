import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';

export default function DocumentDashboard() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'history'
  const [pastUploads, setPastUploads] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("Ready for upload.");
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef(null);

  // --- THE SMART ROUTER ---
  const processFile = async (file) => {
    setIsProcessing(true);
    const fileType = file.type;
    const fileUrl = URL.createObjectURL(file);
    let transcript = "";
    let engineUsed = "";

    try {
      // 1. Route Plaintext (Instant Native Extraction)
      if (fileType === 'text/plain') {
        setUploadStatus("Detected Text File -> Extracting instantly...");
        engineUsed = "Native FileReader";
        transcript = await file.text();
      } 
      
      // 2. Route Images (Tesseract OCR)
      else if (fileType.startsWith('image/')) {
        setUploadStatus("Detected Image -> Booting OCR Engine. This may take a moment...");
        engineUsed = "Tesseract OCR";
        const result = await Tesseract.recognize(file, 'eng');
        transcript = result.data.text || "No readable text found in image.";
      } 
      
      // 3. Route PDFs 
      else if (fileType === 'application/pdf') {
        setUploadStatus("Detected PDF -> Saving to records...");
        engineUsed = "PDF Handler";
        transcript = "PDF text extraction requires a dedicated backend or PDF.js worker. File saved successfully for manual review.";
      } 
      
      // 4. Fallback
      else {
        setUploadStatus("Error: Unsupported file format.");
        setIsProcessing(false);
        return;
      }

      // Create the new record
      const newRecord = {
        id: Date.now(),
        name: file.name,
        type: fileType,
        url: fileUrl,
        transcript: transcript,
        engine: engineUsed,
        date: new Date().toLocaleString()
      };

      // Add to state and switch tabs
      setPastUploads((prev) => [newRecord, ...prev]);
      setUploadStatus("Upload complete!");
      setActiveTab('history');

    } catch (error) {
      console.error("Processing Error:", error);
      setUploadStatus("An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- EVENT HANDLER ---
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
    // Reset the input so the user can upload the same file again if needed
    event.target.value = null; 
  };

  // --- RENDER ---
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🟢 TAB NAVIGATION */}
      <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('upload')}
          style={{ flex: 1, padding: '12px', background: activeTab === 'upload' ? '#16c4e8' : 'transparent', color: activeTab === 'upload' ? 'white' : '#555', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 'bold' }}
        >
          📤 New Upload
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ flex: 1, padding: '12px', background: activeTab === 'history' ? '#2e45f0' : 'transparent', color: activeTab === 'history' ? 'white' : '#555', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 'bold' }}
        >
          📂 Past Uploads ({pastUploads.length})
        </button>
      </div>

      {/* 🟢 TAB 1: GITHUB-STYLE UPLOAD AREA */}
      {activeTab === 'upload' && (
        <div>
          <div 
            onClick={() => !isProcessing && fileInputRef.current.click()}
            style={{ 
              border: '2px dashed #16c4e8', 
              borderRadius: '12px', 
              padding: '60px 20px', 
              textAlign: 'center',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              background: '#f8fcff',
              transition: 'all 0.2s ease'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#2e45f0', fontSize: '24px' }}>
              + Add Patient Document
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
              Tap to take a photo, select a file, or upload a scan.
            </p>
            <p style={{ margin: '10px 0 0 0', color: '#999', fontSize: '13px' }}>
              Supports .JPG, .PNG, .PDF, and .TXT
            </p>
          </div>

          {/* Status Bar */}
          <div style={{ marginTop: '20px', padding: '15px', background: isProcessing ? '#fff3cd' : '#f0f0f0', color: isProcessing ? '#856404' : '#333', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }}>
            {isProcessing ? '⚙️ ' : 'ℹ️ '} {uploadStatus}
          </div>

          {/* The Hidden Magic Input */}
          <input
            type="file"
            accept="image/*,application/pdf,text/plain"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* 🟢 TAB 2: PAST UPLOADS & TRANSCRIPTS */}
      {activeTab === 'history' && (
        <div>
          {pastUploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: '#fafafa', borderRadius: '8px' }}>
              No documents processed yet.
            </div>
          ) : (
            pastUploads.map((doc) => (
              <div key={doc.id} style={{ border: '1px solid #e1e4e8', borderRadius: '8px', padding: '20px', marginBottom: '20px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '15px' }}>
                  <strong style={{ fontSize: '16px', color: '#24292e' }}>{doc.name}</strong>
                  <span style={{ fontSize: '13px', color: '#6a737d' }}>{doc.date}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {/* Thumbnail / File Icon */}
                  <div style={{ flexShrink: 0 }}>
                    {doc.type.startsWith('image/') ? (
                      <img src={doc.url} alt="Scan" style={{ width: '120px', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} />
                    ) : (
                      <div style={{ width: '120px', height: '160px', background: '#f6f8fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #ddd' }}>
                        <span style={{ fontSize: '32px' }}>{doc.type === 'text/plain' ? '📝' : '📄'}</span>
                        <span style={{ fontSize: '12px', marginTop: '10px', color: '#555', fontWeight: 'bold' }}>
                          {doc.type === 'text/plain' ? 'TEXT' : 'PDF'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata and Transcript */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ background: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        Engine: {doc.engine}
                      </span>
                    </div>
                    
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#24292e' }}>Extraction Results:</h4>
                    <div style={{ background: '#f6f8fa', padding: '15px', borderRadius: '6px', fontSize: '13px', color: '#24292e', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid #e1e4e8', lineHeight: '1.5' }}>
                      {doc.transcript}
                    </div>
                  </div>
                </div>
                
              </div>
            ))
          )}
        </div>
      )}
      
    </div>
  );
}
