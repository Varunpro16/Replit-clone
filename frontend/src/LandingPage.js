import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [selectedLang, setSelectedLang] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (selectedLang && projectName.trim()) {
      navigate('/main', { 
        state: { 
          language: selectedLang,
          projectName: projectName.trim(),
          isNew: isCreatingNew
        
        } 
      });
    } else {
      alert('Please select a language and enter a project name!');
    }
  };

  const handleLoadExisting = () => {
    if (selectedLang && projectName.trim()) {
      navigate('/main', { 
        state: { 
          language: selectedLang,
          projectName: projectName.trim(),
          isNew: false
        } 
      });
    } else {
      alert('Please select a language and enter a project name!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6">Choose a Language Template</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {['Python', 'React', 'C++'].map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLang(lang)}
            className={`px-6 py-3 rounded-xl text-white text-lg shadow-md ${
              selectedLang === lang ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Enter project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-lg min-w-64"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleCreate}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg"
        >
          Create New Project
        </button>
        <button
          onClick={handleLoadExisting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg"
        >
          Load Existing Project
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
