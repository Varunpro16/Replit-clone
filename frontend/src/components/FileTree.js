import React, { useState, useEffect } from "react";
import { 
  File, 
  Folder, 
  FolderOpen, 
  Play, 
  Square, 
  Monitor, 
  Code, 
  Settings,
  GitBranch,
  Search,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  ExternalLink,
  Globe
} from "lucide-react";
import axios from "axios";

const FileTree = ({ setSelectedFile, setFileContent, currentPath, language, projectName }) => {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});

  
  const fetchTree = async () => {
    try {
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
    <div className="file-tree-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Search size={16} className="panel-icon" />
          <span>Explorer</span>
        </div>
        <div className="panel-actions">
          <button className="panel-action-btn">
            <RefreshCw size={14} />
          </button>
          <button className="panel-action-btn">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      <div className="file-tree-content">
        {renderTree(tree)}
      </div>
    </div>
  );
};
export default FileTree;







// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import "../css/FileTree.css";

// const FileTree = ({ setSelectedFile, setFileContent, currentPath, language, projectName }) => {
//   const [tree, setTree] = useState([]);
//   const [expanded, setExpanded] = useState({});

//   useEffect(() => {
//     if (currentPath) {
//       fetchTree();
//     }
//   }, [currentPath]);

  // const fetchTree = async () => {
  //   try {
  //     const res = await axios.get(`http://localhost:5000/api/files`, {
  //       params: { projectPath: currentPath }
  //     });
  //     setTree(res.data);
  //   } catch (error) {
  //     console.error('Error fetching tree:', error);
  //   }
  // };

  // const handleClick = async (item) => {
  //   if (item.isFolder) {
  //     setExpanded((prev) => ({ ...prev, [item.path]: !prev[item.path] }));
  //   } else {
  //     setSelectedFile(item.path);
  //     try {
  //       const res = await axios.get("http://localhost:5000/api/file", {
  //         params: { 
  //           projectPath: currentPath,
  //           filePath: item.path 
  //         },
  //       });
  //       setFileContent(res.data);
  //     } catch (error) {
  //       console.error('Error fetching file:', error);
  //       setFileContent('');
  //     }
  //   }
  // };

//   const renderTree = (items, parent = "") => {
//     const depth = parent.split("/").filter(p => p).length;
//     const filtered = items.filter(
//       (i) =>
//         i.path.startsWith(parent) &&
//         i.path.replace(parent, "").split("/").filter(p => p).length === 1
//     );

//     return filtered.map((item) => (
//       <div key={item.path}>
//         <div
//           className={`tree-item ${item.isFolder ? "folder" : "file"}`}
//           onClick={() => handleClick(item)}
//           style={{ paddingLeft: `${depth * 12}px` }}
//         >
//           {item.isFolder ? (expanded[item.path] ? "📂" : "📁") : "📄"} 
//           {item.path.split("/").pop()}
//         </div>
//         {item.isFolder && expanded[item.path] && renderTree(items, item.path + "/")}
//       </div>
//     ));
//   };

//   return (
//     <div className="file-tree">
//       <div className="tree-header" style={{ padding: "10px", fontWeight: "bold" }}>
//         Project Files
//       </div>
//       {renderTree(tree)}
//     </div>
//   );
// };

// export default FileTree;