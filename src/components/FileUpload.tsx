import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onSuccess: (data: any[]) => void; // Renamed from onFileUpload
  onError: (message: string) => void; // New prop for error messages
  currentError: string | null; // Prop to display the current error
}

export const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, onError, currentError }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    onError(null); // Clear any previous errors before processing
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array of nodes');
      }
      
      // Validate structure
      for (const node of data) {
        if (!node.nodeId || !node.description || !node.shortDescription || !Array.isArray(node.nextNodes)) {
          throw new Error('Invalid node structure. Each node must have nodeId, description, shortDescription, and nextNodes array');
        }
      }
      
      onSuccess(data); // Call onSuccess with valid data
    } catch (err: any) {
      console.error('File processing error:', err);
      onError(err.message || 'Failed to process file. Please check the JSON format.'); // Report error message
    } finally {
      setIsProcessing(false);
    }
  }, [onSuccess, onError]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      processFile(jsonFile);
    } else {
      onError('Please drop a valid JSON file.');
    }
  }, [processFile, onError]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".json,application/json"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Processing JSON file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-blue-100 rounded-full">
              {isDragOver ? (
                <FileText className="w-8 h-8 text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload JSON Graph Data
              </h3>
              <p className="text-gray-600">
                {isDragOver ? 'Drop your JSON file here' : 'Drag and drop your JSON file here, or click to select'}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Supports JSON files with node graph data
            </div>
          </div>
        )}
      </div>
      
      {currentError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
            <p className="text-sm text-red-600 mt-1">{currentError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
