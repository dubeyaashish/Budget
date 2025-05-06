// frontend/src/utils/excelExport.js
import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Output file name (without extension)
 * @param {Array} columns - Optional array of column definitions { header: 'Header Text', key: 'objectKey', width: 20 }
 */
export const exportToExcel = (data, fileName, columns = null) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('No data to export');
    return false;
  }

  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    let ws;
    
    if (columns) {
      // Create worksheet from array of objects with specific columns
      const wsData = [
        // Header row
        columns.map(col => col.header),
        // Data rows
        ...data.map(item => 
          columns.map(col => {
            // Handle nested properties with dot notation (e.g., 'user.name')
            if (col.key.includes('.')) {
              const keys = col.key.split('.');
              let value = item;
              for (const key of keys) {
                value = value?.[key];
                if (value === undefined) break;
              }
              return value ?? '';
            }
            return item[col.key] ?? '';
          })
        )
      ];
      
      ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths if provided
      if (columns.some(col => col.width)) {
        ws['!cols'] = columns.map(col => ({ wch: col.width || 10 }));
      }
    } else {
      // Create worksheet from array of objects using all properties
      ws = XLSX.utils.json_to_sheet(data);
      
      // Auto-size columns based on content
      const objectKeys = Object.keys(data[0] || {});
      ws['!cols'] = objectKeys.map(key => {
        const maxLength = Math.max(
          key.length,
          ...data.map(item => {
            const cellValue = item[key];
            return (cellValue !== null && cellValue !== undefined) 
              ? String(cellValue).length 
              : 0;
          })
        );
        
        return { wch: Math.min(maxLength + 2, 50) }; // Add padding, cap at 50
      });
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${fileName}.xlsx`, { 
      bookType: 'xlsx',
      // Enable UTF-8 encoding for Thai language support
      type: 'binary',
      bookSST: false,
      cellStyles: true
    });
    
    return true;
  } catch (error) {
    console.error('Error exporting Excel file:', error);
    return false;
  }
};