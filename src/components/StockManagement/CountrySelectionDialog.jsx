import { Modal as AntModal } from 'antd';
import React from 'react';
import ReactCountryFlag from 'react-country-flag';

/**
 * Country Code Mapping
 */
const getCountryCode = (countryName) => {
  const codeMap = {
    'Saudi Arabia': 'SA',
    'UAE': 'AE',
    'United Arab Emirates': 'AE',
    'Bahrain': 'BH',
    'Kuwait': 'KW',
    'Oman': 'OM',
    'Qatar': 'QA',
    'Yemen': 'YE',
    'Lebanon': 'LB',
    'Iraq': 'IQ',
    'Jordan': 'JO',
    'Syria': 'SY',
    'Egypt': 'EG',
  };
  
  if (codeMap[countryName]) {
    return codeMap[countryName];
  }
  
  for (const [key, code] of Object.entries(codeMap)) {
    if (countryName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(countryName.toLowerCase())) {
      return code;
    }
  }
  
  return 'XX';
};

/**
 * Country Selection Dialog
 */
export const CountrySelectionDialog = ({ 
  isOpen, 
  onSelect, 
  onClose,
  countries = [] 
}) => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <AntModal
      open={isOpen}
      onCancel={handleBack}
      title="Select Country"
      footer={null}
      width={500}
      closable={true}
      maskClosable={false}
      className="country-selection-modal"
    >
      <div className="mb-4">
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium"
        >
          ← Back
        </button>
      </div>
      
      <div className="flex flex-col gap-2">
        {countries.map((country) => (
          <button
            key={country.id}
            type="button"
            onClick={() => onSelect?.(country.id)}
            className="group relative w-full p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all duration-150 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-gray-50 group-hover:bg-white flex items-center justify-center border border-gray-200 group-hover:border-blue-300 transition-colors">
                <ReactCountryFlag
                  countryCode={getCountryCode(country.name)}
                  svg
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '3px',
                  }}
                  title={country.name}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                  {country.name}
                </h3>
              </div>
            </div>
          </button>
        ))}
      </div>
    </AntModal>
  );
};

export default CountrySelectionDialog;
