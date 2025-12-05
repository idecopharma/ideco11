
import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, ArrowRight, Table, Check, AlertCircle, Search, RefreshCw, FileText } from 'lucide-react';
import { ProductData, ExcelMapping } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ProductData[], rawData: any[], mapping: ExcelMapping) => void;
  savedData?: any[];
  savedMapping?: ExcelMapping;
}

type ExcelRow = Record<string, any>;

const MAPPING_FIELDS: { key: keyof ExcelMapping; label: string }[] = [
  { key: 'name', label: 'Tên Thuốc' },
  { key: 'dosage', label: 'Hàm Lượng' },
  { key: 'usage', label: 'Công Dụng' },
  { key: 'listPrice', label: 'Giá Niêm Yết' },
  { key: 'idecoPrice', label: 'Giá IDECO' },
  { key: 'manufacturer', label: 'Nhà Sản Xuất' },
];

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImport, savedData = [], savedMapping }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Upload, 2: Map & Select
  const [data, setData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ExcelMapping>({
    name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: ''
  });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoLoaded, setIsAutoLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from saved data when opened
  useEffect(() => {
    if (isOpen) {
        if (savedData && savedData.length > 0) {
            setData(savedData);
            // Derive columns from the first row of saved data
            const cols = Object.keys(savedData[0]);
            setColumns(cols);
            
            if (savedMapping) {
                setMapping(savedMapping);
            }
            
            setStep(2);
            setIsAutoLoaded(true);
        } else {
            // No saved data, start at upload
            reset();
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
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const cleanHeaders = headers.map(h => String(h).trim());
          setColumns(cleanHeaders);
          
          const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, { header: cleanHeaders });
          setData(rows);
          
          // Auto-guess mapping
          const newMapping: ExcelMapping = { name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '' };
          cleanHeaders.forEach(col => {
             const lower = col.toLowerCase();
             if (lower.includes('tên thuốc')) newMapping.name = col;
             else if (lower.includes('hàm lượng') || lower.includes('nồng độ')) newMapping.dosage = col;
             else if (lower.includes('công dụng')) newMapping.usage = col;
             else if (lower.includes('đơn giá hộp') || lower.includes('giá niêm yết')) newMapping.listPrice = col;
             else if (lower.includes('giá mua 6') || lower.includes('ideco')) newMapping.idecoPrice = col;
             else if (lower.includes('đơn vị sx') || lower.includes('nhà sản xuất')) newMapping.manufacturer = col;
          });
          setMapping(newMapping);
          
          setStep(2);
          setIsAutoLoaded(false);
        }
      } catch (error) {
        console.error("Error parsing excel", error);
        alert("Lỗi đọc file Excel. Vui lòng thử lại.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (field: keyof ExcelMapping, column: string) => {
    setMapping(prev => ({ ...prev, [field]: column }));
  };

  const toggleRowSelection = (originalIndex: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(originalIndex)) newSet.delete(originalIndex);
    else newSet.add(originalIndex);
    setSelectedIndices(newSet);
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data.map((row, idx) => ({ row, originalIndex: idx }));
    const lowerQuery = searchQuery.toLowerCase();
    const searchCol = mapping.name || columns[0]; // Search in mapped Name col or first col
    return data
        .map((row, idx) => ({ row, originalIndex: idx }))
        .filter(({ row }) => {
            const val = row[searchCol];
            return val && String(val).toLowerCase().includes(lowerQuery);
        });
  }, [data, searchQuery, mapping.name, columns]);

  const handleApply = () => {
    const selectedRows = data.filter((_, idx) => selectedIndices.has(idx));
    if (selectedRows.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm từ danh sách.");
      return;
    }
    
    const formatPrice = (val: any) => {
        if (typeof val === 'number') return val.toLocaleString('vi-VN') + ' đ';
        return String(val);
    };

    const newProducts: ProductData[] = selectedRows.map((row, idx) => ({
      id: idx + 1,
      name: row[mapping.name] ? String(row[mapping.name]) : '',
      dosage: row[mapping.dosage] ? String(row[mapping.dosage]) : '',
      usage: row[mapping.usage] ? String(row[mapping.usage]) : '',
      listPrice: row[mapping.listPrice] ? formatPrice(row[mapping.listPrice]) : '',
      idecoPrice: row[mapping.idecoPrice] ? formatPrice(row[mapping.idecoPrice]) : '',
      manufacturer: row[mapping.manufacturer] ? String(row[mapping.manufacturer]) : '',
      isETC: false,
      description: '',
      aspectRatio: 'vertical'
    }));
    
    // Pass processed products AND raw data + mapping for future use
    onImport(newProducts.slice(0, 3), data, mapping);
    onClose();
  };
  
  const reset = () => {
      setStep(1);
      setData([]);
      setColumns([]);
      setMapping({ name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '' });
      setSelectedIndices(new Set());
      setSearchQuery('');
      setIsAutoLoaded(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <Table className="w-5 h-5" />
                </div>
                {step === 1 ? 'Nhập Dữ Liệu Từ Excel' : 'Chọn Sản Phẩm'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {step === 1 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                    <Upload className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">Click để tải file Excel (.xlsx, .xls)</p>
                    <p className="text-sm text-slate-400 mt-2">Hỗ trợ bảng mã Unicode (UTF-8)</p>
                    <div className="mt-8 text-xs text-slate-400 text-center max-w-md">
                        <p className="font-semibold mb-1">Cấu trúc đề xuất:</p>
                        TT | Tên thuốc | Hàm lượng | Công dụng | Đơn giá | Nhà SX
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Auto-load Banner */}
                    {isAutoLoaded && (
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center text-sm text-blue-700">
                            <span className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Đã tự động tải danh sách từ lần nhập trước.
                            </span>
                            <button 
                                onClick={reset}
                                className="text-blue-600 hover:text-blue-800 font-semibold underline"
                            >
                                Nhập file khác
                            </button>
                        </div>
                    )}

                    {/* Mapping Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                             <ArrowRight className="w-4 h-4 text-indigo-500" /> 
                             Bước 1: So chiếu cột dữ liệu
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {MAPPING_FIELDS.map(field => (
                                <div key={field.key}>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">{field.label}</label>
                                    <select 
                                        className="w-full text-sm border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={mapping[field.key] || ''}
                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                    >
                                        <option value="">-- Không chọn --</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data Table with Search */}
                    <div className="space-y-3">
                        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-3">
                            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-indigo-500" /> 
                                    Bước 2: Chọn sản phẩm (Tối đa 3)
                                </div>
                                <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Đã chọn: {selectedIndices.size}</span>
                            </h4>
                            
                            {/* Search Input */}
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Tìm tên thuốc..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 w-10 text-center">
                                                <input type="checkbox" disabled />
                                            </th>
                                            {columns.map(col => (
                                                <th key={col} className="p-3 whitespace-nowrap">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredData.length > 0 ? (
                                            filteredData.map(({ row, originalIndex }) => (
                                                <tr 
                                                    key={originalIndex} 
                                                    className={`hover:bg-indigo-50 cursor-pointer transition-colors ${selectedIndices.has(originalIndex) ? 'bg-indigo-50' : ''}`}
                                                    onClick={() => toggleRowSelection(originalIndex)}
                                                >
                                                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedIndices.has(originalIndex)}
                                                            onChange={() => toggleRowSelection(originalIndex)}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    {columns.map(col => (
                                                        <td key={`${originalIndex}-${col}`} className="p-3 whitespace-nowrap max-w-[200px] truncate">
                                                            {row[col]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                                                    Không tìm thấy kết quả phù hợp.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         {selectedIndices.size > 3 && (
                            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Lưu ý: Chỉ 3 sản phẩm đầu tiên được chọn sẽ được nhập vào form.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
             {step === 2 && (
                <button 
                    onClick={reset}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Nhập File Khác
                </button>
             )}
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
                Hủy Bỏ
            </button>
            {step === 2 && (
                <button 
                    onClick={handleApply}
                    disabled={selectedIndices.size === 0}
                    className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Check className="w-4 h-4" />
                    Nhập Dữ Liệu
                </button>
            )}
        </div>

      </div>
    </div>
  );
};
