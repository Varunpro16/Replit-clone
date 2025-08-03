import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  File,
  Maximize2,
  Minimize2,
  Save
} from "lucide-react";

const CodeEditor = ({ selectedFile, fileContent, setFileContent, currentPath,onFileSave }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Update content when a new file is selected
  useEffect(() => {
    if (fileContent !== undefined && fileContent !== null) {
      setContent(fileContent);
      setHasUnsavedChanges(false);
      setLastSaved(null);
    } else if (selectedFile) {
      setContent('');
    }
  }, [selectedFile, fileContent]);

  // Manual save function only
  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('Current state:', {
      selectedFile,
      currentPath,
      contentLength: content.length,
      hasUnsavedChanges
    });

    if (!selectedFile) {
      alert('No file selected');
      return;
    }

    if (!currentPath) {
      alert('No project path provided');
      return;
    }

 

    try {
      setIsSaving(true);
      console.log('Making API call...');

      const response = await axios.put('http://localhost:5000/api/file', {
        projectPath: currentPath,
        filePath: selectedFile,
        content: content
      });

      console.log('API Response:', response.data);
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      if (onFileSave) onFileSave();
      
    } catch (error) {
      console.error('Save error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        alert(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        alert('No response from server. Is your backend running on http://localhost:5000?');
      } else {
        console.error('Request setup error:', error.message);
        alert(`Request error: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    
    // Update parent component
    if (setFileContent) {
      setFileContent(newContent);
    }
  };

  const getFileExtension = (filename) => {
    return filename ? filename.split('.').pop().toLowerCase() : '';
  };

  const getFileName = (filePath) => {
    return filePath ? filePath.split('/').pop() : '';
  };

  return (
    <div className={`code-editor-panel ${isMaximized ? 'maximized' : ''}`}>
      <div className="panel-header">
        <div className="editor-title">
          {selectedFile ? (
            <div className="file-info">
              <File size={16} />
              <span className="file-name">{getFileName(selectedFile)}</span>
              {hasUnsavedChanges && <span className="unsaved-dot">•</span>}
            </div>
          ) : (
            <span className="no-file">No file selected</span>
          )}
        </div>
        
        <div className="panel-actions">
          {selectedFile && (
            <>
              <button
                className="panel-action-btn save-btn"
                onClick={handleSave}
                disabled={isSaving}
                title="Save file"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Status bar */}
      <div className="editor-status-bar">
        <div className="status-left">
          {selectedFile && (
            <>
              <span className="current-file">{selectedFile}</span>
              {hasUnsavedChanges && (
                <span className="unsaved-status">• Unsaved changes</span>
              )}
              {isSaving && (
                <span className="saving-status">💾 Saving...</span>
              )}
              {lastSaved && !hasUnsavedChanges && (
                <span className="saved-status">✓ Saved at {lastSaved}</span>
              )}
            </>
          )}
        </div>
        <div className="status-right">
          {selectedFile && (
            <span className="file-type">{getFileExtension(selectedFile).toUpperCase()}</span>
          )}
        </div>
      </div>

      <div className="editor-content">
        {selectedFile ? (
          <>
            <div className="line-numbers">
              {content.split('\n').map((_, i) => (
                <div key={i} className="line-number">{i + 1}</div>
              ))}
            </div>
            <textarea
              className="code-textarea"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
              placeholder="Start coding..."
              style={{
                fontFamily: 'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace'
              }}
            />
          </>
        ) : (
          <div className="empty-editor">
            <div className="empty-state">
              <File size={48} />
              <h3>No file selected</h3>
              <p>Select a file from the explorer to start editing</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .code-editor-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0d1117;
          border: 1px solid #21262d;
          border-radius: 6px;
          overflow: hidden;
        }

        .code-editor-panel.maximized {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          border-radius: 0;
        }

        .panel-header {
          height: 48px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
        }

        .editor-title {
          display: flex;
          align-items: center;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f0f6fc;
        }

        .file-name {
          font-weight: 500;
        }

        .unsaved-dot {
          color: #f85149;
          font-weight: bold;
          margin-left: 4px;
        }

        .no-file {
          color: #7d8590;
          font-style: italic;
        }

        .panel-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .panel-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #30363d;
          color: #f0f6fc;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .panel-action-btn:hover:not(:disabled) {
          background: #21262d;
          border-color: #58a6ff;
        }

        .save-btn {
          border-color: #3fb950;
          color: #3fb950;
        }

        .save-btn:hover:not(:disabled) {
          background: #238636;
          color: white;
        }

        .save-btn:disabled {
          color: #7d8590;
          border-color: #30363d;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .editor-status-bar {
          height: 24px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          font-size: 11px;
          color: #7d8590;
        }

        .status-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .current-file {
          color: #f0f6fc;
          font-weight: 500;
        }

        .unsaved-status {
          color: #f85149;
        }

        .saving-status {
          color: #58a6ff;
        }

        .saved-status {
          color: #3fb950;
        }

        .file-type {
          color: #7d8590;
          font-weight: 500;
        }

        .editor-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .line-numbers {
          background: #0d1117;
          border-right: 1px solid #21262d;
          padding: 8px 0;
          min-width: 50px;
          text-align: right;
          color: #7d8590;
          font-family: SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace;
          font-size: 12px;
          line-height: 1.45;
          user-select: none;
        }

        .line-number {
          padding: 0 8px;
          height: 17.4px;
        }

        .code-textarea {
          flex: 1;
          background: #0d1117;
          border: none;
          outline: none;
          color: #f0f6fc;
          padding: 8px 12px;
          font-size: 12px;
          line-height: 1.45;
          resize: none;
          white-space: pre;
          overflow-wrap: normal;
          overflow-x: auto;
        }

        .code-textarea::placeholder {
          color: #7d8590;
        }

        .empty-editor {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d1117;
        }

        .empty-state {
          text-align: center;
          color: #7d8590;
        }

        .empty-state svg {
          color: #30363d;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: #f0f6fc;
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default CodeEditor;

// // components/CodeEditor.js
// import React from "react";
// import Editor from "@monaco-editor/react";
// import axios from "axios";

// const CodeEditor = ({ selectedFile, fileContent, setFileContent, currentPath }) => {
//   const handleSave = async () => {
//     if (!selectedFile || !currentPath) return;
    
//     try {
//       await axios.put("http://localhost:5000/api/file", {
//         projectPath: currentPath,
//         filePath: selectedFile,
//         content: fileContent,
//       });
//       alert("File saved successfully!");
//     } catch (error) {
//       console.error('Error saving file:', error);
//       alert("Error saving file");
//     }
//   };

//   const getLanguageFromFile = (filename) => {
//     if (!filename) return "javascript";
    
//     const extension = filename.split('.').pop().toLowerCase();
//     const languageMap = {
//       'js': 'javascript',
//       'jsx': 'javascript',
//       'ts': 'typescript',
//       'tsx': 'typescript',
//       'py': 'python',
//       'cpp': 'cpp',
//       'c': 'c',
//       'h': 'c',
//       'html': 'html',
//       'css': 'css',
//       'json': 'json',
//       'md': 'markdown'
//     };
    
//     return languageMap[extension] || 'javascript';
//   };

//   return (
//     <div className="editor-container">
//       <div className="toolbar" style={{ 
//         padding: "10px", 
//         borderBottom: "1px solid #ccc",
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center"
//       }}>
//         <span>{selectedFile || "No file selected"}</span>
//         <button 
//           onClick={handleSave}
//           disabled={!selectedFile}
//           style={{
//             padding: "5px 15px",
//             backgroundColor: selectedFile ? "#007acc" : "#ccc",
//             color: "white",
//             border: "none",
//             borderRadius: "4px",
//             cursor: selectedFile ? "pointer" : "not-allowed"
//           }}
//         >
//           Save
//         </button>
//       </div>
//       <Editor
//         height="90vh"
//         language={getLanguageFromFile(selectedFile)}
//         theme="vs-dark"
//         value={fileContent}
//         onChange={(value) => setFileContent(value || "")}
//         options={{
//           minimap: { enabled: false },
//           fontSize: 14,
//           wordWrap: "on"
//         }}
//       />
//     </div>
//   );
// };

// export default CodeEditor;
