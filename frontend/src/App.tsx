import { useState, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { fetchModels, type ModelInfo } from './services/api';
import './App.css';

function App() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    fetchModels().then(setModels).catch(console.error);
  }, []);

  // 默认选中第一个模型
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  return (
    <div className="app">
      <header className="header">
        <h1>AI Kit Demo</h1>
        <p>体验大模型 API 接入 · SSE 流式传输</p>
      </header>
      <main>
        <ChatWindow
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </main>
    </div>
  );
}

export default App;