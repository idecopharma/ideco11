
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, ArrowRight, Table, Check, AlertCircle } from 'lucide-react';
import { ProductData } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: ProductData[]) => void;
}

type ExcelRow = Record<string, any>;

const MAPPING_FIELDS: { key: keyof ProductData; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Tên Thuốc', placeholder: 'Chọn cột tên thuốc...' },
  { key: 'dosage', label: 'Hàm Lượng', placeholder: 'Chọn cột hàm lượng...' },
  { key: 'usage', label: 'Công Dụng', placeholder: 'Chọn cột công dụng...' },
  { key: 'listPrice', label: 'Giá Niêm Yết', placeholder: 'Chọn cột giá...' },
  { key: 'idecoPrice', label: 'Giá IDECO', placeholder: 'Chọn cột giá khuyến mãi...' },
  { key: 'manufacturer', label: 'Nhà Sản Xuất', placeholder: 'Chọn cột NSX...' },
];

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Upload, 2: Map & Select
  const [data, setData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
          // Clean headers (trim whitespace)
          const cleanHeaders = headers.map(h => String(h).trim());
          setColumns(cleanHeaders);
          
          // Convert rest to objects
          const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, { header: cleanHeaders }); // Use clean headers
          setData(rows);
          
          // Auto-guess mapping
          const newMapping: Record<string, string> = {};
          cleanHeaders.forEach(col => {
             const lower = col.toLowerCase();
             if (lower.includes('tên thuốc')) newMapping['name'] = col;
             else if (lower.includes('hàm lượng') || lower.includes('nồng độ')) newMapping['dosage'] = col;
             else if (lower.includes('công dụng')) newMapping['usage'] = col;
             else if (lower.includes('đơn giá hộp') || lower.includes('giá niêm yết')) newMapping['listPrice'] = col;
             else if (lower.includes('giá mua 6') || lower.includes('ideco')) newMapping['idecoPrice'] = col;
             else if (lower.includes('đơn vị sx') || lower.includes('nhà sản xuất')) newMapping['manufacturer'] = col;
          });
          setMapping(newMapping);
          
          setStep(2);
        }
      } catch (error) {
        console.error("Error parsing excel", error);
        alert("Lỗi đọc file Excel. Vui lòng thử lại.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (field: string, column: string) => {
    setMapping(prev => ({ ...prev, [field]: column }));
  };

  const toggleRowSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const handleApply = () => {
    const selectedRows = data.filter((_, idx) => selectedIndices.has(idx));
    if (selectedRows.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm từ danh sách.");
      return;
    }
    
    // Map to ProductData
    const newProducts: ProductData[] = selectedRows.map((row, idx) => ({
      id: idx + 1, // Will be re-indexed by parent or just use this temporary
      name: row[mapping['name']] ? String(row[mapping['name']]) : '',
      dosage: row[mapping['dosage']] ? String(row[mapping['dosage']]) : '',
      usage: row[mapping['usage']] ? String(row[mapping['usage']]) : '',
      listPrice: row[mapping['listPrice']] ? formatPrice(row[mapping['listPrice']]) : '',
      idecoPrice: row[mapping['idecoPrice']] ? formatPrice(row[mapping['idecoPrice']]) : '',
      manufacturer: row[mapping['manufacturer']] ? String(row[mapping['manufacturer']]) : '',
      isETC: false, // Default
      description: '',
      aspectRatio: 'vertical'
    }));
    
    // Pass only up to 3 for now as app supports 3
    onImport(newProducts.slice(0, 3));
    onClose();
  };

  const formatPrice = (val: any) => {
    if (typeof val === 'number') return val.toLocaleString('vi-VN') + ' đ';
    return String(val);
  };
  
  const reset = () => {
      setStep(1);
      setData([]);
      setColumns([]);
      setFileName('');
      setMapping({});
      setSelectedIndices(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <Table className="w-5 h-5" />
                </div>
                Nhập Dữ Liệu Từ Excel
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
                    {/* Example format helper */}
                    <div className="mt-8 text-xs text-slate-400 text-center max-w-md">
                        <p className="font-semibold mb-1">Cấu trúc đề xuất:</p>
                        TT | Tên thuốc | Hàm lượng | Công dụng | Đơn giá | Nhà SX
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
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
                                        onChange={(e) => handleMappingChange(field.key as string, e.target.value)}
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

                    {/* Data Table */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 justify-between">
                             <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-indigo-500" /> 
                                Bước 2: Chọn sản phẩm (Tối đa 3)
                             </div>
                             <span className="text-xs font-normal text-slate-500">Đã chọn: {selectedIndices.size}</span>
                        </h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
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
                                        {data.map((row, idx) => (
                                            <tr 
                                                key={idx} 
                                                className={`hover:bg-indigo-50 cursor-pointer transition-colors ${selectedIndices.has(idx) ? 'bg-indigo-50' : ''}`}
                                                onClick={() => toggleRowSelection(idx)}
                                            >
                                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIndices.has(idx)}
                                                        onChange={() => toggleRowSelection(idx)}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                {columns.map(col => (
                                                    <td key={`${idx}-${col}`} className="p-3 whitespace-nowrap max-w-[200px] truncate">
                                                        {row[col]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
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
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Chọn File Khác
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
