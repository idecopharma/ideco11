
import { AlertCircle, ArrowRight, Check, FileText, RefreshCw, Save, Search, Table, Upload, X, FilePlus } from 'lucide-react';
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with props when modal opens or saved data changes
  useEffect(() => {
    if (isOpen) {
        if (savedData && savedData.length > 0) {
            setData(savedData);
            const cols = Object.keys(savedData[0]);
            setColumns(cols);
            if (savedMapping) setMapping(savedMapping);
            setStep(2);
        } else {
            setStep(1);
        }
    }
  }, [isOpen, savedData, savedMapping]); 

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
        
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (rawRows.length === 0) return;

        const headerIndex = rawRows.findIndex(row => row && row.length > 0);
        if (headerIndex === -1) return;

        const headerRow = rawRows[headerIndex];
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
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws, { 
            header: uniqueHeaders,
            range: headerIndex + 1,
            defval: '' 
        });
        
        // Reset selections when new data loads
        setSelectedIndices(new Set());
        setData(jsonData);
        
        // Auto-mapping logic
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
        setSaveStatus('idle');
      } catch (error) {
        alert("Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const handleTriggerFileUpload = () => {
    if (data.length > 0) {
        if (confirm("Tải file mới sẽ thay thế danh sách hiện tại. Bạn có muốn tiếp tục?")) {
             fileInputRef.current?.click();
        }
    } else {
        fileInputRef.current?.click();
    }
  };

  const handleMappingChange = (field: keyof ExcelMapping, column: string) => {
    setMapping(prev => ({ ...prev, [field]: column }));
    setSaveStatus('idle');
  };

  const toggleRowSelection = (originalIndex: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(originalIndex)) newSet.delete(originalIndex);
    else {
        if (newSet.size >= 3) {
            alert("Bạn chỉ có thể chọn tối đa 3 sản phẩm.");
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

  const handleSaveConfig = () => {
    setSaveStatus('saving');
    onSave(data, mapping);
    setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, 400);
  };

  const handleApplyImport = () => {
    const selectedRows = data.filter((_, idx) => selectedIndices.has(idx));
    if (selectedRows.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm.");
      return;
    }
    
    const formatPrice = (priceVal: any, packVal: any) => {
        if (priceVal === undefined || priceVal === null || String(priceVal).trim() === '') return '';
        let p = '';
        if (typeof priceVal === 'number') { p = priceVal.toLocaleString('vi-VN'); } 
        else {
            const cleanNum = String(priceVal).replace(/[^0-9]/g, "");
            p = (cleanNum && !isNaN(parseInt(cleanNum))) ? parseInt(cleanNum).toLocaleString('vi-VN') : String(priceVal).trim();
        }
        if (p && !p.toLowerCase().includes('đồng') && /^[0-9.,]+$/.test(p.replace(/[^0-9.,]/g, ""))) p += ' đồng';
        return (packVal && String(packVal).trim()) ? `${p}/ ${String(packVal).trim()}` : p;
    };

    const newProducts: ProductData[] = selectedRows.map((row, idx) => ({
        id: idx + 1,
        name: String(row[mapping.name] || '').trim(),
        dosage: String(row[mapping.dosage] || '').trim(),
        usage: String(row[mapping.usage] || '').trim(),
        listPrice: formatPrice(row[mapping.listPrice], row[mapping.packaging]),
        idecoPrice: formatPrice(row[mapping.idecoPrice], row[mapping.packaging]),
        manufacturer: String(row[mapping.manufacturer] || '').trim(),
        isETC: false,
        description: '',
        aspectRatio: 'vertical'
    }));
    
    onSave(data, mapping);
    onImport(newProducts, data, mapping);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-300">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <Table className="w-6 h-6 text-emerald-600" />
                {step === 1 ? 'Nhập Dữ Liệu Excel' : 'Danh Mục Sản Phẩm Đã Lưu'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Hidden File Input - Placed here to ensure it exists in DOM regardless of step */}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {step === 1 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
                     onClick={() => fileInputRef.current?.click()}>
                    <div className="p-6 bg-white rounded-full shadow-lg mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="w-12 h-12 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-700">Tải Lên Bảng Giá Excel</p>
                    <p className="text-slate-500 mt-2 font-medium">Hỗ trợ định dạng .xlsx và .xls</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                        <div className="relative w-full md:w-96">
                            <input 
                                type="text" placeholder="Tìm tên sản phẩm trong bảng..." 
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                                className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none shadow-sm font-medium" 
                            />
                            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleSaveConfig} className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-black text-xs transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>
                                {saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saveStatus === 'saved' ? 'ĐÃ LƯU CẤU HÌNH' : 'LƯU MAPPING'}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleTriggerFileUpload(); }} 
                                className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-700 border-2 border-blue-100 rounded-xl font-black text-xs hover:bg-blue-100 transition-all shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4" /> TẢI FILE MỚI
                            </button>
                        </div>
                    </div>

                    {/* Mapping Settings */}
                    <div className="bg-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-100 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {MAPPING_FIELDS.map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter block truncate">{field.label}</label>
                                <select 
                                    className="w-full text-xs font-bold border-2 border-indigo-100 rounded-lg p-2 bg-white focus:border-indigo-500 outline-none" 
                                    value={mapping[field.key] || ''} 
                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                >
                                    <option value="">-- Bỏ qua --</option>
                                    {columns.map(col => (<option key={col} value={col}>{col}</option>))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Table View */}
                    <div className="border-2 border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden flex flex-col">
                         <div className="overflow-x-auto w-full custom-scrollbar" style={{ maxHeight: '40vh' }}>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-800 text-white font-bold sticky top-0 z-10 uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="p-4 w-16 text-center border-r border-slate-700">Chọn</th>
                                        {columns.map(col => (
                                            <th key={col} className={`p-4 border-r border-slate-700 whitespace-nowrap ${Object.values(mapping).includes(col) ? 'bg-emerald-700' : ''}`}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.map(({ row, originalIndex }) => (
                                        <tr 
                                            key={originalIndex} 
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIndices.has(originalIndex) ? 'bg-emerald-50/80' : ''}`} 
                                            onClick={() => toggleRowSelection(originalIndex)}
                                        >
                                            <td className="p-4 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIndices.has(originalIndex)} 
                                                    onChange={() => toggleRowSelection(originalIndex)} 
                                                    className="w-5 h-5 rounded border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                                                />
                                            </td>
                                            {columns.map(col => (
                                                <td key={`${originalIndex}-${col}`} className={`p-4 border-r border-slate-100 whitespace-nowrap max-w-[300px] truncate ${col === mapping.name ? 'font-black text-slate-900' : 'text-slate-600'}`}>
                                                    {String(row[col] ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-xs font-bold text-slate-500 flex justify-between items-center">
                            <span>TỔNG DỮ LIỆU: {data.length} DÒNG</span>
                            <span className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-emerald-600" /> KÉO NGANG ĐỂ XEM CÁC CỘT</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="px-6 py-5 border-t border-slate-200 bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
                {selectedIndices.size > 0 && (
                    <div className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-black shadow-lg animate-in slide-in-from-left">
                        <Check className="w-4 h-4" /> ĐÃ CHỌN {selectedIndices.size}/3 SẢN PHẨM
                    </div>
                )}
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-2 border-slate-100 transition-all">ĐÓNG</button>
                {step === 2 && (
                    <button 
                        onClick={handleApplyImport} 
                        disabled={selectedIndices.size === 0} 
                        className="px-10 py-3 text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 flex items-center gap-2 uppercase"
                    >
                        NHẬP DỮ LIỆU NGAY <ArrowRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
