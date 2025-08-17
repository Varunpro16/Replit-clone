import React, { useState } from 'react';
import { 
  Globe, 
  Code, 
  Play, 
  ExternalLink, 
  RefreshCw 
} from "lucide-react";
// Enhanced Output component
const Output = ({ userId, projectName }) => {
  const [activeTab, setActiveTab] = useState('browser');
  const [refreshKey, setRefreshKey] = useState(0);
  const INSTANCE_URI = `http://${projectName}.192.168.49.2.nip.io/`;

  return (
    <div className="output-panel">
      <div className="panel-header">
        <div className="output-tabs">
          <button 
            className={`output-tab ${activeTab === 'browser' ? 'active' : ''}`}
            onClick={() => setActiveTab('browser')}
          >
            <Globe size={14} />
            Browser
          </button>
          <button 
            className={`output-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            <Code size={14} />
            Console
          </button>
        </div>
        <div className="panel-actions">
          <button className="run-button">
            <Play size={14} />
            Run
          </button>
          <button className="panel-action-btn">
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
      <div className="output-content">
        {activeTab === 'browser' ? (
          <div className="browser-preview">
            <div className="browser-bar">
              <div className="browser-controls">
                <div className="browser-dot red"></div>
                <div className="browser-dot yellow"></div>
                <div className="browser-dot green"></div>
              </div>
              <div className="browser-url">{INSTANCE_URI}</div>
              <button className="browser-refresh">
                  <RefreshCw size={14} onClick={() => setRefreshKey((prev) => !prev)}/>
              </button>
            </div>
            
            <iframe
              key={refreshKey} // ⬅️ this causes iframe to reload on key change
              className="preview-iframe"
              src={INSTANCE_URI}
              title="Preview"
            />
          </div>
        ) : (
          <div className="console-output">
            <div className="console-line">✓ Compiled successfully!</div>
            <div className="console-line">Local: http://localhost:3000</div>
            <div className="console-line">Network: {INSTANCE_URI}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Output;


