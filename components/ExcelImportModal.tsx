
import { AlertCircle, ArrowRight, Check, FileText, RefreshCw, Save, Search, Table, Upload, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ExcelMapping, ProductData } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ProductData[], rawData: any[], mapping: ExcelMapping) => void;
  onSave: (rawData: any[], mapping: ExcelMapping) => void;
  savedData?: any[];
  savedMapping?: ExcelMapping;
}

type ExcelRow = Record<string, any>;

const MAPPING_FIELDS: { key: keyof ExcelMapping; label: string }[] = [
  { key: 'name', label: 'Tên Thuốc' },
  { key: 'dosage', label: 'Hàm Lượng' },
  { key: 'packaging', label: 'Quy cách đóng gói' },
  { key: 'usage', label: 'Công Dụng' },
  { key: 'listPrice', label: 'Giá Niêm Yết (Tiêu đề 2)' },
  { key: 'idecoPrice', label: 'Giá IDECO (Tiêu đề 3)' },
  { key: 'manufacturer', label: 'Nhà Sản Xuất' },
];

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport, 
  onSave, 
  savedData = [], 
  savedMapping 
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ExcelMapping>({
    name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '', packaging: ''
  });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoLoaded, setIsAutoLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (savedData && savedData.length > 0) {
            setData(savedData);
            const cols = Object.keys(savedData[0]);
            setColumns(cols);
            if (savedMapping) setMapping(savedMapping);
            setStep(2);
            setIsAutoLoaded(true);
        } else {
            reset();
        }
    }
  }, [isOpen]); 

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // 1. Get raw rows to detect headers
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (rawRows.length === 0) return;

        // Find the first row that actually has data (header row)
        const headerIndex = rawRows.findIndex(row => row && row.length > 0);
        if (headerIndex === -1) return;

        const headerRow = rawRows[headerIndex];
        
        // Make headers unique to ensure correct mapping
        const counts: Record<string, number> = {};
        const uniqueHeaders = headerRow.map((h: any, idx: number) => {
            let name = String(h || '').trim();
            if (!name) name = `Column_${idx + 1}`;
            
            if (counts[name]) {
                counts[name]++;
                name = `${name}_${counts[name]}`;
            } else {
                counts[name] = 1;
            }
            return name;
        });
        
        setColumns(uniqueHeaders);
        
        // 2. Parse data using these EXACT unique headers as keys
        // range: headerIndex + 1 skips the header row itself in the data
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws, { 
            header: uniqueHeaders,
            range: headerIndex + 1,
            defval: '' 
        });
        
        setData(jsonData);
          
        const newMapping: ExcelMapping = { name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '', packaging: '' };
        uniqueHeaders.forEach(col => {
             const lower = col.toLowerCase();
             if (lower.includes('tên thuốc') || lower === 'tên hàng' || lower.includes('biệt dược')) newMapping.name = col;
             else if (lower.includes('hàm lượng')) newMapping.dosage = col;
             else if (lower.includes('quy cách') || lower.includes('đóng gói')) newMapping.packaging = col;
             else if (lower.includes('công dụng')) newMapping.usage = col;
             else if (lower.includes('niêm yết') || lower.includes('đơn giá hộp') || lower.includes('giá bán')) newMapping.listPrice = col;
             else if (lower.includes('giá mua') || lower.includes('giá ideco') || lower.includes('giá đại lý') || lower.includes('chiết khấu')) newMapping.idecoPrice = col;
             else if (lower.includes('nhà sản xuất') || lower.includes('đơn vị sx')) newMapping.manufacturer = col;
        });
        
        setMapping(newMapping);
        setStep(2);
        setIsAutoLoaded(false);
        setSaveStatus('idle');
      } catch (error) {
        console.error("Excel Error:", error);
        alert("Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (field: keyof ExcelMapping, column: string) => {
    setMapping(prev => ({ ...prev, [field]: column }));
    setSaveStatus('idle');
  };

  const toggleRowSelection = (originalIndex: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(originalIndex)) newSet.delete(originalIndex);
    else {
        if (newSet.size >= 4) {
            alert("Bạn chỉ có thể chọn tối đa 4 sản phẩm.");
            return;
        }
        newSet.add(originalIndex);
    }
    setSelectedIndices(newSet);
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data.map((row, idx) => ({ row, originalIndex: idx }));
    const lowerQuery = searchQuery.toLowerCase();
    const searchCol = mapping.name || columns[0];
    return data
        .map((row, idx) => ({ row, originalIndex: idx }))
        .filter(({ row }) => {
            const val = row[searchCol];
            return val && String(val).toLowerCase().includes(lowerQuery);
        });
  }, [data, searchQuery, mapping.name, columns]);

  const handleSaveOnly = () => {
    if (data.length === 0) return;
    setSaveStatus('saving');
    onSave(data, mapping);
    setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
    }, 500);
  };

  const handleApply = () => {
    const selectedRows = data.filter((_, idx) => selectedIndices.has(idx));
    if (selectedRows.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm.");
      return;
    }
    
    const formatPriceString = (priceVal: any, packVal: any) => {
        if (priceVal === undefined || priceVal === null || String(priceVal).trim() === '') return '';
        
        let p = '';
        // Handle pure numbers
        if (typeof priceVal === 'number') {
            p = priceVal.toLocaleString('vi-VN');
        } else {
            // Handle strings that might look like "73000" or "73.000" or "73,000"
            const strVal = String(priceVal).trim();
            // Remove everything except digits and dots/commas to verify if it's a number
            const cleanNum = strVal.replace(/[^0-9]/g, "");
            
            if (cleanNum && !isNaN(parseInt(cleanNum))) {
                // If it looks like a number, parse it. 
                // Note: This logic assumes input is effectively an integer amount.
                p = parseInt(cleanNum).toLocaleString('vi-VN');
            } else {
                // Keep strictly non-numeric strings (like "Liên hệ") as is
                p = strVal;
            }
        }

        if (p && !p.toLowerCase().includes('đồng') && /^[0-9.,]+$/.test(p.replace(/[^0-9.,]/g, ""))) {
             p += ' đồng';
        }

        if (packVal && String(packVal).trim()) {
            return `${p}/ ${String(packVal).trim()}`;
        }
        return p;
    };

    const newProducts: ProductData[] = selectedRows.map((row, idx) => {
      const name = row[mapping.name] ? String(row[mapping.name]).trim() : '';
      const dosage = row[mapping.dosage] ? String(row[mapping.dosage]).trim() : '';
      const usage = row[mapping.usage] ? String(row[mapping.usage]).trim() : '';
      const listPrice = formatPriceString(row[mapping.listPrice], row[mapping.packaging]);
      const idecoPrice = formatPriceString(row[mapping.idecoPrice], row[mapping.packaging]);
      const manufacturer = row[mapping.manufacturer] ? String(row[mapping.manufacturer]).trim() : '';

      return {
        id: idx + 1,
        name,
        dosage,
        usage,
        listPrice,
        idecoPrice,
        manufacturer,
        isETC: false,
        description: '',
        aspectRatio: 'vertical'
      };
    });
    
    onSave(data, mapping);
    onImport(newProducts, data, mapping);
    onClose();
  };
  
  const reset = () => {
      setStep(1);
      setData([]);
      setColumns([]);
      setMapping({ name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '', packaging: '' });
      setSelectedIndices(new Set());
      setSearchQuery('');
      setIsAutoLoaded(false);
      setSaveStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] md:max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Table className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold text-slate-800">
                    {step === 1 ? 'Nhập Dữ Liệu Từ Excel' : 'Soi Chiếu & Chọn Sản Phẩm'}
                </h3>
            </div>
            <div className="flex items-center gap-2">
                {step === 2 && (
                    <button 
                        onClick={reset}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-slate-200"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Tải file khác
                    </button>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            {step === 1 ? (
                <div className="h-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                    <Upload className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-xl font-bold text-slate-600">Click để tải file Excel (.xlsx, .xls)</p>
                    <p className="text-sm text-slate-400 mt-2">Dữ liệu sẽ được bảo mật và chỉ xử lý trên trình duyệt của bạn</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-xl border-2 border-emerald-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <h4 className="font-black text-emerald-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <ArrowRight className="w-4 h-4" /> 
                                BƯỚC 1: CẤU HÌNH CỘT DỮ LIỆU
                            </h4>
                            <button onClick={handleSaveOnly} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>
                                {saveStatus === 'saved' ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />} {saveStatus === 'saved' ? 'ĐÃ LƯU' : 'LƯU CẤU HÌNH'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {MAPPING_FIELDS.map(field => (
                                <div key={field.key} className="flex flex-col">
                                    <label className="text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-tighter flex justify-between">
                                        {field.label}
                                        {mapping[field.key] && <span className="text-emerald-600">✓</span>}
                                    </label>
                                    <select 
                                        className={`w-full text-xs font-bold border rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 bg-white p-2 transition-all ${mapping[field.key] ? 'border-emerald-400 bg-emerald-50/50 text-emerald-900' : 'border-slate-200'}`} 
                                        value={mapping[field.key] || ''} 
                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                    >
                                        <option value="">-- Chọn cột --</option>
                                        {columns.map(col => (<option key={col} value={col}>{col}</option>))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 italic">* Vui lòng chọn chính xác cột "Đơn giá hộp" hoặc "Giá chiết khấu" cho mục Giá niêm yết/IDECO để hệ thống lấy đúng dữ liệu.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                            <h4 className="font-black text-slate-700 flex items-center gap-2 text-sm uppercase tracking-widest">
                                <Check className="w-5 h-5 text-emerald-500" /> BƯỚC 2: CHỌN SẢN PHẨM (Tối đa 4)
                            </h4>
                            <div className="relative w-full md:w-80">
                                <input type="text" placeholder="Tìm kiếm nhanh sản phẩm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none shadow-sm" />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            </div>
                        </div>

                        {/* TABLE WITH HORIZONTAL SCROLL - Enhanced Visuals */}
                        <div className="border border-slate-300 rounded-xl shadow-lg bg-white overflow-hidden flex flex-col">
                             <div className="overflow-x-auto w-full custom-scrollbar" style={{ maxHeight: '45vh' }}>
                                <table className="w-full text-sm text-left border-collapse min-w-max">
                                    <thead className="bg-slate-800 text-white font-bold sticky top-0 z-10 uppercase text-[10px] tracking-wide shadow-md">
                                        <tr>
                                            <th className="p-3 w-14 text-center border-r border-slate-700 sticky left-0 bg-slate-800 z-20">STT</th>
                                            <th className="p-3 w-14 text-center border-r border-slate-700 sticky left-14 bg-slate-800 z-20">CHỌN</th>
                                            {columns.map(col => (
                                                <th key={col} className={`p-3 border-r border-slate-700 whitespace-nowrap px-4 ${Object.values(mapping).includes(col) ? 'bg-emerald-800 text-emerald-100' : ''}`}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredData.length > 0 ? filteredData.map(({ row, originalIndex }) => (
                                            <tr 
                                                key={originalIndex} 
                                                className={`hover:bg-indigo-50 transition-colors cursor-pointer ${selectedIndices.has(originalIndex) ? 'bg-emerald-50/60' : ''}`} 
                                                onClick={() => toggleRowSelection(originalIndex)}
                                            >
                                                <td className="p-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100 sticky left-0 bg-white z-10 group-hover:bg-indigo-50">{originalIndex + 1}</td>
                                                <td className="p-3 text-center border-r border-slate-100 sticky left-14 bg-white z-10 group-hover:bg-indigo-50" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIndices.has(originalIndex)} 
                                                        onChange={() => toggleRowSelection(originalIndex)} 
                                                        className="w-5 h-5 rounded border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                                                    />
                                                </td>
                                                {columns.map(col => (
                                                    <td key={`${originalIndex}-${col}`} className={`p-3 border-r border-slate-100 whitespace-nowrap max-w-[300px] truncate px-4 ${col === mapping.name ? 'font-bold text-slate-900' : 'text-slate-600'} ${selectedIndices.has(originalIndex) ? 'bg-emerald-50/60' : ''}`}>
                                                        {String(row[col] ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={columns.length + 2} className="p-12 text-center text-slate-400 italic">Không tìm thấy dữ liệu.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Horizontal Scroll Tip - Always Visible */}
                            <div className="bg-slate-100 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 font-bold flex items-center justify-between">
                                <span className="flex items-center gap-2"><ArrowRight className="w-3 h-3 animate-bounce-x text-emerald-600" /> Kéo thanh trượt ngang để xem các cột bị ẩn</span>
                                <span>Tổng: {data.length} dòng</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                {selectedIndices.size > 0 && (
                    <>
                        <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-md animate-in slide-in-from-left">
                            <Check className="w-3.5 h-3.5" /> Đã chọn {selectedIndices.size}
                        </div>
                        <button 
                            onClick={() => setSelectedIndices(new Set())}
                            className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all text-xs font-bold border border-slate-200"
                            title="Bỏ chọn tất cả"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> LÀM MỚI
                        </button>
                    </>
                )}
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all border border-slate-200">ĐÓNG</button>
                {step === 2 && (
                    <button 
                        onClick={handleApply} 
                        disabled={selectedIndices.size === 0} 
                        className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:grayscale flex items-center gap-2 uppercase tracking-wide transition-all active:scale-95"
                    >
                        NHẬP DỮ LIỆU <Check className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite;
        }
      `}</style>
    </div>
  );
};
