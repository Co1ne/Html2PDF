
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; 
      padding: 40px; 
      color: #333; 
      line-height: 1.6;
      background: white;
    }
    .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #1e40af; margin: 0; font-size: 28px; }
    .content { padding: 20px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #eee; padding-top: 20px; }
    .badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; }
    h2 { color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>简历 / 文档标题</h1>
    <p>使用 HTML 快速生成专业 PDF</p>
  </div>
  
  <div class="content">
    <h2>关于本工具</h2>
    <p>这是一个纯净的 HTML 转 PDF 小工具。您可以在左侧编写代码，右侧实时查看预览。</p>
    <p><span class="badge">提示</span> 建议使用浏览器的“打印”功能来获得最高质量、可搜索文本且体积最小的 PDF 文件。</p>
    
    <h3>功能说明：</h3>
    <ul>
      <li><strong>导入:</strong> 支持上传本地 HTML 文件或通过网址抓取内容。</li>
      <li><strong>实时预览:</strong> 左侧修改，右侧即时刷新。</li>
      <li><strong>导出 PDF:</strong> 提供系统打印和截图下载两种方式。</li>
    </ul>
  </div>

  <div class="footer">
    由 HTML to PDF Studio 提供技术支持
  </div>
</body>
</html>`;

const App: React.FC = () => {
  const [html, setHtml] = useState<string>(DEFAULT_HTML);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDownloadPDF = async () => {
    if (!renderContainerRef.current) return;
    setIsExporting(true);
    try {
      renderContainerRef.current.innerHTML = html;
      await new Promise(resolve => setTimeout(resolve, 800)); // 给更多时间加载资源

      const canvas = await html2canvas(renderContainerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
      pdf.save('html-export.pdf');
    } catch (err) {
      console.error("PDF export error:", err);
      alert("下载失败，建议使用“打印”功能另存为 PDF。");
    } finally {
      setIsExporting(false);
      if (renderContainerRef.current) renderContainerRef.current.innerHTML = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') setHtml(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportFromUrl = async () => {
    let url = importUrl.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;

    setIsImporting(true);
    let content = '';

    try {
      // 尝试 AllOrigins 代理
      const proxy1 = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&ts=${Date.now()}`;
      const res1 = await fetch(proxy1);
      if (res1.ok) {
        const data = await res1.json();
        content = data.contents;
      }

      // 如果失败，尝试 CodeTabs 代理
      if (!content) {
        const proxy2 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const res2 = await fetch(proxy2);
        if (res2.ok) content = await res2.text();
      }

      if (!content) throw new Error("无法抓取网页内容，请检查网址或手动复制。");

      setHtml(content);
      setShowUrlModal(false);
      setImportUrl('');
    } catch (err) {
      alert(err instanceof Error ? err.message : "导入失败");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 text-slate-800">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".html,.htm" className="hidden" />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center text-white">
            <i className="fa-solid fa-file-pdf text-xl"></i>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">HTML PDF 转换器</h1>
            <p className="text-xs text-slate-400 mt-1">简洁、高效、高保真</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Import Options */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all font-medium border border-slate-200">
              <i className="fa-solid fa-file-import"></i>
              <span>导入内容</span>
            </button>
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-20">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3"
              >
                <i className="fa-solid fa-upload w-4 text-center"></i>
                上传 HTML 文件
              </button>
              <button 
                onClick={() => setShowUrlModal(true)}
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3"
              >
                <i className="fa-solid fa-link w-4 text-center"></i>
                从网址导入
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1"></div>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-all font-medium border border-indigo-200"
          >
            <i className="fa-solid fa-print"></i>
            <span>打印 / 另存为 PDF</span>
          </button>
          
          <button 
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-all font-medium shadow-md disabled:opacity-50"
          >
            {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-download"></i>}
            <span>下载 PDF (截图)</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <section className="flex-1 flex flex-col border-r border-slate-200">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            HTML 编辑器
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="flex-1 p-6 code-font text-sm text-slate-700 focus:outline-none resize-none bg-white leading-relaxed"
            spellCheck={false}
          />
        </section>

        {/* Preview Area */}
        <section className="flex-1 flex flex-col bg-slate-200">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            实时预览 (A4 比例)
          </div>
          <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center">
            <div className="bg-white shadow-xl w-full max-w-[800px] min-h-[1100px] p-0 overflow-hidden relative">
              <iframe
                title="Preview"
                className="w-full h-full min-h-[1100px] border-none"
                srcDoc={html}
              />
            </div>
          </div>
        </section>
      </main>

      {/* URL Import Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">从网址导入 HTML</h3>
              <button onClick={() => setShowUrlModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                提示：由于跨域限制，我们将通过代理服务器尝试获取内容。部分复杂网站可能无法完整加载。
              </p>
              <input 
                type="url" 
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()}
              />
              <button 
                onClick={handleImportFromUrl}
                disabled={isImporting || !importUrl.trim()}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isImporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-down"></i>}
                抓取内容
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Render Container for html2canvas */}
      <div 
        ref={renderContainerRef} 
        style={{ 
          position: 'absolute', 
          top: '-9999px', 
          left: '-9999px', 
          width: '800px', 
          background: 'white' 
        }} 
      />

      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[11px] text-slate-400 no-print">
        <div className="flex items-center gap-4">
          <span>字节数: {html.length}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            就绪
          </span>
        </div>
        <div>
          提示: 建议使用“打印”功能并将目标设为“另存为PDF”，这能生成可搜索的高清矢量文档。
        </div>
      </footer>
    </div>
  );
};

export default App;
