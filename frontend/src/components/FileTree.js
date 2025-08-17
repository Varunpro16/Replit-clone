import React, { useState, useEffect } from "react";
import {
  File,
  Folder,
  FolderOpen,
  Search,
  Plus
} from "lucide-react";
import axios from "axios";
import TechStackModal from './TechStackModal'; // Import the modal component

const FileTree = ({ userId, setSelectedFile, setFileContent, currentPath, language, projectName }) => {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [showTechModal, setShowTechModal] = useState(false);

  const fetchTree = async () => {
    try {
      console.log("project path: ",currentPath);
      
      const res = await axios.get(`http://localhost:5000/api/files`, {
        params: { projectPath: currentPath }
      });
      setTree(res.data);
    } catch (error) {
      console.error('Error fetching tree:', error);
    }
  };

  useEffect(() => {
    if (currentPath) {
      fetchTree();
    }
  }, [currentPath]);

  const handleClick = async (item) => {
    if (item.isFolder) {
      setExpanded((prev) => ({ ...prev, [item.path]: !prev[item.path] }));
    } else {
      setSelectedFile(item.path);
      try {
        const res = await axios.get("http://localhost:5000/api/file", {
          params: {
            projectPath: currentPath,
            filePath: item.path
          },
        });
        setFileContent(res.data);
      } catch (error) {
        console.error('Error fetching file:', error);
        setFileContent('');
      }
    }
  };

  const handleAddTechStack = async (selectedTechs) => {
    try {
      console.log("userid: ",userId);
      
      await axios.put("http://localhost:5000/api/addTechStack", {
        language: selectedTechs[0].name,
        projectName: projectName,
        userId: userId,
      });
      // You might want to refresh the project or show a success message
    } catch (error) {
      console.error('Error adding tech stack:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const renderTree = (items, parent = "") => {
    const depth = parent.split("/").filter(p => p).length;
    const filtered = items.filter(
      (i) =>
        i.path.startsWith(parent) &&
        i.path.replace(parent, "").split("/").filter(p => p).length === 1
    );

    return filtered.map((item) => (
      <div key={item.path}>
        <div
          className="tree-item"
          onClick={() => handleClick(item)}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          <div className="tree-item-content">
            {item.isFolder ? (
              expanded[item.path] ?
                <FolderOpen size={16} className="tree-icon" /> :
                <Folder size={16} className="tree-icon" />
            ) : (
              <File size={16} className="tree-icon" />
            )}
            <span className="tree-item-name">{item.path.split("/").pop()}</span>
          </div>
        </div>
        {item.isFolder && expanded[item.path] && renderTree(items, item.path + "/")}
      </div>
    ));
  };

  return (
    <>
      <div className="file-tree-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Search size={16} className="panel-icon" />
            <span>Explorer</span>
          </div>
          <div className="panel-actions">
            <button 
              className="panel-action-btn" 
              onClick={() => setShowTechModal(true)}
              title="Add Tech Stack"
            >
              Tech Stack
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="file-tree-content">
          {renderTree(tree)}
        </div>
      </div>

      <TechStackModal
        isOpen={showTechModal}
        onClose={() => setShowTechModal(false)}
        onAddStack={handleAddTechStack}
        language={language}
        projectName={projectName}
        userId={userId}
      />
    </>
  );
};

export default FileTree;
