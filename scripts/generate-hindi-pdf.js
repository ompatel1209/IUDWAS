const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>IUDWAS - यह प्रोजेक्ट कैसे काम करता है? (सम्पूर्ण गाइड)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1d1d1f;
      background: #ffffff;
      line-height: 1.6;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 0;
      letter-spacing: -0.01em;
    }

    h1 { font-size: 20pt; margin-bottom: 8pt; color: #1e3a8a; }
    h2 { font-size: 14pt; margin-bottom: 8pt; border-bottom: 1.5pt solid #cbd5e1; padding-bottom: 4pt; color: #1e40af; margin-top: 14pt; }
    h3 { font-size: 11.5pt; margin-bottom: 6pt; color: #1f2937; margin-top: 10pt; }
    h4 { font-size: 10pt; margin-bottom: 4pt; color: #374151; }

    p { margin-top: 0; margin-bottom: 6pt; color: #334155; text-align: justify; }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Cover Page */
    .cover-page {
      height: 98vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 35pt 20pt 20pt 20pt;
      border: 2pt solid #2563eb;
      border-radius: 12pt;
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
      page-break-after: always;
    }

    .cover-header {
      text-align: center;
    }

    .cover-badge {
      display: inline-block;
      background: #2563eb;
      color: white;
      font-size: 9pt;
      font-weight: 700;
      padding: 4pt 14pt;
      border-radius: 20pt;
      letter-spacing: 0.05em;
      margin-bottom: 14pt;
    }

    .cover-title {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 8pt;
    }

    .cover-subtitle {
      font-size: 12.5pt;
      color: #475569;
      font-weight: 600;
      max-width: 520pt;
      margin: 0 auto 16pt auto;
    }

    .cover-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10pt;
      margin: 15pt 0;
    }

    .cover-card {
      background: white;
      border: 1pt solid #cbd5e1;
      border-radius: 8pt;
      padding: 9pt 12pt;
      box-shadow: 0 2pt 4pt rgba(0,0,0,0.03);
    }

    .cover-card-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2pt;
    }

    .cover-card-value {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0f172a;
    }

    .cover-footer {
      border-top: 1pt solid #cbd5e1;
      padding-top: 10pt;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #64748b;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6pt 0 10pt 0;
      font-size: 8.5pt;
    }

    th, td {
      border: 1pt solid #cbd5e1;
      padding: 5pt 7pt;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      font-size: 8pt;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .code-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      background: #e2e8f0;
      padding: 1pt 3pt;
      border-radius: 3pt;
      color: #0f172a;
      font-weight: 600;
    }

    /* Status Pills */
    .status-pill {
      display: inline-block;
      padding: 2pt 6pt;
      border-radius: 8pt;
      font-size: 7.5pt;
      font-weight: 700;
    }
    .status-green { background: #dcfce7; color: #166534; }
    .status-blue { background: #dbeafe; color: #1e40af; }
    .status-purple { background: #f3e8ff; color: #6b21a8; }
    .status-amber { background: #fef3c7; color: #92400e; }

    /* Alert & Info Box */
    .alert-box {
      border-left: 3pt solid #2563eb;
      background: #eff6ff;
      padding: 6pt 10pt;
      border-radius: 0 6pt 6pt 0;
      margin: 6pt 0 10pt 0;
      font-size: 8.5pt;
    }

    .alert-box strong {
      color: #1e40af;
    }

    .step-card {
      background: #ffffff;
      border: 1pt solid #e2e8f0;
      border-left: 3pt solid #10b981;
      border-radius: 0 6pt 6pt 0;
      padding: 8pt 10pt;
      margin-bottom: 8pt;
    }

    .step-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 3pt;
    }

    .diagram-box {
      background: #ffffff;
      border: 1pt solid #cbd5e1;
      border-radius: 8pt;
      padding: 10pt;
      margin: 8pt 0 12pt 0;
      text-align: center;
      box-shadow: 0 1pt 3pt rgba(0,0,0,0.03);
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="cover-badge">विश्वविद्यालय दस्तावेज़ एवं वर्कफ़्लो स्वचालन प्रणाली</div>
      <div class="cover-title">IUDWAS प्रोजेक्ट कार्यप्रणाली एवं तकनीकी विवरण</div>
      <div class="cover-subtitle">Intelligent University Document & Workflow Automation System (सम्पूर्ण हिंदी गाइड)</div>
      <p style="text-align: center; color: #64748b; font-size: 9pt;">यह प्रोजेक्ट कैसे कार्य करता है, इसके मॉड्यूल, सुरक्षा तंत्र, वर्कफ़्लो जीवन-चक्र और उपयोग की सम्पूर्ण मार्गदर्शिका</p>
    </div>

    <div>
      <div class="cover-grid">
        <div class="cover-card">
          <div class="cover-card-label">सिस्टम का नाम (System Name)</div>
          <div class="cover-card-value">IUDWAS Enterprise Portal</div>
        </div>
        <div class="cover-card">
          <div class="cover-card-label">सुरक्षा स्थिति (Security Status)</div>
          <div class="cover-card-value"><span class="status-pill status-green">ग्रीन फ्लैग प्रमाणित (100% सुरक्षित)</span></div>
        </div>
        <div class="cover-card">
          <div class="cover-card-label">फ़्रंटएंड तकनीक (Frontend Stack)</div>
          <div class="cover-card-value">React 18 + Vite 6 + Tailwind CSS</div>
        </div>
        <div class="cover-card">
          <div class="cover-card-label">बैकएंड तकनीक (Backend Stack)</div>
          <div class="cover-card-value">Node.js LTS + Express + TypeScript</div>
        </div>
        <div class="cover-card">
          <div class="cover-card-label">डेटाबेस (Database Engine)</div>
          <div class="cover-card-value">SQLite 3 (WAL मोड) - 15 रिलेशनल टेबल्स</div>
        </div>
        <div class="cover-card">
          <div class="cover-card-label">स्वचालित टेस्ट परिणाम (Test Status)</div>
          <div class="cover-card-value">81 / 81 यूनिट एवं इंटीग्रेशन टेस्ट पास</div>
        </div>
      </div>

      <div class="alert-box">
        <strong>सारांश (Summary):</strong> IUDWAS एक आधुनिक, सुरक्षित और भूमिका-आधारित विश्वविद्यालय दस्तावेज़ प्रबंधन प्रणाली है। यह छात्रों, शिक्षकों और प्रशासकों के बीच कागजी प्रक्रियाओं को पूरी तरह डिजिटल और स्वचालित बनाता है। इसमें OCR टेक्स्ट निष्कर्षण, बहु-स्तरीय अनुमोदन वर्कफ़्लो, 5-स्तरीय रेट लिमिटिंग और डीप बाइनरी फ़ाइल सुरक्षा शामिल है।
      </div>
    </div>

    <div class="cover-footer">
      <div><strong>परियोजना:</strong> IUDWAS विश्वविद्यालय प्रबंधन प्लेटफ़ॉर्म</div>
      <div><strong>संस्करण:</strong> 1.0.0 (Production Master)</div>
      <div><strong>दिनांक:</strong> अगस्त 2026</div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS (विषय सूची) -->
  <div class="page-break">
    <h2>विषय सूची (Table of Contents)</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 15%;">अध्याय</th>
          <th style="width: 65%;">विषय / टॉपिक</th>
          <th style="width: 20%; text-align: right;">श्रेणी</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>अध्याय 1</strong></td>
          <td><strong>प्रोजेक्ट का परिचय और उद्देश्य (Project Overview & Purpose)</strong><br><span style="color: #64748b; font-size: 7.5pt;">IUDWAS क्या है और यह विश्वविद्यालय में किस समस्या को हल करता है?</span></td>
          <td style="text-align: right;"><span class="status-pill status-blue">परिचय</span></td>
        </tr>
        <tr>
          <td><strong>अध्याय 2</strong></td>
          <td><strong>प्रोजेक्ट का समग्र ढांचा एवं आर्किटेक्चर (System Architecture)</strong><br><span style="color: #64748b; font-size: 7.5pt;">Frontend, Backend, Database और AI Engine कैसे आपस में संवाद करते हैं?</span></td>
          <td style="text-align: right;"><span class="status-pill status-purple">आर्किटेक्चर</span></td>
        </tr>
        <tr>
          <td><strong>अध्याय 3</strong></td>
          <td><strong>4 मुख्य भूमिकाएं और अधिकार (4 Core Roles & RBAC)</strong><br><span style="color: #64748b; font-size: 7.5pt;">Super Admin, Dept Admin, Faculty और Student के अधिकार और सीमाएं।</span></td>
          <td style="text-align: right;"><span class="status-pill status-green">भूमिकाएं</span></td>
        </tr>
        <tr>
          <td><strong>अध्याय 4</strong></td>
          <td><strong>दस्तावेज़ प्रबंधन एवं OCR पाइपलाइन (Document Lifecycle & OCR)</strong><br><span style="color: #64748b; font-size: 7.5pt;">फ़ाइल अपलोड, मैजिक बाइट सत्यापन, टेक्स्ट निष्कर्षण और सुरक्षित डाउनलोड।</span></td>
          <td style="text-align: right;"><span class="status-pill status-blue">दस्तावेज़</span></td>
        </tr>
        <tr>
          <td><strong>अध्याय 5</strong></td>
          <td><strong>मल्टी-स्टेप वर्कफ़्लो और अनुमोदन जीवन-चक्र (Approval Workflows)</strong><br><span style="color: #64748b; font-size: 7.5pt;">आवेदन कैसे सबमिट होता है, कैसे आगे बढ़ता है, और कैसे स्वीकृत/अस्वीकृत होता है?</span></td>
          <td style="text-align: right;"><span class="status-pill status-purple">वर्कफ़्लो</span></td>
        </tr>
        <tr>
          <td><strong>अध्याय 6</strong></td>
          <td><strong>6-स्तरीय सुरक्षा कवच (6-Layer Security Shield)</strong><br><span style="color: #64748b; font-size: 7.5pt;">रेट लिमिटिंग, इनपुट स्कीमा जांच, शून्य भेद्यता, और एरर सैनिटाइजेशन।</span></td>
          <td style="text-align: right;"><span class="status-pill status-amber">सुरक्षा</span></td>
        </tr>
        <tr>
          <td><strong>अध्याय 7</strong></td>
          <td><strong>सिस्टम को कैसे चलाएं और उपयोग करें (How to Run & Operate)</strong><br><span style="color: #64748b; font-size: 7.5pt;">लोकल रन कमांड, लॉगिन क्रेडेंशियल्स, और मुख्य स्क्रीन का विवरण।</span></td>
          <td style="text-align: right;"><span class="status-pill status-green">ऑपरेशन</span></td>
        </tr>
      </tbody>
    </table>

    <h2>1. प्रोजेक्ट का परिचय (Project Overview)</h2>
    <p>
      <strong>IUDWAS (Intelligent University Document & Workflow Automation System)</strong> एक उच्च-स्तरीय, क्लाउड-तैयार वेब प्लेटफ़ॉर्म है जिसे विश्वविद्यालयों में जटिल दस्तावेज़ प्रक्रियाओं, छात्र याचिकाओं (Petitions), पाठ्यक्रम अनुमोदन, छुट्टी आवेदनों, और गोपनीय अकादमिक रिकॉर्ड्स के प्रबंधन को पूरी तरह डिजिटल और पारदर्शी बनाने के लिए विकसित किया गया है।
    </p>
    <div class="alert-box">
      <strong>मुख्य समस्या का समाधान:</strong> पारंपरिक विश्वविद्यालयों में छात्रों को किसी दस्तावेज़ के सत्यापन या अनुमोदन के लिए अलग-अलग विभागों, संकायों और कुलसचिव (Registrar) के चक्कर लगाने पड़ते थे। IUDWAS में छात्र 1 क्लिक में दस्तावेज़ अपलोड करता है और सिस्टम स्वचालित रूप से उसे संबंधित अधिकारियों के पास भेजकर रीयल-टाइम ट्रैकिंग प्रदान करता है।
    </div>
  </div>

  <!-- CHAPTER 2: SYSTEM ARCHITECTURE -->
  <div class="page-break">
    <h2>2. समग्र तकनीकी ढांचा (System Architecture)</h2>
    <p>IUDWAS 3 मुख्य स्तरों (Tiers) पर कार्य करता है:</p>

    <div class="diagram-box avoid-break">
      <h3>IUDWAS 3-स्तरीय आर्किटेक्चर आरेख</h3>
      <svg viewBox="0 0 740 280" width="100%" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="740" height="280" fill="#f8fafc" rx="8" stroke="#cbd5e1" stroke-width="1.5"/>

        <!-- Client Box -->
        <g transform="translate(30, 40)">
          <rect width="190" height="200" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
          <text x="95" y="24" font-family="Noto Sans Devanagari" font-size="11" font-weight="700" fill="#1e40af" text-anchor="middle">1. फ़्रंटएंड क्लाइंट (SPA)</text>
          <text x="15" y="55" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• React 18 + Vite 6 SPA</text>
          <text x="15" y="75" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• Apple डिज़ाइन सिस्टम (Tailwind)</text>
          <text x="15" y="95" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• JWT ऑथेंटिकेशन टोकन्स</text>
          <text x="15" y="115" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• OCR और दस्तावेज़ प्रिव्यू</text>
          <text x="15" y="135" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• रीयल-टाइम एनालिटिक्स</text>
          <text x="15" y="155" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• इंटरैक्टिव AI चैटबॉट</text>
        </g>

        <!-- Backend Box -->
        <g transform="translate(265, 40)">
          <rect width="250" height="200" rx="8" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
          <text x="125" y="24" font-family="Noto Sans Devanagari" font-size="11" font-weight="700" fill="#5b21b6" text-anchor="middle">2. बैकएंड कोर API गेटवे</text>
          <text x="15" y="55" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• Node.js / Express / TypeScript</text>
          <text x="15" y="75" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• 5-स्तरीय रेट लिमिटिंग शील्ड</text>
          <text x="15" y="95" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• Zod सख्त स्कीमा सत्यापन</text>
          <text x="15" y="115" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• बाइनरी मैजिक-बाइट फ़ाइल चेकर</text>
          <text x="15" y="135" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• मल्टी-स्टेप वर्कफ़्लो इंजन</text>
          <text x="15" y="155" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• एरर सैनिटाइजेशन और लॉगिंग</text>
        </g>

        <!-- Database & Storage Box -->
        <g transform="translate(560, 40)">
          <rect width="150" height="200" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="1.5"/>
          <text x="75" y="24" font-family="Noto Sans Devanagari" font-size="11" font-weight="700" fill="#065f46" text-anchor="middle">3. डेटाबेस और स्टोरेज</text>
          <text x="12" y="55" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• SQLite WAL मोड</text>
          <text x="12" y="75" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• 15 रिलेशनल टेबल्स</text>
          <text x="12" y="95" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• फॉरेन की रिलेशंस</text>
          <text x="12" y="115" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• आइसोलेटेड फ़ाइल डायरेक्टरी</text>
          <text x="12" y="135" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• नो वेब-रूट एक्सेस</text>
          <text x="12" y="155" font-family="Noto Sans Devanagari" font-size="8.5" fill="#1e293b">• रैंडम UUID नामकरण</text>
        </g>

        <!-- Connecting Lines -->
        <line x1="220" y1="130" x2="265" y2="130" stroke="#2563eb" stroke-width="2"/>
        <text x="242" y="122" font-family="Inter" font-size="7.5" font-weight="700" fill="#2563eb" text-anchor="middle">JSON/REST</text>

        <line x1="515" y1="130" x2="560" y2="130" stroke="#059669" stroke-width="2"/>
        <text x="538" y="122" font-family="Inter" font-size="7.5" font-weight="700" fill="#059669" text-anchor="middle">SQL/IPC</text>
      </svg>
    </div>

    <h2>3. 4 मुख्य भूमिकाएं और अधिकार (Roles & Permissions)</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 18%;">भूमिका (Role)</th>
          <th style="width: 32%;">मुख्य जिम्मेदारियां</th>
          <th style="width: 50%;">सिस्टम में क्या कर सकते हैं?</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="status-pill status-purple">Super Admin</span></td>
          <td>संपूर्ण विश्वविद्यालय का प्रबंधन</td>
          <td>• नए उपयोगकर्ता और विभाग बनाना / संपादित करना<br>• वर्कफ़्लो टेम्पलेट बनाना और SLA दिन निर्धारित करना<br>• सिस्टम की सुरक्षा सेटिंग्स और रेट लिमिट्स बदलना<br>• सम्पूर्ण सुरक्षा ऑडिट लॉग्स (Audit Logs) देखना</td>
        </tr>
        <tr>
          <td><span class="status-pill status-blue">Dept Admin</span></td>
          <td>विभागीय अध्यक्ष (HOD / Chair)</td>
          <td>• अपने विभाग के संकाय और छात्रों को देखना<br>• विभाग के वर्कफ़्लो आवेदनों की समीक्षा और स्वीकृति देना<br>• विभागीय दस्तावेज़ रिपॉजिटरी प्रबंधित करना</td>
        </tr>
        <tr>
          <td><span class="status-pill status-green">Faculty</span></td>
          <td>प्रोफेसर / शिक्षक</td>
          <td>• विभागीय और सार्वजनिक दस्तावेज़ देखना और अपलोड करना<br>• छात्रों के वर्कफ़्लो आवेदनों पर प्रथम-स्तरीय स्वीकृति/अस्वीकृति देना<br>• किसी अन्य शिक्षक को समीक्षा सौंपना (Delegate)</td>
        </tr>
        <tr>
          <td><span class="status-pill status-blue">Student</span></td>
          <td>विद्यार्थी / छात्र</td>
          <td>• अपनी मार्कशीट, प्रमाणपत्र या याचिका दस्तावेज़ अपलोड करना<br>• किसी वर्कफ़्लो में आवेदन सबमिट करना<br>• अपने आवेदन की वर्तमान स्थिति (Status) रीयल-टाइम ट्रैक करना<br>• केवल अपने स्वयं के दस्तावेज़ डाउनलोड करना (IDOR सुरक्षित)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- CHAPTER 4 & 5: DOCUMENT & WORKFLOW LIFECYCLE -->
  <div class="page-break">
    <h2>4. दस्तावेज़ प्रबंधन एवं OCR पाइपलाइन (Document Lifecycle)</h2>
    <p>जब कोई उपयोगकर्ता सिस्टम में कोई फ़ाइल अपलोड करता है, तो वह निम्नलिखित 5-चरणीय सुरक्षा और प्रसंस्करण प्रक्रिया से गुजरती है:</p>

    <div class="step-card">
      <div class="step-title">चरण 1: एक्सटेंशन और आकार जांच (Extension & Size Validation)</div>
      <p style="margin: 0; font-size: 8.5pt;">केवल सुरक्षित एक्सटेंशन्स (<code>.pdf, .docx, .xlsx, .jpg, .png, .txt</code>) स्वीकार किए जाते हैं। <code>.exe, .sh, .bat, .php, .html, .js</code> जैसी निष्पादन योग्य फ़ाइलें तुरंत 400 एरर के साथ अस्वीकृत कर दी जाती हैं। अधिकतम फ़ाइल सीमा 50MB है।</p>
    </div>

    <div class="step-card">
      <div class="step-title">चरण 2: बाइनरी मैजिक-बाइट हेडर निरीक्षण (Magic-Byte Verification)</div>
      <p style="margin: 0; font-size: 8.5pt;">यदि कोई हैकर किसी वायरस या स्क्रिप्ट को <code>.pdf</code> नाम देकर अपलोड करता है, तो हमारा सिस्टम डिस्क पर फ़ाइल के पहले बाइट्स की जांच करता है (उदा. <code>%PDF-</code>, <code>0x89 0x50 0x4E 0x47</code>)। मैलिशियस हेडर मिलते ही फ़ाइल डिस्क से <strong>तुरंत डिलीट</strong> कर दी जाती है।</p>
    </div>

    <div class="step-card">
      <div class="step-title">चरण 3: अलग सुरक्षित स्टोरेज में सहेजना (Isolated Storage)</div>
      <p style="margin: 0; font-size: 8.5pt;">फ़ाइल को पब्लिक वेब-रूट से बाहर <code>backend/uploads/</code> में यादृच्छिक UUID नाम (उदा. <code>7b35-4b3e.pdf</code>) से सहेजा जाता है, जिससे कोई भी सीधे URL टाइप करके फ़ाइल नहीं देख सकता।</p>
    </div>

    <div class="step-card">
      <div class="step-title">चरण 4: स्वचालित OCR टेक्स्ट निष्कर्षण (OCR Text Extraction)</div>
      <p style="margin: 0; font-size: 8.5pt;">दस्तावेज़ की सामग्री का स्वचालित रूप से पाठ (Text) निकाल लिया जाता है और डेटाबेस में अनुक्रमित (Indexed) किया जाता है, जिससे कीवर्ड या AI द्वारा दस्तावेज़ को आसानी से खोजा जा सके।</p>
    </div>

    <div class="step-card">
      <div class="step-title">चरण 5: सैंडबॉक्स्ड सुरक्षित डाउनलोड (Sandboxed Download)</div>
      <p style="margin: 0; font-size: 8.5pt;">दस्तावेज़ डाउनलोड करते समय <code>Content-Disposition: attachment</code>, <code>X-Content-Type-Options: nosniff</code> और <code>Content-Security-Policy: default-src 'none'; sandbox</code> हेडर भेजे जाते हैं ताकि ब्राउज़र में कोई स्क्रिप्ट निष्पादित न हो सके।</p>
    </div>

    <h2>5. मल्टी-स्टेप वर्कफ़्लो कैसे काम करता है? (Workflow Lifecycle)</h2>

    <div class="diagram-box avoid-break">
      <h3>वर्कफ़्लो अनुमोदन प्रक्रिया (Workflow Process Flow)</h3>
      <svg viewBox="0 0 740 180" width="100%" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="740" height="180" fill="#f8fafc" rx="8" stroke="#cbd5e1" stroke-width="1.5"/>

        <!-- Step 1 -->
        <g transform="translate(20, 40)">
          <rect width="140" height="90" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
          <text x="70" y="24" font-family="Noto Sans Devanagari" font-size="9.5" font-weight="700" fill="#1e40af" text-anchor="middle">1. आवेदन सबमिट</text>
          <text x="70" y="44" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">छात्र याचिका और</text>
          <text x="70" y="58" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">दस्तावेज़ सबमिट करता है</text>
          <text x="70" y="76" font-family="Inter" font-size="7" font-weight="700" fill="#2563eb" text-anchor="middle">Status: PENDING</text>
        </g>

        <!-- Arrow -->
        <line x1="160" y1="85" x2="200" y2="85" stroke="#64748b" stroke-width="2"/>
        <polygon points="195,80 205,85 195,90" fill="#64748b"/>

        <!-- Step 2 -->
        <g transform="translate(205, 40)">
          <rect width="145" height="90" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
          <text x="72" y="24" font-family="Noto Sans Devanagari" font-size="9.5" font-weight="700" fill="#5b21b6" text-anchor="middle">2. शिक्षक समीक्षा (Step 1)</text>
          <text x="72" y="44" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">संकाय सदस्य दस्तावेज़</text>
          <text x="72" y="58" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">की जांच कर स्वीकृत करता है</text>
          <text x="72" y="76" font-family="Inter" font-size="7" font-weight="700" fill="#7c3aed" text-anchor="middle">Status: IN_PROGRESS</text>
        </g>

        <!-- Arrow -->
        <line x1="350" y1="85" x2="390" y2="85" stroke="#64748b" stroke-width="2"/>
        <polygon points="385,80 395,85 385,90" fill="#64748b"/>

        <!-- Step 3 -->
        <g transform="translate(395, 40)">
          <rect width="150" height="90" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
          <text x="75" y="24" font-family="Noto Sans Devanagari" font-size="9.5" font-weight="700" fill="#b45309" text-anchor="middle">3. HOD / विभाग समीक्षा</text>
          <text x="75" y="44" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">विभागाध्यक्ष आवेदन को</text>
          <text x="75" y="58" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">अंतिम स्तर हेतु भेजता है</text>
          <text x="75" y="76" font-family="Inter" font-size="7" font-weight="700" fill="#d97706" text-anchor="middle">Action: APPROVE / DELEGATE</text>
        </g>

        <!-- Arrow -->
        <line x1="545" y1="85" x2="585" y2="85" stroke="#64748b" stroke-width="2"/>
        <polygon points="580,80 590,85 580,90" fill="#64748b"/>

        <!-- Step 4 -->
        <g transform="translate(590, 40)">
          <rect width="130" height="90" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="1.5"/>
          <text x="65" y="24" font-family="Noto Sans Devanagari" font-size="9.5" font-weight="700" fill="#065f46" text-anchor="middle">4. अंतिम स्वीकृति</text>
          <text x="65" y="44" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">सुपर एडमिन स्वीकृति</text>
          <text x="65" y="58" font-family="Noto Sans Devanagari" font-size="7.5" fill="#334155" text-anchor="middle">छात्र को नोटिफिकेशन</text>
          <text x="65" y="76" font-family="Inter" font-size="7" font-weight="700" fill="#059669" text-anchor="middle">Status: APPROVED</text>
        </g>
      </svg>
    </div>
  </div>

  <!-- CHAPTER 6: 6-LAYER SECURITY SHIELD -->
  <div class="page-break">
    <h2>6. 6-स्तरीय सुरक्षा कवच (6-Layer Security Shield)</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">सुरक्षा स्तर (Security Layer)</th>
          <th style="width: 35%;">लागू की गई सुरक्षा तकनीक</th>
          <th style="width: 40%;">यह सिस्टम को किससे बचाती है?</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. रेट लिमिटिंग एवं बैकऑफ (Rate Limiting)</strong></td>
          <td>IP-आधारित स्लाइडिंग विंडो + विफल लॉगिन पर एक्सपोनेंशियल बैकऑफ (2s $\to$ 1800s)।</td>
          <td>पासवर्ड गेसिंग, ब्रूट फ़ोर्स और DDoS हमलों से सुरक्षा।</td>
        </tr>
        <tr>
          <td><strong>2. सख्त इनपुट स्कीमा (Zod Validation)</strong></td>
          <td>प्रत्येक बॉडी, क्वेरी और पाथ पैरामीटर का Zod सत्यापन। अनपेक्षित फ़ील्ड्स तुरंत 400 एरर से अस्वीकृत।</td>
          <td>SQL इंजेक्शन, अनचाहे पेलोड और मैस-असाइनमेंट हमलों से बचाव।</td>
        </tr>
        <tr>
          <td><strong>3. सीक्रेट और टोकन सुरक्षा (Secrets Defense)</strong></td>
          <td>JWT सीक्रेट्स पर्यावरण चरों (.env) में सुरक्षित। प्रोडक्शन बूट पर शून्य डिफ़ॉल्ट सीक्रेट अनुमति।</td>
          <td>टोकन जालसाजी और क्रेडेंशियल लीक से सुरक्षा।</td>
        </tr>
        <tr>
          <td><strong>4. शून्य भेद्यता (0 Vulnerabilities)</strong></td>
          <td>Vite और React Router Dom के सुरक्षित नवीनतम पैकेजों का उपयोग।</td>
          <td>थर्ड-पार्टी सुरक्षा खामियों और CVEs से बचाव।</td>
        </tr>
        <tr>
          <td><strong>5. त्रुटि स्वच्छता (Error Sanitization)</strong></td>
          <td>क्लाइंट को भेजे जाने वाले संदेशों से सर्वर पाथ, SQL टेबल नाम और स्टैक ट्रेस हटाना।</td>
          <td>आंतरिक सर्वर जानकारी और डेटाबेस आर्किटेक्चर लीक होने से सुरक्षा।</td>
        </tr>
        <tr>
          <td><strong>6. बाइनरी फ़ाइल सुरक्षा (Upload Sandbox)</strong></td>
          <td>फ़ाइल हेडर मैजिक बाइट्स जांच, पृथक डिस्क स्टोरेज और डाउनलोड सैंडबॉक्सिंग हेडर।</td>
          <td>रिमोट कोड निष्पादन (RCE) और वेब शेल अपलोड हमलों से 100% सुरक्षा।</td>
        </tr>
      </tbody>
    </table>

    <h2>7. सिस्टम कैसे चलाएं और लॉगिन करें (How to Run & Operate)</h2>
    <h3>7.1 कमांड्स (Running the Project)</h3>
    <div style="background: #0f172a; color: #f8fafc; padding: 10pt; border-radius: 6pt; font-family: 'JetBrains Mono', monospace; font-size: 8pt; margin-bottom: 10pt;">
      # 1. बैकएंड शुरू करें (Backend Port: 3001)<br>
      cd backend && npm run dev<br><br>
      # 2. फ़्रंटएंड शुरू करें (Frontend Port: 5173)<br>
      cd frontend && npm run dev<br><br>
      # 3. सभी स्वचालित टेस्ट चलाएं (All 81 Tests)<br>
      cd backend && npm test
    </div>

    <h3>7.2 डिफ़ॉल्ट लॉगिन खाते (Demo Accounts)</h3>
    <table>
      <thead>
        <tr>
          <th>भूमिका (Role)</th>
          <th>ईमेल (Email)</th>
          <th>पासवर्ड (Password)</th>
          <th>विभागीय कार्यक्षेत्र</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="status-pill status-purple">Super Admin</span></td>
          <td><span class="code-text">admin@iudwas.edu</span></td>
          <td><span class="code-text">Password@123</span></td>
          <td>सम्पूर्ण विश्वविद्यालय</td>
        </tr>
        <tr>
          <td><span class="status-pill status-blue">Dept Admin</span></td>
          <td><span class="code-text">deptadmin.cs@iudwas.edu</span></td>
          <td><span class="code-text">Password@123</span></td>
          <td>Computer Science & Engineering</td>
        </tr>
        <tr>
          <td><span class="status-pill status-green">Faculty</span></td>
          <td><span class="code-text">faculty.smith@iudwas.edu</span></td>
          <td><span class="code-text">Password@123</span></td>
          <td>Computer Science Department</td>
        </tr>
        <tr>
          <td><span class="status-pill status-blue">Student</span></td>
          <td><span class="code-text">student.alex@iudwas.edu</span></td>
          <td><span class="code-text">Password@123</span></td>
          <td>Student Services / Petitions</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 25pt; padding-top: 15pt; border-top: 1pt solid #cbd5e1; color: #64748b; font-size: 8.5pt;">
      <strong>IUDWAS प्रणाली सम्पूर्ण कार्यप्रणाली एवं तकनीकी विवरण (हिंदी संस्करण)</strong> — ग्रीन फ्लैग प्रमाणित।
    </div>
  </div>

</body>
</html>`;

const htmlFilePath = path.join(__dirname, 'hindi_guide.html');
const pdfFilePath = path.join(__dirname, '..', 'IUDWAS_Hindi_Project_Guide.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
console.log('Hindi HTML Guide generated at:', htmlFilePath);

try {
  console.log('Compiling Hindi PDF via Headless Chrome...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const command = `"${chromePath}" --headless=new --disable-gpu --no-sandbox --print-to-pdf="${pdfFilePath}" --print-to-pdf-no-header "${htmlFilePath}"`;
  execSync(command, { stdio: 'inherit' });

  const stats = fs.statSync(pdfFilePath);
  console.log(`\nSUCCESS: Hindi PDF generated at ${pdfFilePath} (${stats.size} bytes)`);
} catch (err) {
  console.error('Error generating Hindi PDF:', err);
  process.exit(1);
}
